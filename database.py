# database.py - handles all database operations
#
# SQLite is built into Python. It stores data in a file called contacts.db
# We write functions here to add, get, delete, and search contacts and meetings.

import sqlite3
import unicodedata


# DATABASE_FILE is the file where all our data lives
DATABASE_FILE = "contacts.db"

# Removes labels that no person and no meeting uses anymore. It's needed in
# several functions below, so it's written once here.
DELETE_UNUSED_LABELS = """
    DELETE FROM labels
    WHERE id NOT IN (SELECT label_id FROM contact_labels)
      AND id NOT IN (SELECT label_id FROM meeting_labels)
"""


def simplify(text):
    """
    Make text easy to compare in a search: lowercase, and without accents.
    "Mátyás Dániel" -> "matyas daniel", "ŐRSÉG" -> "orseg"

    How: NFKD splits each accented letter into the plain letter plus the
    accent as a separate "combining" mark (á -> a + ´). Then we drop the marks.
    """
    text = unicodedata.normalize("NFKD", (text or "").casefold())
    return "".join(ch for ch in text if not unicodedata.combining(ch))


def init_database():
    """
    Create the tables if they don't exist, and upgrade older databases.
    This runs once when the app starts.

    A "table" is like a spreadsheet:
    - Each row is one contact (or one meeting)
    - Each column is a field (name, notes, etc.)
    """
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()

    # SQL: CREATE TABLE tells SQLite to make a new table
    # If it already exists, we do nothing (IF NOT EXISTS)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            notes TEXT,
            picture_path TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # One row per time you met someone.
    # contact_id says which person the meeting belongs to: it holds the id of
    # a row in the contacts table. This link is called a "foreign key".
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS meetings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contact_id INTEGER NOT NULL REFERENCES contacts(id),
            date TEXT NOT NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Photos of meetings. One meeting can have many photos ("one-to-many"),
    # so each photo row simply says which meeting it belongs to.
    # The picture files themselves are in the uploads folder; here we only
    # keep their file names.
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS meeting_photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id INTEGER NOT NULL REFERENCES meetings(id),
            filename TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Labels ("Family", "Work", ...). One person can have many labels, and one
    # label can belong to many people: a "many-to-many" relationship.
    # For that we need two tables: the labels themselves...
    # (COLLATE NOCASE + UNIQUE: "Family" and "family" can't both exist)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS labels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE COLLATE NOCASE
        )
    """)

    # ...and a table in the middle, where each row says "this contact has this
    # label". The PRIMARY KEY on both columns means each pair can only exist once.
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS contact_labels (
            contact_id INTEGER NOT NULL REFERENCES contacts(id),
            label_id INTEGER NOT NULL REFERENCES labels(id),
            PRIMARY KEY (contact_id, label_id)
        )
    """)

    # Meetings can have labels too. They use the same labels as people
    # ("Camp" is one label), with their own table in the middle.
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS meeting_labels (
            meeting_id INTEGER NOT NULL REFERENCES meetings(id),
            label_id INTEGER NOT NULL REFERENCES labels(id),
            PRIMARY KEY (meeting_id, label_id)
        )
    """)

    # Migration: changing a database that already holds data.
    # Older versions of this app kept a single "date_met" column on each
    # contact. Turn each of those dates into that person's first meeting, then
    # remove the old column. After that, the column is gone and this is skipped.
    columns = [row[1] for row in cursor.execute("PRAGMA table_info(contacts)")]
    if "date_met" in columns:
        cursor.execute("""
            INSERT INTO meetings (contact_id, date)
            SELECT id, date_met FROM contacts
            WHERE date_met IS NOT NULL AND date_met != ''
        """)
        cursor.execute("ALTER TABLE contacts DROP COLUMN date_met")
        print("✓ Moved old 'date met' values into the meetings table")

    conn.commit()
    conn.close()
    print("✓ Database initialized (contacts, meetings, photos and labels tables ready)")


def add_contact(name, notes="", picture_path=""):
    """
    Add a new contact to the database.

    Args:
        name (str): Person's name (required)
        notes (str): Notes about them (optional)
        picture_path (str): Filename of the picture (optional)

    Returns:
        int: The ID of the new contact
    """
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()

    # INSERT adds a new row to the table
    cursor.execute("""
        INSERT INTO contacts (name, notes, picture_path)
        VALUES (?, ?, ?)
    """, (name, notes, picture_path))

    contact_id = cursor.lastrowid  # get the ID of what we just added

    conn.commit()
    conn.close()

    return contact_id


def get_all_contacts(sort_by="name", search="", label_ids=(), match="any"):
    """
    Get all contacts from the database, or only the ones matching a search.

    Args:
        sort_by (str): How to sort: "name" (A-Z) or "firstmet" (newest first)
        search (str): Only return contacts whose name, notes, meeting notes
                      or labels contain this text (ignoring capitals and
                      accents). Empty = return everyone.
        label_ids (list): Only return contacts with these labels (on the person
                          or on one of their meetings). Empty = everyone.
        match (str): "any" = people with at least one of the labels,
                     "all" = people with every one of them

    Returns:
        list: List of dictionaries, each one is a contact
              Example: [{"id": 1, "name": "Alice", "first_met": "2026-09",
                         "labels": [{"id": 3, "name": "Family"}], ...}]
    """
    conn = sqlite3.connect(DATABASE_FILE)
    # row_factory: tells SQLite to return rows as dictionaries (not tuples)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Teach SQLite our Python simplify() function, so SQL can call it too
    conn.create_function("simplify", 1, simplify, deterministic=True)

    # Sort by name (A-Z) or by when you first met (newest first).
    # COLLATE NOCASE makes sorting case-insensitive (A and a are the same).
    # first_met is the name we give the "earliest meeting" column below.
    # "first_met IS NULL" is 1 for people without any meeting and 0 for the
    # others, so sorting by it first puts the people without a date at the end.
    # After that: newest first; and people with the same date go A-Z.
    if sort_by == "firstmet":
        order = "ORDER BY first_met IS NULL, first_met DESC, name COLLATE NOCASE ASC"
    else:  # default to name
        order = "ORDER BY name COLLATE NOCASE ASC"

    # WHERE keeps only the rows that match. We collect the conditions in a
    # list, then glue them together with AND (a contact must pass all of them).
    conditions = []
    params = []

    if search:
        # instr(text, part) gives the position of part inside text, or 0 if
        # it isn't there. EXISTS (...) is true if the subquery finds any row:
        # here, a matching meeting, a matching label, or a meeting with a
        # matching label.
        # JOIN combines rows from two tables that belong together: each
        # contact_labels row with the labels row it points to.
        conditions.append("""(
            instr(simplify(contacts.name), ?) > 0
            OR instr(simplify(contacts.notes), ?) > 0
            OR EXISTS (SELECT 1 FROM meetings
                       WHERE meetings.contact_id = contacts.id
                         AND instr(simplify(meetings.notes), ?) > 0)
            OR EXISTS (SELECT 1 FROM contact_labels
                       JOIN labels ON labels.id = contact_labels.label_id
                       WHERE contact_labels.contact_id = contacts.id
                         AND instr(simplify(labels.name), ?) > 0)
            OR EXISTS (SELECT 1 FROM meeting_labels
                       JOIN labels ON labels.id = meeting_labels.label_id
                       JOIN meetings ON meetings.id = meeting_labels.meeting_id
                       WHERE meetings.contact_id = contacts.id
                         AND instr(simplify(labels.name), ?) > 0)
        )""")
        params += [simplify(search)] * 5   # the same text for all five ?

    if label_ids:
        # "This contact has label ?": the person has the label themselves,
        # OR one of their meetings has it
        has_label = """(
            EXISTS (SELECT 1 FROM contact_labels
                    WHERE contact_labels.contact_id = contacts.id
                      AND contact_labels.label_id = ?)
            OR EXISTS (SELECT 1 FROM meeting_labels
                       JOIN meetings ON meetings.id = meeting_labels.meeting_id
                       WHERE meetings.contact_id = contacts.id
                         AND meeting_labels.label_id = ?)
        )"""
        # One check per chosen label, glued with OR ("any" of them) or AND ("all" of them)
        glue = " AND " if match == "all" else " OR "
        conditions.append("(" + glue.join([has_label] * len(label_ids)) + ")")
        for label_id in label_ids:
            params += [label_id, label_id]   # each check has two ? for the same label

    where = ""
    if conditions:
        where = "WHERE " + " AND ".join(conditions)

    # contacts.* means "all columns of the contacts table".
    # The (SELECT MIN(date) ...) part is a "subquery": for every contact it
    # finds their earliest meeting, and names that value first_met.
    # group_concat glues all their meeting notes (and the labels of their
    # meetings) into one text, for the live search on the People page.
    cursor.execute(f"""
        SELECT contacts.*,
               (SELECT MIN(date) FROM meetings
                WHERE meetings.contact_id = contacts.id) AS first_met,
               (SELECT group_concat(notes, ' ') FROM meetings
                WHERE meetings.contact_id = contacts.id) AS meeting_notes,
               (SELECT group_concat(labels.name, ' ') FROM meeting_labels
                JOIN labels ON labels.id = meeting_labels.label_id
                JOIN meetings ON meetings.id = meeting_labels.meeting_id
                WHERE meetings.contact_id = contacts.id) AS meeting_label_names
        FROM contacts
        {where}
        {order}
    """, params)
    # fetchall() gets all results.
    # Convert sqlite3.Row objects to regular dictionaries, so we can add to them.
    contacts = [dict(contact) for contact in cursor.fetchall()]

    # Give every contact a "labels" list. One query gets all the
    # (contact, label) pairs; then we sort them into a dictionary:
    #   {contact_id: [label, label, ...]}
    labels_by_contact = {}
    cursor.execute("""
        SELECT contact_labels.contact_id, labels.id, labels.name
        FROM contact_labels
        JOIN labels ON labels.id = contact_labels.label_id
        ORDER BY labels.name COLLATE NOCASE
    """)
    for row in cursor.fetchall():
        # setdefault: get this contact's list, or start an empty one first
        labels_by_contact.setdefault(row["contact_id"], []).append(
            {"id": row["id"], "name": row["name"]})

    for contact in contacts:
        contact["labels"] = labels_by_contact.get(contact["id"], [])

    conn.close()

    return contacts


def get_contact_by_id(contact_id):
    """
    Get one contact by ID.

    Args:
        contact_id (int): The contact's ID

    Returns:
        dict: One contact dictionary (with a "labels" list), or None if not found
    """
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM contacts WHERE id = ?", (contact_id,))
    row = cursor.fetchone()

    contact = None
    if row:
        contact = dict(row)
        cursor.execute("""
            SELECT labels.id, labels.name
            FROM contact_labels
            JOIN labels ON labels.id = contact_labels.label_id
            WHERE contact_labels.contact_id = ?
            ORDER BY labels.name COLLATE NOCASE
        """, (contact_id,))
        contact["labels"] = [dict(label) for label in cursor.fetchall()]

    conn.close()

    return contact


def update_contact(contact_id, name, notes, picture_path):
    """
    Change a contact's name, notes and picture.

    Args:
        contact_id (int): Which contact to change
        name (str): New name
        notes (str): New notes
        picture_path (str): New picture filename, or None for no picture

    Returns:
        bool: True if changed, False if not found
    """
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()

    # UPDATE changes columns of rows that already exist.
    # The WHERE part is important: without it, EVERY contact would be changed!
    cursor.execute("""
        UPDATE contacts
        SET name = ?, notes = ?, picture_path = ?
        WHERE id = ?
    """, (name, notes, picture_path, contact_id))

    rows_changed = cursor.rowcount
    conn.commit()
    conn.close()

    return rows_changed > 0


def delete_contact(contact_id):
    """
    Delete a contact by ID, together with all their meetings, meeting
    photos and labels.

    Args:
        contact_id (int): The contact's ID

    Returns:
        list: The file names of their meeting photos, so the app can delete
              those files from the uploads folder too
    """
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()

    # Which meeting photos did this person have? (collected before deleting)
    cursor.execute("""
        SELECT meeting_photos.filename
        FROM meeting_photos
        JOIN meetings ON meetings.id = meeting_photos.meeting_id
        WHERE meetings.contact_id = ?
    """, (contact_id,))
    photo_files = [row[0] for row in cursor.fetchall()]

    # Delete everything that points at this person first, so nothing is left
    # pointing at a missing person:
    # meeting photos and meeting labels -> meetings -> label links -> contact
    for table in ("meeting_photos", "meeting_labels"):
        cursor.execute(f"""
            DELETE FROM {table}
            WHERE meeting_id IN (SELECT id FROM meetings WHERE contact_id = ?)
        """, (contact_id,))
    cursor.execute("DELETE FROM meetings WHERE contact_id = ?", (contact_id,))
    cursor.execute("DELETE FROM contact_labels WHERE contact_id = ?", (contact_id,))
    cursor.execute("DELETE FROM contacts WHERE id = ?", (contact_id,))

    # Labels that nobody uses anymore are removed too
    cursor.execute(DELETE_UNUSED_LABELS)

    conn.commit()
    conn.close()

    return photo_files


def get_all_labels():
    """
    Get every label, A-Z, with how many people it belongs to: people who have
    the label themselves, or who have a meeting with it (each person counts once).

    Returns:
        list: e.g. [{"id": 3, "name": "Family", "contact_count": 4}, ...]
    """
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT labels.id, labels.name,
               (SELECT COUNT(*) FROM contacts
                WHERE EXISTS (SELECT 1 FROM contact_labels
                              WHERE contact_labels.contact_id = contacts.id
                                AND contact_labels.label_id = labels.id)
                   OR EXISTS (SELECT 1 FROM meeting_labels
                              JOIN meetings ON meetings.id = meeting_labels.meeting_id
                              WHERE meetings.contact_id = contacts.id
                                AND meeting_labels.label_id = labels.id)
               ) AS contact_count
        FROM labels
        ORDER BY labels.name COLLATE NOCASE
    """)
    labels = [dict(label) for label in cursor.fetchall()]

    conn.close()

    return labels


