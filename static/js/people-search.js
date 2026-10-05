// people-search.js - live search and "Show more" on the People page.
//
// JavaScript runs inside the browser (not on the server like Python).
// Every contact card is already on the page; while you type, this script
// hides the cards that don't match. Nothing is sent to the server, so it's instant.
// Of the matching cards, only the first `limit` are shown (50 at first);
// "Show more" raises the limit by another 50.

// Find the parts of the page we need. querySelector finds the first element
// matching a CSS selector; querySelectorAll finds all of them.
const form = document.querySelector(".search");
const input = form.querySelector('input[name="q"]');
const clearButton = form.querySelector(".search-clear");
const cards = document.querySelectorAll(".person[data-search]");
// The "3 people found" line under the search box
const result = document.querySelector(".search-result");
const resultCount = document.querySelector(".search-result-count");
const resultText = document.querySelector(".search-result-text");
const noResults = document.querySelector(".no-results");
const noResultsQuery = document.querySelector(".no-results-query");
// The sort buttons and the label buttons: they should keep the search text
const linksToUpdate = document.querySelectorAll(".seg a, .label-filter a");
const grid = document.querySelector(".people-grid");
const moreRow = document.querySelector(".show-more-row");
const moreButton = document.querySelector(".show-more");
const moreLeft = document.querySelector(".show-more-left");

// How many cards "Show more" adds, and how many are allowed right now.
// The server wrote both into the page: data-page-size="50" data-limit="50".
// Number(...) turns the text "50" into the number 50.
const pageSize = Number(grid.dataset.pageSize);
let limit = Number(grid.dataset.limit);

// Same idea as simplify() in database.py: lowercase, and remove accents.
// normalize("NFKD") splits "á" into "a" + an accent mark;
// the regular expression /\p{M}/gu matches all such marks, and we replace them with "".
function simplify(text) {
  return text.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "");
}

// Put a value into a URL, or take it out when it's empty:
//   withParam("/people?sort=name", "q", "anna") -> /people?sort=name&q=anna
function withParam(address, name, value) {
  const url = new URL(address, location.href);
  if (value) {
    url.searchParams.set(name, value);
  } else {
    url.searchParams.delete(name);
  }
  return url;
}

// Show or hide the cards to match what's in the search box (and the limit)
function update() {
  const query = input.value.trim();
  const wanted = simplify(query);

  // matching = how many cards match the search so far
  let matching = 0;
  for (const card of cards) {
    // card.dataset.search reads the data-search="..." attribute from the HTML
    const matches = card.dataset.search.includes(wanted);
    if (matches) {
      matching = matching + 1;
    }
    // Shown if it matches AND it's within the first `limit` matching cards
    card.hidden = !matches || matching > limit;
  }

  // Update the rest of the page.
  // "3 people found": only while searching, and not when nobody matches
  // (then the "No one matches" box says it)
  result.hidden = !query || matching === 0;
  resultCount.textContent = matching;
  resultText.textContent = matching === 1 ? "person found" : "people found";
  noResults.hidden = !(query && matching === 0);
  noResultsQuery.textContent = query;
  clearButton.hidden = !query;

  // "Show more" only when some matching cards are still hidden
  const remaining = Math.max(matching - limit, 0);
  moreRow.hidden = remaining === 0;
  moreLeft.textContent = `(${remaining} left)`;

  // Change the address bar without reloading, so refresh and Back keep the
  // search and the number of cards shown (?limit= only when it's more than 50)
  let address = withParam(location.href, "q", query);
  address = withParam(address, "limit", limit > pageSize ? limit : "");
  history.replaceState(null, "", address);

  // The sort and label buttons should keep the search too
  for (const link of linksToUpdate) {
    link.href = withParam(link.href, "q", query);
  }
}

// "input" fires on every change: typing, deleting, pasting.
// A new search starts again with the first 50 matches.
input.addEventListener("input", () => {
  limit = pageSize;
  update();
});

// "Show more" is a normal link (it works without JavaScript too), but here
// we show the next cards right away instead of loading the page again
moreButton.addEventListener("click", (event) => {
  event.preventDefault();
  limit = limit + pageSize;
  update();
});

// Results are already live, so Enter doesn't need to reload the page.
// Instead we just close the phone keyboard by taking the focus away.
form.addEventListener("submit", (event) => {
  event.preventDefault();
  input.blur();
});

// The × button is a normal link (so it also works without JavaScript),
// but here we clear the box on the spot instead of loading a new page.
clearButton.addEventListener("click", (event) => {
  event.preventDefault();
  input.value = "";
  limit = pageSize;
  update();
  input.focus();
});

// Tell the CSS that live search is on: it hides the "Search" button
form.classList.add("is-live");

// When you open a person, remember exactly how this page looks, so the
// "Back to Contacts" link on their page can bring you back to it
// (static/js/back-to-people.js reads it).
// The address already holds everything: sort, label, search text and ?limit.
// We add "#person-79" so the browser scrolls back to the card you opened.
// sessionStorage = a small notebook the browser keeps for this tab only;
// it's forgotten when the tab is closed.
grid.addEventListener("click", (event) => {
  // closest(): the card that was clicked (the click may land on its picture or name)
  const card = event.target.closest(".person[data-search]");
  if (!card) {
    return;
  }
  const address = new URL(location.href);
  address.hash = card.id;
  try {
    sessionStorage.setItem("peopleReturn", address.pathname + address.search + address.hash);
  } catch (error) {
    // Some browsers block storage (e.g. strict private mode); then "Back" just opens /people
  }
});
