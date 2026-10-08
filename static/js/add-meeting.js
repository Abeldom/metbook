// add-meeting.js - the "Add a meeting" popup window on a contact's page.
//
// The form sits in a <dialog>. showModal() opens it in the middle of the screen, dims the page
// behind it and lets the Esc key close it. Three ways to leave it:
//   - the x (and Esc, and a click on the dark background): just closes it. What you typed stays,
//     so opening it again brings it back.
//   - "Cancel": empties everything and closes it. Nothing is sent or saved.
//   - "Save meeting": sends the form (the page reloads).
// After a failed save the server shows the page again with the form filled in and an error message;
// data-open-on-load on the dialog opens it again by itself.
//
// Why not form.reset()? After a mistake (an empty or wrong date) the server fills the form again
// with what you typed. reset() would put THAT back, not an empty form. So we empty it by hand.
// Without JavaScript the dialog is shown as a plain part of the page (see style.css).

const dialog = document.querySelector("#add-meeting-dialog");
const openButton = document.querySelector("[data-open-meeting]");
const editDialog = document.querySelector("[data-edit-dialog][data-open-on-load]");   // only after a failed save, or a link used without JavaScript

// Every window: the x and the Cancel of the "Edit" window just close it; Esc and a click on the dark
// background close it too.
for (const box of document.querySelectorAll(".meeting-dialog")) {
  for (const button of box.querySelectorAll("[data-close-meeting]")) {
    button.addEventListener("click", () => box.close());
  }
  // A click on the dark background (the dialog element itself, outside its padding box) closes it.
  // Only when the press AND the release are on the background, so selecting text and letting go
  // outside the window doesn't close it.
  let pressedOnBackground = false;
  box.addEventListener("mousedown", (event) => { pressedOnBackground = event.target === box; });
  box.addEventListener("click", (event) => {
    if (event.target === box && pressedOnBackground) {
      box.close();
    }
  });
}

// On a computer, start in the date box. (Not on a phone: the keyboard would cover the calendar.)
function focusDate(box) {
  const date = box.querySelector("[data-date-picker]");
  if (date && window.matchMedia("(hover: hover)").matches) {
    date.focus();
  }
}

// The edit icon of a meeting shows that meeting's window, which is already in the page (closed):
// no reload. Ctrl / Shift / Cmd + click, or a middle click, keeps the link's own behaviour.
document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-edit-meeting]");
  if (!link || event.button !== 0 || event.ctrlKey || event.shiftKey || event.metaKey || event.altKey) {
    return;
  }
  const box = document.getElementById(`edit-meeting-dialog-${link.dataset.editMeeting}`);
  if (box) {
    event.preventDefault();
    box.showModal();
    focusDate(box);
  }
});

// "Edit Contact" at the top of the page shows the person's window (already in the page, closed): no
// reload either. Without JavaScript (or with Ctrl / Shift / Cmd + click) it is a normal link to the edit page.
document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-edit-contact]");
  if (!link || event.button !== 0 || event.ctrlKey || event.shiftKey || event.metaKey || event.altKey) {
    return;
  }
  const box = document.getElementById("edit-contact-dialog");
  if (box) {
    event.preventDefault();
    box.showModal();
    if (window.matchMedia("(hover: hover)").matches) {
      box.querySelector("#edit-contact-name").focus();
    }
  }
});

// "Cancel" in an Edit window: throw away what you changed (the fields go back to the meeting as it was
// saved), then close.
for (const button of document.querySelectorAll("[data-reset-meeting]")) {
  button.addEventListener("click", () => button.closest("form").reset());
}

// The "Edit" window opens by itself when the page loads (the edit link reloads the page with
// ?edit_meeting=ID in the address). Right after it opens we take that part out of the address, so
// closing the window and refreshing the page doesn't open it again. (No reload: only the address bar
// changes.)
if (editDialog) {
  editDialog.showModal();
  focusDate(editDialog);
  const address = new URL(location.href);
  if (address.searchParams.has("edit_meeting")) {
    address.searchParams.delete("edit_meeting");
    history.replaceState(null, "", address.pathname + address.search);
  }
}

if (dialog && openButton) {
  function open() {
    if (!dialog.open) {
      dialog.showModal();
    }
    // On a computer, start in the date box. (Not on a phone: the keyboard would cover the calendar.)
    const date = dialog.querySelector("#meeting-date");
    if (date && window.matchMedia("(hover: hover)").matches) {
      date.focus();
    }
  }

  openButton.addEventListener("click", open);
  dialog.querySelector("[data-cancel-meeting]").addEventListener("click", () => {
    const form = dialog.querySelector("form");

    for (const field of form.elements) {
      if (field.type === "checkbox" || field.type === "radio") {
        field.checked = false;                   // the labels you ticked
      } else if (field.type === "file") {
        field.value = "";                        // chosen photos
      } else if (["text", "search", "textarea"].includes(field.type)) {
        field.value = "";                        // date, notes, new labels
      }
    }
    form.dispatchEvent(new Event("input", { bubbles: true }));   // form-changes.js: the Save button looks again
    // Also remove the error message of a failed try, if there was one, and "Missing: ..." (form-check.js)
    for (const message of dialog.querySelectorAll(".error, .form-missing")) {
      message.remove();
    }
    const extras = dialog.querySelector(".more-notes");   // "Labels and photos" folds back too
    if (extras) {
      extras.open = false;
    }
    dialog.close();
  });

  if (dialog.hasAttribute("data-open-on-load")) {
    open();
  }
}
