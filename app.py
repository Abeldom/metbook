# app.py - the heart of our Metbook application.
#
# Flask is a "web framework": a library that listens for requests from a
# browser (like "give me the page at /") and lets us decide what to send back.

from flask import Flask, render_template, request, redirect, url_for, send_from_directory
from database import (init_database, add_contact, get_all_contacts, delete_contact,
                      get_contact_by_id, update_contact, add_meeting, get_meetings,
                      update_meeting, delete_meeting, simplify,
                      get_all_labels, set_contact_labels,
                      add_meeting_photos, delete_meeting_photos, set_meeting_labels)
import os
from datetime import datetime
from werkzeug.utils import secure_filename

# Create the application object. __name__ tells Flask where this file lives,
# so it can later find our HTML templates and CSS files next to it.
app = Flask(__name__)

# Configuration for file uploads
UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
IMAGE_ERROR = "Only PNG, JPG, GIF or WebP pictures can be used."

# The most one form may send at once (all its files together). Phone photos
# are often 3-8 MB each, so this leaves room for several.
MAX_UPLOAD_MB = 50
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_MB * 1024 * 1024

# Create uploads folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize the database when the app starts
init_database()


def allowed_file(filename):
    """Check if the file extension is allowed (images only)"""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def save_upload_file(file):
    """
    Save an uploaded file safely.

    Args:
        file: The file object from the form

    Returns:
        str: The filename (for storing in database), or None if invalid
    """
    if not file or file.filename == "":
        return None

    if not allowed_file(file.filename):
        return None

    # secure_filename removes dangerous characters from the filename
    filename = secure_filename(file.filename)
    # Add timestamp to make filenames unique
    import uuid
    unique_filename = f"{uuid.uuid4()}_{filename}"

    filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
    file.save(filepath)

    return unique_filename


def delete_upload_file(filename):
    """Remove a picture from the uploads folder, if it's there."""
    # basename() keeps only the file's name, so this can never reach
    # a file outside the uploads folder
    filepath = os.path.join(UPLOAD_FOLDER, os.path.basename(filename))
    if os.path.exists(filepath):
        os.remove(filepath)


def chosen_files(field_name):
    """
    The files chosen in a file input that allows several (multiple).
    getlist() gives all of them; we skip the empty one a browser sends
    when nothing was chosen.
    """
    return [file for file in request.files.getlist(field_name) if file and file.filename]


# Flask calls this when a form sends more than MAX_UPLOAD_MB (error 413,
# "Content Too Large") instead of showing its plain error page
@app.errorhandler(413)
def upload_too_large(error):
    return render_template("too_large.html", max_mb=MAX_UPLOAD_MB), 413


# The date shapes we accept, keyed by their length:
# "2026" (a year), "2026-09" (a month) or "2026-09-22" (a day)
DATE_FORMATS = {4: "%Y", 7: "%Y-%m", 10: "%Y-%m-%d"}
DATE_ERROR = "Enter the date like 2026, 2026-09 or 2026-09-22."


def parse_date(text):
    """
    Turn "2026", "2026-09" or "2026-09-22" into a datetime object.
    Returns None if the text isn't one of those shapes or isn't a real date
    (like 2026-02-30). We are strict on purpose: meetings are sorted as text,
    which only works when months and days always have two digits.
    """
    date_format = DATE_FORMATS.get(len(text))
    if not date_format:
        return None
    try:
        return datetime.strptime(text, date_format)
    except ValueError:
        return None


# A "template filter" can be used inside HTML templates with a | (pipe):
#   {{ meeting.date|nice_date }}   turns "2026-09-22" into "22 Sep 2026"
@app.template_filter("nice_date")
def nice_date(text):
    parsed = parse_date(text or "")
    if not parsed:
        return text  # not a date we understand: show it exactly as typed
    if len(text) == 10:
        return f"{parsed.day} {parsed:%b %Y}"   # 22 Sep 2026
    if len(text) == 7:
        return f"{parsed:%b %Y}"                # Sep 2026
    return text                                 # 2026


