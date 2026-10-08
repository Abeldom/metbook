// advanced-search.js - the "Filter" and "View" buttons under the search bar.
//
// Each button opens its own panel (Filter: Search in, Filter by; View: Sort by, Show, Layout) and closes
// the other one: only one is open at a time. A panel is open when it has the class "is-open"; the CSS hides the others.
// (Without JavaScript the CSS shows both panels, so everything can still be reached.)
//
// The server opens a panel by itself when something in it is set (a label chosen, sorted by
// First met, ...). But tapping a label reloads the page, and when the last label is taken
// off, nothing is set any more, so the server would close the panel under your fingers.
// So we remember what YOU opened or closed (for this browser tab: sessionStorage) and use that.
// The remembered state is applied by a small inline script in people.html, right after the panels, so
// it shows at once (this file only runs after the whole page has loaded). Here: the clicks.

const buttons = [...document.querySelectorAll(".advanced-toggle")];

// Show or hide a panel, and keep its button's arrow and aria-expanded in step. What you chose is remembered
// (sessionStorage), see above.
function setOpen(button, open) {
  document.getElementById(button.getAttribute("aria-controls")).classList.toggle("is-open", open);
  button.setAttribute("aria-expanded", String(open));
  try {
    sessionStorage.setItem(`menuOpen-${button.dataset.menu}`, open ? "1" : "0");
  } catch (error) {
    // not important
  }
}

// Only ONE panel is open at a time: opening one closes the other, like a switch.
// Tapping the open one again closes it (then both are closed).
for (const button of buttons) {
  button.addEventListener("click", () => {
    const open = button.getAttribute("aria-expanded") !== "true";
    for (const other of buttons) {
      setOpen(other, other === button ? open : false);
    }
  });
}
