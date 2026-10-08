// form-changes.js - the "Save" button of an edit form can only be pressed when there is something to save.
//
// Forms with the attribute data-track-changes (the person's edit window and the meetings' edit windows)
// remember how they looked when the page was loaded. As long as nothing is different, their Save button is
// switched off (disabled, and pale: the class "is-unchanged"). The moment you change something (type, tick a
// label, choose or remove a photo, pick a date) it is switched on and becomes the strong, filled button; if
// you put everything back the way it was, it is switched off again. This also stops Enter from saving an
// unchanged form.
// In every one of these forms the Save button also stays pale while a date box holds something that is not a real date
// (see date-check.js): typing "2" or "2026-13" is not enough.
// A form with the attribute data-require-filled (the "Add a meeting" forms) goes one step further: its Save button
// stays pale until every required field (the date) has something in it, even when other fields are filled in.
// This is also used by the "add" forms (a new meeting, a new contact): their Save button is pale until you
// have put something in. (If you then press it with a required field still empty, the "Missing: ..." note of
// form-check.js appears.)
// Exception: a form the server showed again after a mistake (the window opened again, data-open-on-load, or an
// error message above the form) has what you had typed in it, so its button is on from the start.

import { isValidDate } from "./date-check.js";

// A form as one piece of text: every field's name and value. A chosen file counts by its name and size.
function snapshot(form) {
  const parts = [];
  for (const [name, value] of new FormData(form)) {
    parts.push(name + "=" + (value instanceof File ? value.name + ":" + value.size : value));
  }
  return parts.join("&");
}

for (const form of document.querySelectorAll("form[data-track-changes]")) {
  const saveButton = form.querySelector('button[type="submit"]');
  if (!saveButton) {
    continue;
  }
  const afterMistake = form.closest("dialog[data-open-on-load]") !== null
    || form.parentElement.querySelector(":scope > .error") !== null;
  const needsFilled = form.hasAttribute("data-require-filled");
  const required = [...form.elements].filter((field) => field.required);
  const dateBoxes = [...form.elements].filter((field) => field.hasAttribute("data-date-picker"));
  const original = snapshot(form);

  function check() {
    const changed = afterMistake || snapshot(form) !== original;
    const filled = !needsFilled || required.every((field) => field.value.trim() !== "");
    // A date box must hold a real date ("2026", "2026-09" or "2026-09-22"): typing just "2" is not enough yet
    // (An empty date box is fine when the date is optional, like "Date First Met"; a required one is checked above and
    // in the edit forms, where an empty date is no date.)
    const datesRight = dateBoxes.every((box) => {
      const text = box.value.trim();
      return text === "" ? !box.required : isValidDate(text);
    });
    const unchanged = !(changed && filled && datesRight);   // pale and switched off: nothing to save yet, a required field is empty, or a date is not right
    saveButton.classList.toggle("is-unchanged", unchanged);
    saveButton.disabled = unchanged;
  }

  // "input" and "change" come from typing, ticking and (for the date calendar) choosing a day.
  // "photochange" is sent by photo-picker.js, because choosing, pasting or removing a photo sets the
  // fields by script, which the browser doesn't announce.
  form.addEventListener("input", check);
  form.addEventListener("change", check);
  form.addEventListener("photochange", check);
  // Cancel resets the form: look again right after it has happened
  form.addEventListener("reset", () => setTimeout(check, 0));

  check();
}
