// advanced-search.js - the "Filter" and "View" buttons under the search bar.
//
// Each button opens or closes its own panel (Filter: Search in, Filter by label; View: Sort by,
// Show, Layout). A panel is open when it has the class "is-open"; the CSS hides the others.
// (Without JavaScript the CSS shows both panels, so everything can still be reached.)
//
// The server opens a panel by itself when something in it is set (a label chosen, sorted by
// First met, ...). But tapping a label reloads the page, and when the last label is taken
// off, nothing is set any more, so the server would close the panel under your fingers.
// So we remember what YOU opened or closed (for this browser tab: sessionStorage) and use that.
// The remembered state is applied by a small inline script in people.html, right after the panels, so
// it shows at once (this file only runs after the whole page has loaded). Here: the clicks.

for (const button of document.querySelectorAll(".advanced-toggle")) {
  const panel = document.getElementById(button.getAttribute("aria-controls"));
  const key = `menuOpen-${button.dataset.menu}`;

  // Show or hide the panel, and keep the button's arrow and aria-expanded in step
  function setOpen(open) {
    panel.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", String(open));
  }

  button.addEventListener("click", () => {
    const open = !panel.classList.contains("is-open");
    setOpen(open);
    try {
      sessionStorage.setItem(key, open ? "1" : "0");
    } catch (error) {
      // not important
    }
  });
}
