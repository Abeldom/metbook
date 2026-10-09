// people-view.js - the "Show: Labels / Notes / First met" switches on the People page.
//
// Each switch adds or removes a CSS class on the card grid (like "hide-notes"),
// and the CSS then hides that part on every card. The choice is also saved
// in a cookie (kept for a year), so the server draws the page the same way next time.

const grid = document.querySelector(".people-grid");
const switches = document.querySelectorAll(".view-option input");

// Is this switch on in YOUR saved choice? A locked (disabled) switch, like
// First met while sorting by first met, is ticked for now, but your own choice
// for it is kept in data-saved="1" or "0"
function isChosen(box) {
  return box.disabled ? box.dataset.saved === "1" : box.checked;
}

function saveChoice() {
  // The code names of the switches that are on, e.g. "name.notes.labels"
  const chosen = [...switches].filter(isChosen).map((box) => box.value);

  // A cookie is a small piece of text the browser keeps for this site and
  // sends back to the server with every request.
  //   path=/                 -> for every page of the site
  //   max-age=31536000       -> kept for a year (the same as the Layout choice), so "Show" looks the
  //                             same every time you open the app
  //   SameSite=Lax           -> don't send it along when other sites link here in the background
  document.cookie = `people_show_2=${chosen.join(".")}; path=/; max-age=31536000; SameSite=Lax`;
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

// Save what the page shows right now, too: after a fresh visit (see app.py) the page starts from the default,
// and the saved choice must follow, or the next page of the site would bring the old choice back.
saveChoice();
