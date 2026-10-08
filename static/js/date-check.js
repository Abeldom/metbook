// date-check.js - one function that says whether a text is a date the app accepts.
//
// Used by date-picker.js (the "date format is not correct" note) and by form-changes.js (the Save button turns orange
// only when the date is right). Having it in one file keeps the two in agreement.

// Is this text a date the server accepts? "2026", "2026-09" or "2026-09-22", and a real one (not 2026-02-30).
// (The same rules as parse_date() in app.py.)
export function isValidDate(text) {
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(text);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = match[2] === undefined ? 1 : Number(match[2]);
  const day = match[3] === undefined ? 1 : Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) {
    return false;
  }
  return day <= new Date(year, month, 0).getDate();   // day 0 of the next month = the last day of this one
}