# Make database.simplify() usable in templates too: {{ "Mátyás"|simplify }} -> matyas
app.add_template_filter(simplify)


# How many people the People page shows at first, and how many more
# each click on "Show more" adds
PAGE_SIZE = 50

# The parts of a People card that the "Show:" switches can turn on and off:
# {code name: what the switch says}. Shown when nothing was chosen yet: labels and notes.
CARD_PARTS = {"labels": "Labels", "notes": "Notes", "firstmet": "First met"}
DEFAULT_CARD_PARTS = {"labels", "notes"}

# The places the search box can look in: {code name: what the switch says}.
# "events" = the notes and labels of the meetings. All are on until you choose otherwise.
SEARCH_SCOPES = {"name": "Names", "notes": "Notes", "events": "Events", "labels": "Labels"}


# Each label always gets the same color: its id picks one from this list.
# % is "remainder": 7 % 3 = 1, so label 7 gets the color at position 1.
LABEL_COLORS = ["tag-accent", "tag-accent-2", "tag-neutral"]


@app.template_filter("label_color")
def label_color(label_id):
    return LABEL_COLORS[label_id % len(LABEL_COLORS)]


def parse_label_names(text):
    """
    Split the "new labels" text at the commas:
    "family, work,, Family " -> ["family", "work"]  (no empty ones, no repeats)
    """
    names = []
    seen = set()
    for part in text.split(","):
        name = " ".join(part.split())   # trims the ends and squeezes double spaces
        if name and name.casefold() not in seen:
            names.append(name)
            seen.add(name.casefold())
    return names


def ticked_label_ids():
    """The ids of the label checkboxes that were ticked in the sent form."""
    # getlist: all the values sent under the same name ("labels"), as text
    return [int(value) for value in request.form.getlist("labels") if value.isdigit()]


def label_form_data(current_ids=()):
    """
    What the label picker on the add/edit forms needs: every label, and
    which ones are ticked. After a failed save we keep what was ticked;
    otherwise we start from current_ids.
    """
    ticked = ticked_label_ids() if request.method == "POST" else list(current_ids)
    return {"all_labels": get_all_labels(), "ticked_label_ids": ticked}


# A "route" connects a URL to a Python function.
# When a browser visits http://localhost:5000/ Flask calls home() and sends
# whatever it returns back to the browser.

# render_template() loads an HTML file from the templates/ folder,
# processes it (handles {% %} template tags), and sends it to the browser.
@app.route("/")
def home():
    return render_template("home.html")


