# Metbook

*Everyone I've met, in one book.*

Metbook is a small personal contacts app, built with Flask and SQLite. It keeps track of the people you meet:
who they are, where they live, where they come from, and **when and where you met** — a timeline of meetings for every person.

It is a learning project, made for personal use, and runs on your own computer. Your data stays in a local database file.

## What it can do

- **People list** with live search (as you type), filters and two card layouts: *Compact* (small round picture) and *Large* (big picture).
- **Search in:** names (always), notes, meetings, or everywhere. Names and accents are matched loosely ("matyas" finds "Mátyás").
- **Filter by** the place a person comes from and by **labels** (any of / all of).
- **Contact page** with picture, places, notes, labels and a **timeline of meetings**. Each meeting has a date, notes, labels and photos.
- **Quick view** popup: click a card to see the details without leaving the list.
- **Pictures** can be moved inside their frames, so the face stays visible in the cards and the popup.
- **Add / edit / delete** contacts and meetings. Dates may be a full day, a month, or only a year.
- **Backup** page, and a script that imports a list of friends.
- **Works on a phone** (same Wi-Fi), with a layout of its own.

## Run it

You need Python 3.

```bash
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python app.py
```

Then open <http://127.0.0.1:5000>.

To use it on a phone on the same Wi-Fi, run `phone.bat` instead, and open the computer's address (port 5000) in the phone's browser.

## Project layout

| Path | What it is |
|---|---|
| `app.py` | The web app: pages (routes) and their logic |
| `database.py` | The SQLite database: tables, queries, search |
| `templates/` | The HTML pages (Jinja templates) |
| `static/` | CSS, JavaScript and fonts |
| `uploads/` | Uploaded pictures (not in the repository) |
| `contacts.db` | Your data (not in the repository) |

## Privacy

The database (`contacts.db`), the uploaded pictures and the friends import file are listed in `.gitignore`,
so they are never pushed to GitHub.
