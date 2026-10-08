// form-changes.js - the "Save" button of an edit form can only be pressed when there is something to save.
//
// Forms with the attribute data-track-changes (the person's edit window and the meetings' edit windows)
// remember how they looked when the page was loaded. As long as nothing is different, their Save button is
// switched off (disabled, and pale: the class "is-unchanged"). The moment you change something (type, tick a
// label, choose or remove a photo, pick a date) it is switched on and becomes the strong, filled button; if
// you put everything back the way it was, it is switched off again. This also stops Enter from saving an
// unchanged form.
// Exception: a window the server opened again after a mistake (data-open-on-load) has what you had typed in
// it, so its button is on from the start.

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
  const afterMistake = form.closest("dialog[data-open-on-load]") !== null;
  const original = snapshot(form);

  function check() {
    const unchanged = !afterMistake && snapshot(form) === original;
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
