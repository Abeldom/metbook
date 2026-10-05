// advanced-search.js - remembers whether you opened or closed the "Advanced search" fold.
//
// The server opens the fold by itself when an option is active (a label chosen, sorted by
// First met, ...). But tapping a label reloads the page, and when the last label is taken
// off, nothing is active any more, so the server would close it under your fingers.
// So we remember your own choice for this browser tab (sessionStorage) and use it.

const fold = document.querySelector(".advanced-search");
const KEY = "advancedSearchOpen";

if (fold) {
  let saved = null;
  try {
    saved = sessionStorage.getItem(KEY);
  } catch (error) {
    // storage can be blocked: then the server's choice stays
  }
  if (saved === "1") {
    fold.open = true;
  } else if (saved === "0") {
    fold.open = false;
  }

  // Only when YOU tap the "Advanced search" line. (The "toggle" event would also fire when the
  // page loads with the fold already open, and that is not your choice.)
  // setTimeout: the browser flips fold.open just after the click, so we look a moment later.
  fold.querySelector("summary").addEventListener("click", () => {
    setTimeout(() => {
      try {
        sessionStorage.setItem(KEY, fold.open ? "1" : "0");
      } catch (error) {
        // not important
      }
    }, 0);
  });
}
