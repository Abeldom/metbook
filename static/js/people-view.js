// people-view.js - the "Show: Labels / Notes / First met" switches on the People page.
//
// Each switch adds or removes a CSS class on the card grid (like "hide-notes"),
// and the CSS then hides that part on every card. The choice is also saved
// in a cookie, so the server draws the page the same way next time.

const grid = document.querySelector(".people-grid");
const switches = document.querySelectorAll(".view-option input");

// Is this switch on in YOUR saved choice? A locked (disabled) switch, like
// First met while sorting by first met, is ticked for now, but your own choice
// for it is kept in data-saved="1" or "0"
function isChosen(box) {
  return box.disabled ? box.dataset.saved === "1" : box.checked;
}

function saveChoice() {
  // The code names of the switches that are on, e.g. "labels.firstmet" (Notes is kept apart)
  const chosen = [...switches].filter(isChosen).map((box) => box.value);
  const others = chosen.filter((name) => name !== "notes");

  // A cookie is a small piece of text the browser keeps for this site and
  // sends back to the server with every request.
  //   path=/                 -> for every page of the site
  //   max-age=31536000       -> keep it for one year (in seconds)
  //   SameSite=Lax           -> don't send it along when other sites link here in the background
  // (The number at the end goes up whenever the defaults change, so older cookies are ignored.)
  document.cookie = `people_view_3=${others.join(".")}; path=/; max-age=31536000; SameSite=Lax`;

  // Notes get a "session cookie" (no max-age): it is forgotten when the browser is closed,
  // so Notes start ticked again the next time you open the app. "1" = on, "0" = off.
  document.cookie = `people_notes_now=${chosen.includes("notes") ? 1 : 0}; path=/; SameSite=Lax`;
}

for (const box of switches) {
  box.addEventListener("change", () => {
    // classList.toggle(name, on): add the class when "on" is true, remove it when false
    grid.classList.toggle(`hide-${box.value}`, !box.checked);
    saveChoice();
  });
}
