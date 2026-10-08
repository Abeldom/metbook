// label-filter.js - the label buttons under "Advanced search".
//
// Each label button is a checkbox. Ticking one only marks it: the list is NOT searched until
// you press "Search" (the labels go along with the search text). This script shows the
// parts that only make sense with some labels ticked:
//   - "Any of these | All of these" when 2 or more labels or places are ticked,
//   - "Clear filters" when 1 or more label or place is ticked (it un-ticks them all, without searching).
// It also tells you when the search options (the labels, Any / All and the "Search in:" switches)
// no longer match the list you are looking at: a note appears in the panel and the Search button
// pulses, until you press Search (the page then loads again with the new options, and the signs are gone).

const boxes = [...document.querySelectorAll('.label-chip-box input[name="label"]')];
const actions = document.querySelector(".label-filter-actions");
const combine = document.querySelector(".label-match");
const clearButton = document.querySelector(".label-clear");
const matchRadios = [...document.querySelectorAll('.label-match input[name="match"]')];
const pendingNote = document.querySelector(".search-pending");
const searchButton = document.querySelector(".search-submit");
const scopeBoxes = [...document.querySelectorAll(".scope-option input")];
// The pills of "Lives in" and "Originally from" look like the label pills but are not labels
const placeBoxes = [...document.querySelectorAll('.label-chip-box input[name="lives"], .label-chip-box input[name="origin"]')];   // "Search in:" Names / Notes / Meents / Labels

// What the options were when the page loaded = what the list on the screen was searched with.
// (The ticked label ids, Any / All and the "Search in:" places, as one piece of text to compare.)
function state() {
  const ids = boxes.filter((box) => box.checked).map((box) => box.value).join(",");
  const match = matchRadios.find((radio) => radio.checked);
  const places = scopeBoxes.filter((box) => box.checked).map((box) => box.value).join(",");
  const placeValues = placeBoxes.filter((box) => box.checked).map((box) => box.name + ":" + box.value).join(",");
  return ids + "|" + (match ? match.value : "") + "|" + places + "|" + placeValues;
}
const searchedWith = state();

function refresh() {
  const ticked = boxes.filter((box) => box.checked).length;
  const all = ticked + placeBoxes.filter((box) => box.checked).length;   // labels and places together
  actions.hidden = all === 0;
  combine.hidden = all < 2;

  // The sign: the options differ from what the list shows, so the list should be searched again
  const changed = state() !== searchedWith;
  pendingNote.hidden = !changed;
  searchButton.classList.toggle("needs-search", changed);
}

for (const box of boxes) {
  box.addEventListener("change", refresh);
}
for (const radio of matchRadios) {
  radio.addEventListener("change", refresh);
}
for (const box of scopeBoxes) {
  box.addEventListener("change", refresh);
}
for (const box of placeBoxes) {
  box.addEventListener("change", refresh);
}

clearButton.addEventListener("click", () => {
  for (const box of [...boxes, ...placeBoxes]) {
    box.checked = false;
  }
  refresh();
});

refresh();
