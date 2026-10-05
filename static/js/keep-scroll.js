// keep-scroll.js - tapping a label, sort button or "Show more" loads the page again,
// and a new page normally starts at the top. This remembers how far down you were
// and scrolls back there, so the page doesn't jump.
//
// It also does the same when you come back to this page from a person's page
// (return-to-people.js leaves "peopleRestoreScroll" for it).

const KEY = "peopleScroll";
const RESTORE_KEY = "peopleRestoreScroll";

// Just before leaving the page through one of these links, save the scroll position.
// sessionStorage = a small notebook the browser keeps for this tab only.
document.addEventListener("click", (event) => {
  const link = event.target.closest(".label-filter a, .toolbar .seg a, .show-more");
  if (link) {
    sessionStorage.setItem(KEY, String(window.scrollY));
  }
});

// The list of label buttons scrolls on its own (when there are many labels). Tapping a
// label reloads the page, and the list would jump back to its top: so remember its
// position too, and put it back.
const chips = document.querySelector(".label-chips");
const CHIPS_KEY = "peopleChipsScroll";
if (chips) {
  chips.addEventListener("click", (event) => {
    if (event.target.closest(".label-chip")) {
      sessionStorage.setItem(CHIPS_KEY, String(chips.scrollTop));
    }
  });
  const savedChips = sessionStorage.getItem(CHIPS_KEY);
  if (savedChips !== null) {
    sessionStorage.removeItem(CHIPS_KEY);
    chips.scrollTop = Number(savedChips);
  }
}

// On the new page: scroll back to the saved spot (once), then forget it.
// The first one is for label/sort/"Show more" clicks, the second for coming back from a person.
let target = null;
for (const key of [KEY, RESTORE_KEY]) {
  const saved = sessionStorage.getItem(key);
  if (saved !== null) {
    sessionStorage.removeItem(key);
    if (saved !== "" && target === null) {
      target = Number(saved);
    }
  }
}

// An address like /people#person-79 (saved by an older version) makes the browser mark
// that card and show the number in the address bar. Take the "#..." part away.
if (location.hash.startsWith("#person-")) {
  history.replaceState(null, "", location.pathname + location.search);
}

if (target !== null) {
  window.scrollTo(0, target);
  // Pictures and fonts that arrive later can change the page height a little,
  // so once everything has loaded, scroll to the same spot again.
  window.addEventListener("load", () => window.scrollTo(0, target));
}
