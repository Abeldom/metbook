// more-meetings.js - a contact's page shows only the newest meetings at first; "Show more" adds more,
// "Show less" goes back to the first ones.
//
// The server writes every meeting into the page, and marks all but the first 10 with the class
// "meeting-extra" (the CSS hides them, but only when JavaScript is on: without it everything is shown).
// Each press of "Show more" shows the next 10, and the "(N left)" counter goes down; at the end that
// button goes away. "Show less" appears as soon as more than the first 10 are showing, and hides
// everything beyond the first 10 again.
// A link to a hidden meeting (the address ends with #meeting-12, e.g. after saving a change to it) shows
// all the meetings up to that one, so the page can scroll there.

const moreButton = document.querySelector("[data-more-meetings]");
const lessButton = document.querySelector("[data-less-meetings]");

if (moreButton && lessButton) {
  const step = Number(moreButton.dataset.step);           // how many each press of "Show more" adds
  const firstPage = Number(moreButton.dataset.first);     // how many are showing at first (and after "Show less")
  const left = moreButton.querySelector(".more-meetings-left");
  const row = moreButton.closest(".more-meetings-row");
  const rows = [...document.querySelectorAll(".timeline .meeting")];

  // Show the right buttons: "Show more" while some are still hidden, "Show less" while more than
  // the first ones are showing
  function update() {
    const hidden = rows.filter((li) => li.classList.contains("meeting-extra")).length;
    left.textContent = `(${hidden} left)`;
    moreButton.hidden = hidden === 0;
    lessButton.hidden = rows.length - hidden <= firstPage;
    row.hidden = moreButton.hidden && lessButton.hidden;
  }

  // Show the next `count` hidden meetings
  function showMore(count) {
    for (const li of rows.filter((li) => li.classList.contains("meeting-extra")).slice(0, count)) {
      li.classList.remove("meeting-extra");
    }
    update();
  }

  moreButton.addEventListener("click", () => showMore(step));

  // Back to the first ones. The list gets much shorter, so the page is scrolled to the top of the
  // Meetings card; otherwise you could be left far below it.
  lessButton.addEventListener("click", () => {
    for (const li of rows.slice(firstPage)) {
      li.classList.add("meeting-extra");
    }
    update();
    document.querySelector(".timeline-head").scrollIntoView({ block: "start" });
  });

  // An address like ...#meeting-12 for a meeting that is still hidden: show everything up to it
  const target = location.hash ? document.getElementById(location.hash.slice(1)) : null;
  if (target && target.classList.contains("meeting-extra")) {
    while (target.classList.contains("meeting-extra")) {
      showMore(step);
    }
    target.scrollIntoView();
  }

  update();
}
