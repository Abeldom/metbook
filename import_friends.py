# import_friends.py - adds people from a Facebook "Your friends" export
# (your_friends.html) to the Metbook database.
#
# Run it from the project folder:
#     .venv\Scripts\python import_friends.py          -> the first 10 people in the file
#     .venv\Scripts\python import_friends.py 50       -> the first 50
#     .venv\Scripts\python import_friends.py 100 11   -> 100 people, starting with the 11th
#
# For each person it creates a contact, and turns the date you became friends
# into their first meeting (only the day: "2026-09-21", no time).
# People who are already in the database (same name) are skipped, so running
# it again doesn't create doubles. (Two different friends in the file with the
# same name are both added, though.)

import re
import sys
from html.parser import HTMLParser

from database import init_database, get_all_contacts, add_contact, add_meeting

FRIENDS_FILE = "your_friends.html"
MEETING_NOTE = "Became friends on Facebook"

# Month abbreviations in the export: Hungarian, and English in case the
# export is ever made in English
MONTHS = {
    "jan": 1, "febr": 2, "márc": 3, "ápr": 4, "máj": 5, "jún": 6,
    "júl": 7, "aug": 8, "szept": 9, "okt": 10, "nov": 11, "dec": 12,
    "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6, "jul": 7, "sep": 9, "oct": 10,
}


class FriendsParser(HTMLParser):
    """
    Reads the export page and collects (name, date text) pairs.
    HTMLParser (built into Python) calls our methods for every tag and every
    piece of text it meets. In the file, each friend looks like this:

        <section>
          <h2>Botond Fekete</h2>
          <footer><div>szept. 21, 2026 10:49:30 de.</div></footer>
        </section>
    """

    def __init__(self):
        super().__init__()
        self.friends = []       # the result: [(name, date text), ...]
        self.in_section = False
        self.reading = None     # "name" inside <h2>, "date" inside <footer>
        self.name = ""
        self.date = ""

    def handle_starttag(self, tag, attrs):
        if tag == "section":
            self.in_section = True
            self.name = ""
            self.date = ""
        elif self.in_section and tag == "h2":
            self.reading = "name"
        elif self.in_section and tag == "footer":
            self.reading = "date"

    def handle_endtag(self, tag):
        if tag in ("h2", "footer"):
            self.reading = None
        elif tag == "section" and self.in_section:
            self.friends.append((self.name.strip(), self.date.strip()))
            self.in_section = False

    def handle_data(self, data):
        if self.reading == "name":
            self.name += data
        elif self.reading == "date":
            self.date += data


def to_day(date_text):
    """
    "szept. 21, 2026 10:49:30 de." -> "2026-09-21"
    Only the day is kept; the time is thrown away.
    Returns None if the text doesn't look like a date.
    """
    # (\w+) = the month word, (\d{1,2}) = the day, (\d{4}) = the year
    match = re.match(r"(\w+)\.? (\d{1,2}), (\d{4})", date_text)
    if not match:
        return None
    month = MONTHS.get(match.group(1).lower())
    if not month:
        return None
    day = int(match.group(2))
    year = int(match.group(3))
    # :02d = always two digits (9 -> "09"), like the rest of the app expects
    return f"{year}-{month:02d}-{day:02d}"


def read_friends(path):
    """All (name, "YYYY-MM-DD") pairs from the export file, in the file's order."""
    with open(path, encoding="utf-8") as file:
        parser = FriendsParser()
        parser.feed(file.read())
    return [(name, to_day(date)) for name, date in parser.friends if name]


def import_friends(friends, how_many, start=1):
    """
    Add how_many friends, beginning with number start (1 = the first one in
    the file). Names that were already saved BEFORE this run are skipped.
    If the same name is in the file twice (two different Facebook accounts),
    both are added.
    """
    existing = {contact["name"].casefold() for contact in get_all_contacts()}
    added = 0
    # Lists count from 0 in Python, people count from 1: friend number 11 is friends[10]
    first = start - 1
    for name, day in friends[first:first + how_many]:
        if name.casefold() in existing:
            print(f"  skipped (already saved): {name}")
            continue
        contact_id = add_contact(name)
        if day:
            add_meeting(contact_id, day, MEETING_NOTE)
        added += 1
        print(f"  added: {name} ({day or 'no date'})")
    return added


# This part only runs when you start the file directly (not when it's imported)
if __name__ == "__main__":
    # sys.argv is the list of words typed after "python": ["import_friends.py", "100", "11"]
    how_many = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    start = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    init_database()
    friends = read_friends(FRIENDS_FILE)
    last = min(start + how_many - 1, len(friends))
    print(f"{len(friends)} friends in {FRIENDS_FILE}; importing numbers {start} to {last}:")
    added = import_friends(friends, how_many, start)
    print(f"Done: {added} new contacts.")