@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/people")
def people():
    # Get sort parameter from URL (e.g., /people?sort=firstmet or /people?sort=name)
    sort_by = request.args.get("sort", "name")  # default to name
    if sort_by not in ("name", "firstmet"):     # e.g. an old ?sort=date link
        sort_by = "name"

    # Search box text, e.g. /people?q=anna ("" when nothing was searched)
    search = request.args.get("q", "").strip()

    # Label filter: one or more labels, e.g. /people?label=3&label=5.
    # getlist() gives every "label" value from the address; type=int turns
    # them into numbers (and skips anything that isn't one). We only keep
    # labels that really exist.
    all_labels = get_all_labels()
    wanted_labels = request.args.getlist("label", type=int)
    current_labels = [label for label in all_labels if label["id"] in wanted_labels]
    label_ids = [label["id"] for label in current_labels]
    # ?match=all: people with ALL the chosen labels. Otherwise: with ANY of them.
    match = "all" if request.args.get("match") == "all" else "any"

    # Where to search: ?in=name&in=notes (what the form sends without JavaScript), or the
    # choice saved in the "search_in" cookie ("name.notes", written by people-search.js),
    # or everywhere. & keeps only places we know.
    wanted_scopes = set(request.args.getlist("in")) & set(SEARCH_SCOPES)
    if not wanted_scopes:
        saved_scopes = request.cookies.get("search_in", "")
        wanted_scopes = set(saved_scopes.split(".")) & set(SEARCH_SCOPES)
    search_scopes = wanted_scopes or set(SEARCH_SCOPES)

    # The label filter leaves out the other contacts completely.
    # The search only HIDES cards: that way, while you type,
    # static/js/people-search.js can show and hide them instantly.
    contacts = get_all_contacts(sort_by=sort_by, label_ids=label_ids, match=match)

    # When the page is opened with ?q=..., the server decides who to hide at
    # first. {...} with "for" makes a "set": a bag of ids, quick to check.
    matching_ids = None
    if search:
        matches = get_all_contacts(sort_by=sort_by, search=search, label_ids=label_ids, match=match,
                                   scopes=search_scopes)
        matching_ids = {c["id"] for c in matches}

    # Only the first PAGE_SIZE matching cards are shown; "Show more" adds
    # PAGE_SIZE more each time (?limit=100, ?limit=150, ...).
    # "or PAGE_SIZE" = use 50 if ?limit is missing or not a number;
    # max(...) = never fewer than 50.
    limit = max(request.args.get("limit", type=int) or PAGE_SIZE, PAGE_SIZE)
    match_number = 0
    for contact in contacts:
        matches = matching_ids is None or contact["id"] in matching_ids
        if matches:
            match_number += 1
        contact["visible"] = matches and match_number <= limit
    # How many matching people are still hidden behind "Show more"
    remaining = max(match_number - limit, 0)

    # Which parts of the cards to show (the "Show:" switches). The choice is
    # kept in a cookie: a small piece of text the browser stores for this site
    # and sends back with every request. static/js/people-view.js writes it.
    # None = never chosen yet, so we use the default.
    # Two cookies:
    #  - "people_view": Labels and First met, kept for a year.
    #  - "people_notes_now": Notes only. A "session cookie": it lasts until the browser is
    #    closed. So Notes start ticked again on every new visit, and can be changed from there.
    saved_view = request.cookies.get("people_view")
    if saved_view is None:
        saved_parts = DEFAULT_CARD_PARTS - {"notes"}
    else:
        # "labels.firstmet" -> {"labels", "firstmet"}; & keeps only names we know.
        # - {"notes"}: an older cookie may still say "notes"; that is ignored.
        saved_parts = (set(saved_view.split(".")) & set(CARD_PARTS)) - {"notes"}
    if request.cookies.get("people_notes_now") != "0":   # "0" = you switched Notes off this visit
        saved_parts = saved_parts | {"notes"}

    # Sorted by "first met"? Then the dates are always shown, so you can see
    # why the cards are in this order. | joins two sets: saved_parts + firstmet.
    # (Only for this page: the saved choice itself doesn't change.)
    forced_parts = {"firstmet"} if sort_by == "firstmet" else set()
    shown_parts = saved_parts | forced_parts

    return render_template("people.html", contacts=contacts, current_sort=sort_by,
                           search=search, matching_ids=matching_ids,
                           all_labels=all_labels, current_labels=current_labels,
                           label_ids=label_ids, match=match,
                           card_parts=CARD_PARTS, shown_parts=shown_parts,
                           saved_parts=saved_parts, forced_parts=forced_parts,
                           search_scope_options=SEARCH_SCOPES, search_scopes=search_scopes,
                           limit=limit, page_size=PAGE_SIZE, remaining=remaining)


