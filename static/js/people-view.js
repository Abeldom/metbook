// people-view.js - the "Show: Labels / Notes / First met" switches on the People page.
//
// Each switch adds or removes a CSS class on the card grid (like "hide-notes"),
// and the CSS then hides that part on every card. The choice is also saved
// in a cookie, so the server draws the page the same way next time.

const grid = document.querySelector(".people-grid");
const switches = document.querySelectorAll(".view-option input");
// The server writes a number into the page that changes every time the server starts (data-boot).
// It goes into the cookies below, so a choice made before a restart of the server is not used any more.
const boot = grid.dataset.boot;

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
  //   SameSite=Lax           -> don't send it along when other sites link here in the background
  // No max-age: this is a "session cookie", forgotten when the browser is closed. So every time you
  // open the app again, "Show" starts from the default (Name and Notes), and what you switch
  // on or off stays only for this visit. It also starts again after the server was restarted:
  // the value is written as "<boot number>~<choice>" and the server ignores an old boot number.
  // (The number at the end goes up whenever the defaults change, so older cookies are ignored.)
  document.cookie = `people_view_4=${boot}~${others.join(".")}; path=/; SameSite=Lax`;

  // Notes have their own cookie ("1" = on, "0" = off), also forgotten when the browser is closed.
  document.cookie = `people_notes_now=${boot}~${chosen.includes("notes") ? 1 : 0}; path=/; SameSite=Lax`;
}

// The "Layout:" buttons (Compact / Large). Choosing one changes the class of the card grid
// ("layout-compact" or "layout-large"); the CSS does the rest. The choice is saved in a
// cookie for a year, and the server writes the class into the page the same way next time.
for (const radio of document.querySelectorAll('input[name="layout"]')) {
  radio.addEventListener("change", () => {
    grid.classList.remove("layout-compact", "layout-large");
    grid.classList.add(`layout-${radio.value}`);
    document.cookie = `people_layout=${radio.value}; path=/; max-age=31536000; SameSite=Lax`;
  });
}

for (const box of switches) {
  box.addEventListener("change", () => {
    // classList.toggle(name, on): add the class when "on" is true, remove it when false
    grid.classList.toggle(`hide-${box.value}`, !box.checked);
    saveChoice();
  });
}