def set_contact_labels(contact_id, label_ids, new_label_names=()):
    """
    Give a contact exactly these labels (any others are taken away).

    Args:
        contact_id (int): Which contact
        label_ids (list): ids of existing labels that were ticked
        new_label_names (list): names typed into "new labels"; each one is
                                created, unless a label with that name exists
    """
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    wanted = find_or_create_labels(cursor, label_ids, new_label_names)

    # Replace this contact's labels: remove them all, then add the wanted ones.
    # "INSERT ... SELECT ... WHERE id = ?" only inserts if that label really
    # exists, so a made-up id sent by a broken form can't cause trouble.
    cursor.execute("DELETE FROM contact_labels WHERE contact_id = ?", (contact_id,))
    for label_id in wanted:
        cursor.execute("""
            INSERT INTO contact_labels (contact_id, label_id)
            SELECT ?, id FROM labels WHERE id = ?
        """, (contact_id, label_id))

    # Labels that nobody uses anymore are removed
    cursor.execute(DELETE_UNUSED_LABELS)

    conn.commit()
    conn.close()


def set_meeting_labels(meeting_id, label_ids, new_label_names=()):
    """
    Give a meeting exactly these labels (any others are taken away).
    Works just like set_contact_labels, but for a meeting.
    """
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    wanted = find_or_create_labels(cursor, label_ids, new_label_names)

    cursor.execute("DELETE FROM meeting_labels WHERE meeting_id = ?", (meeting_id,))
    for label_id in wanted:
        cursor.execute("""
            INSERT INTO meeting_labels (meeting_id, label_id)
            SELECT ?, id FROM labels WHERE id = ?
        """, (meeting_id, label_id))

    cursor.execute(DELETE_UNUSED_LABELS)

    conn.commit()
    conn.close()


