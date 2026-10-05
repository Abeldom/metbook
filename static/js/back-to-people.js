// back-to-people.js - makes "Back to Contacts" on a person's page return to the
// People page exactly as you left it: the same sort, label, search text and
// number of cards, scrolled to the person you opened.
//
// people-search.js saved that address in sessionStorage when you clicked the card.
// If there's nothing saved (e.g. you opened this page from a bookmark), the link
// keeps its normal address: /people.

const link = document.querySelector(".back-to-people");

let saved = null;
try {
  saved = sessionStorage.getItem("peopleReturn");
} catch (error) {
  // storage can be blocked by the browser; then we keep the normal link
}

// Only use it if it really is an address of the People page
if (link && saved && saved.startsWith("/people")) {
  link.href = saved;
}
