// notes-clamp.js - long notes show only their first lines (6 in the quick-view window, 15 on a contact's page),
// with a "Show more" button under them.
//
// Any element with the class "notes-clamp" (the notes on a contact's page, and in the quick-view window) is cut
// off after that many lines by the CSS (only when JavaScript works). This script looks at each one: if the text is
// longer it adds a small "Show more" button under it, at the left, which opens the whole text, and then turns
// into "Show less". Notes that fit get no button.
//
// setUpNotes(root) can be called for a piece of the page that was added later (quick-view.js does that for the
// window's content, after it has been fetched).

const MORE = "Show more";
const LESS = "Show less";

// Does this text have more lines than are showing? (Only meaningful while it is cut off.)
function isCutOff(text) {
  return text.scrollHeight > text.clientHeight + 1;
}

// Show the button only when there is something hidden (or while the text is open, so you can close it again)
function refresh(text) {
  const button = text.nextElementSibling;
  if (button && button.classList.contains("notes-toggle") && !text.classList.contains("is-open")) {
    button.hidden = !isCutOff(text);
  }
}

export function setUpNotes(root = document) {
  for (const text of root.querySelectorAll(".notes-clamp")) {
    if (text.dataset.ready) {
      continue;
    }
    text.dataset.ready = "1";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "notes-toggle";
    button.textContent = MORE;
    button.hidden = true;
    button.setAttribute("aria-expanded", "false");
    text.after(button);

    button.addEventListener("click", () => {
      const open = text.classList.toggle("is-open");
      button.textContent = open ? LESS : MORE;
      button.setAttribute("aria-expanded", String(open));
      if (!open) {
        text.scrollIntoView({ block: "nearest" });   // the text got shorter: don't leave it out of sight
      }
    });

    refresh(text);
  }
}

// When the window is resized the lines wrap differently: look again
window.addEventListener("resize", () => {
  for (const text of document.querySelectorAll(".notes-clamp")) {
    refresh(text);
  }
});

setUpNotes();