def find_or_create_labels(cursor, label_ids, new_label_names):
    """
    Used by set_contact_labels and set_meeting_labels: turns the ticked label
    ids plus the typed-in new names into one set of label ids, creating
    the labels that don't exist yet.

    It gets the cursor of the caller, so everything happens in the caller's
    connection, and is saved (commit) together.
    """
    # A "set" can't hold the same id twice, so ticking "Family" AND typing
    # "family" still gives that label only once
    wanted = set(label_ids)

    # Look up every existing label by its name in lowercase (casefold), so
    # typing "family", "Family" or "FAMILY" finds the same label
    existing = {}
    for row in cursor.execute("SELECT id, name FROM labels"):
        existing[row["name"].casefold()] = row["id"]

    for name in new_label_names:
        key = name.casefold()
        if key not in existing:
            cursor.execute("INSERT INTO labels (name) VALUES (?)", (name,))
            existing[key] = cursor.lastrowid
        wanted.add(existing[key])

    return wanted


def add_meeting(contact_id, date, notes=""):
    """
    Add a meeting to a contact's timeline.

    Args:
        contact_id (int): Which contact you met
        date (str): When: "2026", "2026-09" or "2026-09-22"
        notes (str): What happened (optional)

    Returns:
        int: The ID of the new meeting
    """
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO meetings (contact_id, date, notes)
        VALUES (?, ?, ?)
    """, (contact_id, date, notes))

    meeting_id = cursor.lastrowid

    conn.commit()
    conn.close()

    return meeting_id


def get_meetings(contact_id):
    """
    Get all meetings with one contact, newest first.

    Dates are stored as text like "2026-09-22". Text sorts letter by letter,
    which puts these dates in the right order as long as months and days
    always have two digits (09, not 9). A year on its own ("2026") sorts
    as if it were the start of that year.

    Args:
        contact_id (int): The contact's ID

    Returns:
        list: List of meeting dictionaries
    """
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # DESC = descending (newest first). If two meetings have the same date,
    # the one added later (higher id) comes first.
    cursor.execute("""
        SELECT * FROM meetings
        WHERE contact_id = ?
        ORDER BY date DESC, id DESC
    """, (contact_id,))
    meetings = [dict(meeting) for meeting in cursor.fetchall()]

    # Give every meeting a "photos" list (same idea as labels in
    # get_all_contacts: one query, then sort the rows by meeting)
    cursor.execute("""
        SELECT meeting_photos.*
        FROM meeting_photos
        JOIN meetings ON meetings.id = meeting_photos.meeting_id
        WHERE meetings.contact_id = ?
        ORDER BY meeting_photos.id
    """, (contact_id,))
    photos_by_meeting = {}
    for photo in cursor.fetchall():
        photos_by_meeting.setdefault(photo["meeting_id"], []).append(dict(photo))

    # ...and a "labels" list, the same way
    cursor.execute("""
        SELECT meeting_labels.meeting_id, labels.id, labels.name
        FROM meeting_labels
        JOIN labels ON labels.id = meeting_labels.label_id
        JOIN meetings ON meetings.id = meeting_labels.meeting_id
        WHERE meetings.contact_id = ?
        ORDER BY labels.name COLLATE NOCASE
    """, (contact_id,))
    labels_by_meeting = {}
    for row in cursor.fetchall():
        labels_by_meeting.setdefault(row["meeting_id"], []).append(
            {"id": row["id"], "name": row["name"]})

    for meeting in meetings:
        meeting["photos"] = photos_by_meeting.get(meeting["id"], [])
        meeting["labels"] = labels_by_meeting.get(meeting["id"], [])

    conn.close()

    return meetings


def update_meeting(meeting_id, contact_id, date, notes=""):
    """
    Change a meeting's date and notes.

    Like delete_meeting, we also check contact_id, so a meeting can only be
    changed from the page of the person it belongs to.

    Returns:
        bool: True if changed, False if not found
    """
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE meetings
        SET date = ?, notes = ?
        WHERE id = ? AND contact_id = ?
    """, (date, notes, meeting_id, contact_id))

    rows_changed = cursor.rowcount
    conn.commit()
    conn.close()

    return rows_changed > 0


