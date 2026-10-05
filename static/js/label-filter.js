// label-filter.js - the label buttons under "Advanced search".
//
// Each label button is a checkbox. Ticking one only marks it: the list is NOT searched until
// you press "Search" (the labels go along with the search text). This script shows the
// parts that only make sense with some labels ticked:
//   - "Any of these | All of these" when 2 or more labels are ticked,
//   - "Clear labels" when 1 or more is ticked (it un-ticks them all, without searching).

const boxes = [...document.querySelectorAll(".label-chip-box input")];
const actions = document.querySelector(".label-filter-actions");
const combine = document.querySelector(".label-match");
const clearButton = document.querySelector(".label-clear");

function refresh() {
  const ticked = boxes.filter((box) => box.checked).length;
  actions.hidden = ticked === 0;
  combine.hidden = ticked < 2;
}

for (const box of boxes) {
  box.addEventListener("change", refresh);
}

clearButton.addEventListener("click", () => {
  for (const box of boxes) {
    box.checked = false;
  }
  refresh();
});

refresh();
