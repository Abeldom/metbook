// card-labels.js - keeps the labels on each People card on ONE line.
//
// Every label of a person is in the HTML. This script shows as many as fit
// in the card's width, hides the others, and writes how many are hidden
// into the "+N" tag. It runs again whenever a card changes size: turning
// the phone, resizing the window, or a card coming back after a search.

function fitLabels(row) {
  // A hidden card (e.g. filtered out by the search) has no width to measure.
  // That's fine: it runs again when the card shows up (see ResizeObserver below).
  if (row.clientWidth === 0) {
    return;
  }

  const labels = [...row.querySelectorAll(".tag:not(.tag-more)")];
  const more = row.querySelector(".tag-more");

  // scrollWidth = how wide the content wants to be,
  // clientWidth = how wide the row really is. Wider content = it doesn't fit.
  const overflows = () => row.scrollWidth > row.clientWidth;

  // Start from zero: every label visible, no "+N", nothing squeezed
  for (const label of labels) {
    label.hidden = false;
  }
  more.hidden = true;
  row.classList.remove("squeeze");

  // Hide labels from the end, one at a time, until the rest and "+N" fit.
  // (We stop at the first label: at least one always stays visible.)
  const hiddenNames = [];
  for (let i = labels.length - 1; i > 0 && overflows(); i--) {
    labels[i].hidden = true;
    hiddenNames.unshift(labels[i].textContent);   // unshift = add to the front
    more.hidden = false;
    more.textContent = `+${hiddenNames.length}`;
  }

  // Hovering "+N" on a computer lists the hidden labels
  more.title = hiddenNames.join(", ");
  more.setAttribute("aria-label", `and ${hiddenNames.length} more labels`);

  // Still too wide? Then the first label is very long: let CSS cut it with "…"
  if (overflows()) {
    row.classList.add("squeeze");
  }
}

const rows = document.querySelectorAll(".person-labels");

// A ResizeObserver calls our function whenever one of the rows changes size
const observer = new ResizeObserver((entries) => {
  for (const entry of entries) {
    fitLabels(entry.target);
  }
});

for (const row of rows) {
  fitLabels(row);
  observer.observe(row);
}

// The page's fonts may finish loading a moment later, which changes how wide
// the text is. document.fonts.ready waits for that, then we measure again.
// Only then are the labels shown (CSS keeps them invisible until a row is "fitted"),
// so you never see them jump from "3 labels" to the right number.
function showAll() {
  rows.forEach(fitLabels);
  rows.forEach((row) => row.classList.add("fitted"));
}
document.fonts.ready.then(showAll);
// Safety net: if the fonts are very slow, don't keep the labels hidden for long
setTimeout(showAll, 1500);