def delete_meeting(meeting_id, contact_id):
    """
    Delete one meeting, together with its photos and labels.

    We also check contact_id, so a meeting can only be deleted from the
    page of the person it belongs to.

    Returns:
        list: The file names of the meeting's photos, so the app can delete
              those files from the uploads folder too
    """
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()

    # The JOIN with meetings checks that the meeting belongs to this contact
    cursor.execute("""
        SELECT meeting_photos.filename
        FROM meeting_photos
        JOIN meetings ON meetings.id = meeting_photos.meeting_id
        WHERE meetings.id = ? AND meetings.contact_id = ?
    """, (meeting_id, contact_id))
    photo_files = [row[0] for row in cursor.fetchall()]

    for table in ("meeting_photos", "meeting_labels"):
        cursor.execute(f"""
            DELETE FROM {table}
            WHERE meeting_id IN (SELECT id FROM meetings WHERE id = ? AND contact_id = ?)
        """, (meeting_id, contact_id))
    cursor.execute("DELETE FROM meetings WHERE id = ? AND contact_id = ?",
                   (meeting_id, contact_id))

    # Labels that nobody uses anymore are removed
    cursor.execute(DELETE_UNUSED_LABELS)

    conn.commit()
    conn.close()

    return photo_files


def add_meeting_photos(meeting_id, filenames):
    """
    Add photos (already saved in the uploads folder) to a meeting.

    Args:
        meeting_id (int): Which meeting
        filenames (list): The photos' file names in the uploads folder
    """
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()

    for filename in filenames:
        cursor.execute("INSERT INTO meeting_photos (meeting_id, filename) VALUES (?, ?)",
                       (meeting_id, filename))

    conn.commit()
    conn.close()


def delete_meeting_photos(meeting_id, contact_id, photo_ids):
    """
    Remove some photos from a meeting.

    Only photos of this meeting, of this contact, are removed: the JOIN checks
    that everything belongs together.

    Returns:
        list: The file names of the removed photos (to delete the files)
    """
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()

    photo_files = []
    for photo_id in photo_ids:
        cursor.execute("""
            SELECT meeting_photos.filename
            FROM meeting_photos
            JOIN meetings ON meetings.id = meeting_photos.meeting_id
            WHERE meeting_photos.id = ? AND meetings.id = ? AND meetings.contact_id = ?
        """, (photo_id, meeting_id, contact_id))
        row = cursor.fetchone()
        if row:
            cursor.execute("DELETE FROM meeting_photos WHERE id = ?", (photo_id,))
            photo_files.append(row[0])

    conn.commit()
    conn.close()

    return photo_files
