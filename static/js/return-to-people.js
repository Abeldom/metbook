// return-to-people.js - every link back to the People list (the "People" menu,
// "Back to Contacts", "Cancel" on the forms) brings you back to the list exactly
// as you left it: the same sort, label, search text and number of cards, and
// scrolled to the same place.
//
// people-search.js saved the address and the scroll position in sessionStorage
// when you clicked a card. keep-scroll.js (on the People page) scrolls back there.
// If nothing is saved (e.g. you came from a bookmark), the links keep their
// normal address: /people.
// This runs on every page, but not on the People page itself: there, the "People"
// menu link should show the list from the top, as a fresh start.

if (location.pathname !== "/people") {
  let saved = null;
  let savedScroll = null;
  try {
    saved = sessionStorage.getItem("peopleReturn");
    savedScroll = sessionStorage.getItem("peopleReturnScroll");
  } catch (error) {
    // storage can be blocked by the browser; then the links stay as they are
  }

  // Only use it if it really is an address of the People page
  if (saved && saved.startsWith("/people")) {
    // [href="/people"] = the links that go to the plain People page
    for (const link of document.querySelectorAll('a[href="/people"]')) {
      link.href = saved;
      link.addEventListener("click", () => {
        try {
          sessionStorage.setItem("peopleRestoreScroll", savedScroll ?? "");
        } catch (error) {
          // not important: the page then just scrolls to the card (#person-...)
        }
      });
    }
  }
}
