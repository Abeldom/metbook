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
// Every person's card has data-name
const cards = document.querySelectorAll(".person[data-name]");
// The "Search in:" switches: Names / Notes / Events / Labels
const scopeBoxes = [...document.querySelectorAll(".scope-option input")];
// The "3 people found" line below the "Sort by" row
const result = document.querySelector(".search-result");
const resultCount = document.querySelector(".search-result-count");
const resultText = document.querySelector(".search-result-text");
const noResults = document.querySelector(".no-results");const noResultsQuery = document.querySelector(".no-results-query");
// The sort buttons: they should keep the search text
const linksToUpdate = document.querySelectorAll(".seg a");
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

// The places to search in, e.g. ["name", "notes"]: the ticked "Search in:" switches
function chosenScopes() {
  return scopeBoxes.filter((box) => box.checked).map((box) => box.value);
}

// Show or hide the cards to match what's in the search box (and the limit)
function update() {
  const query = input.value.trim();
  const wanted = simplify(query);
  const scopes = chosenScopes();

  // matching = how many cards match the search so far
  let matching = 0;
  for (const card of cards) {
    // card.dataset.name reads the data-name="..." attribute from the HTML (data-notes,
    // data-events and data-labels work the same way). The card matches when the text is
    // in ANY of the chosen places. (An empty search matches everyone.)
    const matches = scopes.some((scope) => card.dataset[scope].includes(wanted));
    if (matches) {
      matching = matching + 1;
    }
    // Shown if it matches AND it's within the first `limit` matching cards
    card.hidden = !matches || matching > limit;
  }

  // Update the rest of the page.
  // The count line. Narrowed (by the text or by labels): "3 contacts found". Nothing narrowed:
  // "1114 contacts" (with a label filter on, only the people with those labels are on the page,
  // so the count is theirs). It is hidden only when a search finds nobody
  // (then the "No one matches" box says it).
  result.hidden = Boolean(query) && matching === 0;
  resultCount.textContent = matching;
  // "found" whenever the list is narrowed: by the search text, or by labels (applied by the server)
  const narrowed = Boolean(query) || result.dataset.labelsOn === "yes";
  resultText.textContent = (matching === 1 ? "contact" : "contacts") + (narrowed ? " found" : "");
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

// Switching a "Search in:" place on or off searches again at once.
// The last one can't be switched off (searching nowhere makes no sense):
// it is locked until you switch another one on.
function saveScopes() {
  const on = chosenScopes();
  for (const box of scopeBoxes) {
    box.disabled = on.length === 1 && box.checked;
  }
  // Remember the choice in a cookie ("name.notes"), so the page opens like this next time
  // (The "_2": the older cookie "search_in" held the old default and is ignored.)
  document.cookie = `search_in_2=${on.join(".")}; path=/; max-age=31536000; SameSite=Lax`;
}

for (const box of scopeBoxes) {
  box.addEventListener("change", () => {
    saveScopes();
    limit = pageSize;
    update();
  });
}
// A locked (disabled) checkbox isn't sent with a form: the "submit" below unlocks them first.
for (const box of scopeBoxes) {
  box.disabled = chosenScopes().length === 1 && box.checked;
}

// "Show more" is a normal link (it works without JavaScript too), but here
// we show the next cards right away instead of loading the page again
moreButton.addEventListener("click", (event) => {
  event.preventDefault();
  limit = limit + pageSize;
  update();
});

// The "Search" button (or Enter) runs the WHOLE search: the page loads again, and the server
// uses the search text AND the label buttons you ticked (they never search by themselves).
// The text still filters live while you type; this is the step that also applies the labels.
// Before the form is sent, unlock the locked "Search in" checkbox: a locked one isn't sent.
form.addEventListener("submit", () => {
  for (const box of scopeBoxes) {
    box.disabled = false;
  }
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

// Tell the CSS that live search is on (the form gets the class "is-live")
form.classList.add("is-live");

// When you open a person, remember exactly how this page looks, so the
// "Back to Contacts" link on their page can bring you back to it
// (static/js/return-to-people.js reads it).
// The address already holds everything: sort, label, search text and ?limit.
// We don't add "#person-79" to it: that would show a number in the address bar and
// mark the card. The scroll position (saved below) brings you back to the same spot.
// sessionStorage = a small notebook the browser keeps for this tab only;
// it's forgotten when the tab is closed.
grid.addEventListener("click", (event) => {
  // closest(): the card that was clicked (the click may land on its picture or name)
  const card = event.target.closest(".person[data-name]");
  if (!card) {
    return;
  }
  const address = new URL(location.href);
  address.hash = "";
  try {
    sessionStorage.setItem("peopleReturn", address.pathname + address.search + address.hash);
    // And how far down the page you were, so you come back to exactly the same spot
    // (return-to-people.js and keep-scroll.js use it)
    sessionStorage.setItem("peopleReturnScroll", String(Math.round(window.scrollY)));
  } catch (error) {
    // Some browsers block storage (e.g. strict private mode); then "Back" just opens /people
  }
});
