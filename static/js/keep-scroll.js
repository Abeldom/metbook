// keep-scroll.js - tapping a label, sort button or "Show more" loads the page again,
// and a new page normally starts at the top. This remembers how far down you were
// and scrolls back there, so the page doesn't jump.

const KEY = "peopleScroll";

// Just before leaving the page through one of these links, save the scroll position.
// sessionStorage = a small notebook the browser keeps for this tab only.
document.addEventListener("click", (event) => {
  const link = event.target.closest(".label-filter a, .toolbar .seg a, .show-more");
  if (link) {
    sessionStorage.setItem(KEY, String(window.scrollY));
  }
});

// On the new page: scroll back to the saved spot (once), then forget it
const saved = sessionStorage.getItem(KEY);
if (saved !== null) {
  sessionStorage.removeItem(KEY);
  window.scrollTo(0, Number(saved));
}