@app.route("/add-contact", methods=["GET", "POST"])
def add_contact_page():
    """
    GET: show the form to add a contact
    POST: process the form and save the contact to the database
    """
    if request.method == "POST":
        # Get form data from the user's submission
        name = request.form.get("name", "").strip()
        notes = request.form.get("notes", "").strip()
        date_met = request.form.get("date_met", "").strip()

        # **label_form_data() unpacks its dictionary into extra arguments
        # (all_labels=..., ticked_label_ids=...) for the label picker.

        # Validate: name is required
        if not name:
            return render_template("add_contact.html", error="Name is required!",
                                   **label_form_data())

        # Validate: the date is optional, but if given it must look right
        if date_met and not parse_date(date_met):
            return render_template("add_contact.html", error=DATE_ERROR,
                                   **label_form_data())

        # Handle picture upload (optional)
        picture_filename = None
        if "picture" in request.files:
            picture_file = request.files["picture"]
            picture_filename = save_upload_file(picture_file)

            # If user selected a file but it wasn't valid, show error
            if picture_file.filename and not picture_filename:
                return render_template("add_contact.html",
                    error=IMAGE_ERROR,
                    **label_form_data())

        # Add to database (with or without picture)
        contact_id = add_contact(name, notes, picture_filename)

        # The "date first met" becomes the first meeting on their timeline
        if date_met:
            add_meeting(contact_id, date_met)

        # The ticked labels, plus any new ones typed in
        set_contact_labels(contact_id, ticked_label_ids(),
                           parse_label_names(request.form.get("new_labels", "")))

        # Redirect to people page (success!)
        return redirect(url_for("people"))

    # GET request: show the form.
    # Coming from a filtered People page (?label=3&label=5)? Then those labels are ticked already.
    return render_template("add_contact.html",
                           **label_form_data(request.args.getlist("label", type=int)))


@app.route("/delete-contact/<int:contact_id>", methods=["POST"])
def delete_contact_page(contact_id):
    """
    Delete a contact (POST only, for safety)
    Then redirect back to the people page
    """
    contact = get_contact_by_id(contact_id)
    photo_files = delete_contact(contact_id)

    # Their picture and meeting photos aren't needed anymore either
    if contact and contact["picture_path"]:
        delete_upload_file(contact["picture_path"])
    for filename in photo_files:
        delete_upload_file(filename)

    return redirect(url_for("people"))


@app.route("/contact/<int:contact_id>/edit", methods=["GET", "POST"])
def edit_contact_page(contact_id):
    """
    GET: show the form, filled in with the contact's current data
    POST: save the changes
    """
    contact = get_contact_by_id(contact_id)
    if not contact:
        return redirect(url_for("people"))

    if request.method == "POST":
        name = request.form.get("name", "").strip()
        notes = request.form.get("notes", "").strip()

        if not name:
            return render_template("edit_contact.html", contact=contact, error="Name is required!",
                                   **label_form_data())

        # Picture: keep the current one, unless a new one was chosen
        # or "Remove this picture" was ticked
        old_picture = contact["picture_path"]
        picture_path = old_picture

        picture_file = request.files.get("picture")
        if picture_file and picture_file.filename:
            picture_path = save_upload_file(picture_file)
            if not picture_path:
                return render_template("edit_contact.html", contact=contact,
                    error=IMAGE_ERROR,
                    **label_form_data())
        elif request.form.get("remove_picture"):
            picture_path = None

        update_contact(contact_id, name, notes, picture_path)
        set_contact_labels(contact_id, ticked_label_ids(),
                           parse_label_names(request.form.get("new_labels", "")))

        # If the picture changed, the old file isn't used anymore: delete it
        if old_picture and old_picture != picture_path:
            delete_upload_file(old_picture)

        return redirect(url_for("view_contact", contact_id=contact_id))

    # GET request: show the form, with the contact's current labels ticked
    current_label_ids = [label["id"] for label in contact["labels"]]
    return render_template("edit_contact.html", contact=contact,
                           **label_form_data(current_label_ids))


@app.route("/uploads/<filename>")
def get_upload(filename):
    """Serve uploaded files (pictures) from the uploads folder"""
    return send_from_directory(UPLOAD_FOLDER, filename)


def show_contact_page(contact, **extra):
    """
    Draw a contact's page: their meetings, plus every label (for the label
    pickers in the meeting forms). extra = anything else the page needs,
    like an error message.
    """
    return render_template("contact_detail.html", contact=contact,
                           meetings=get_meetings(contact["id"]),
                           all_labels=get_all_labels(), **extra)


@app.route("/contact/<int:contact_id>")
def view_contact(contact_id):
    """
    View details of a single contact
    """
    contact = get_contact_by_id(contact_id)

    if not contact:
        # Contact not found, redirect back to people page
        return redirect(url_for("people"))

    # ?edit_meeting=5 in the URL means "show meeting 5 as a form".
    # type=int turns the text "5" into the number 5 (or None if it's missing).
    editing_meeting_id = request.args.get("edit_meeting", type=int)

    return show_contact_page(contact, editing_meeting_id=editing_meeting_id)


@app.route("/contact/<int:contact_id>/meetings", methods=["POST"])
def add_meeting_page(contact_id):
    """
    Add a meeting to a contact's timeline (the form on the detail page).
    """
    contact = get_contact_by_id(contact_id)
    if not contact:
        return redirect(url_for("people"))

    date = request.form.get("date", "").strip()
    notes = request.form.get("notes", "").strip()
    photos = chosen_files("photos")

    # Check everything BEFORE saving anything, so a mistake never leaves
    # half a meeting behind
    error = None
    if not parse_date(date):
        error = DATE_ERROR
    elif not all(allowed_file(photo.filename) for photo in photos):
        error = IMAGE_ERROR + " Choose the photos again."

    if error:
        # Show the same page again, with the error and what the user typed
        return show_contact_page(contact, error=error)

    meeting_id = add_meeting(contact_id, date, notes)
    add_meeting_photos(meeting_id, [save_upload_file(photo) for photo in photos])
    set_meeting_labels(meeting_id, ticked_label_ids(),
                       parse_label_names(request.form.get("new_labels", "")))

    # Redirect after saving ("Post/Redirect/Get"): if you refresh the page
    # afterwards, the browser won't send the form (and add the meeting) twice.
    return redirect(url_for("view_contact", contact_id=contact_id,
                            _anchor=f"meeting-{meeting_id}"))


@app.route("/contact/<int:contact_id>/meetings/<int:meeting_id>/delete", methods=["POST"])
def delete_meeting_page(contact_id, meeting_id):
    """
    Delete one meeting (and its photo files), then go back to the contact's page
    """
    for filename in delete_meeting(meeting_id, contact_id):
        delete_upload_file(filename)
    return redirect(url_for("view_contact", contact_id=contact_id))


@app.route("/contact/<int:contact_id>/meetings/<int:meeting_id>/edit", methods=["POST"])
def edit_meeting_page(contact_id, meeting_id):
    """
    Save changes to one meeting (the pencil form on the timeline)
    """
    contact = get_contact_by_id(contact_id)
    if not contact:
        return redirect(url_for("people"))

    date = request.form.get("date", "").strip()
    notes = request.form.get("notes", "").strip()
    new_photos = chosen_files("photos")
    # The ids of the photos whose "Remove" box was ticked
    remove_ids = [int(value) for value in request.form.getlist("remove_photos") if value.isdigit()]

    error = None
    if not parse_date(date):
        error = DATE_ERROR
    elif not all(allowed_file(photo.filename) for photo in new_photos):
        error = IMAGE_ERROR + " Choose the photos again."

    if error:
        # Show the page again with this meeting still open as a form
        return show_contact_page(contact, editing_meeting_id=meeting_id, edit_error=error)

    # update_meeting returns False if this meeting isn't this contact's:
    # then we stop, before any photo is saved or removed
    if not update_meeting(meeting_id, contact_id, date, notes):
        return redirect(url_for("view_contact", contact_id=contact_id))

    for filename in delete_meeting_photos(meeting_id, contact_id, remove_ids):
        delete_upload_file(filename)
    add_meeting_photos(meeting_id, [save_upload_file(photo) for photo in new_photos])
    set_meeting_labels(meeting_id, ticked_label_ids(),
                       parse_label_names(request.form.get("new_labels", "")))

    # _anchor adds "#meeting-5" to the URL, so the browser scrolls back to it
    return redirect(url_for("view_contact", contact_id=contact_id,
                            _anchor=f"meeting-{meeting_id}"))

# This block only runs when you start the file directly with: python app.py
# debug=True gives helpful error pages and restarts the server automatically
# whenever you save a change to this file.
if __name__ == "__main__":
    app.run(debug=True)
