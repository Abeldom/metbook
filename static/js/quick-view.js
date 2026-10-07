// quick-view.js - click a person's card on the People page and a small window opens on top of
// the list with their details. A click on "Open full view" in it goes to the full page.
//
// How: the card is a normal link to the person's page. We catch the click, ask the server for a
// short piece of HTML (/contact/<id>/preview) and show it in a window. The People page stays where
// it is underneath: your scroll position, your search and your filters don't change.
// Without JavaScript the card is just a link to the full page, as before.
// Ctrl / Shift / Cmd + click, or a middle click, still opens the full page (in a new tab).

const grid = document.querySelector(".people-grid");

let overlay = null;        // the dark layer with the window, made the first time it's needed
let content = null;        // the place inside the window for the person's details
let opener = null;         // the card that was clicked: it gets the focus back when the window closes
let current = 0;           // which person is being shown, to ignore a slow answer for another one
const cache = new Map();   // id -> the HTML we already fetched (clicking the same person again is instant)

function build() {
  overlay = document.createElement("div");
  overlay.className = "quickview";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="quickview-panel" role="dialog" aria-modal="true" aria-labelledby="qv-name" aria-label="Contact details">
      <button type="button" class="quickview-close" aria-label="Close">×</button>
      <div class="quickview-content"></div>
    </div>`;
  document.body.append(overlay);
  content = overlay.querySelector(".quickview-content");

  overlay.querySelector(".quickview-close").addEventListener("click", close);
  // A click on the dark background (not on the window) closes it
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      close();
    }
  });
}

function close() {
  overlay.hidden = true;
  document.body.classList.remove("quickview-open");
  current = 0;
  if (opener) {
    opener.focus({ preventScroll: true });
  }
}

async function open(card) {
  if (!overlay) {
    build();
  }
  opener = card;
  const id = Number(card.id.replace("person-", ""));
  current = id;

  content.innerHTML = '<p class="qv-loading">Loading…</p>';
  overlay.hidden = false;
  document.body.classList.add("quickview-open");        // the page behind doesn't scroll
  overlay.querySelector(".quickview-close").focus();

  try {
    if (!cache.has(id)) {
      const response = await fetch(`/contact/${id}/preview`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      cache.set(id, await response.text());
    }
    if (current === id) {                               // you may have closed it or clicked another person
      content.innerHTML = cache.get(id);
    }
  } catch (error) {
    // Something went wrong (no connection, the person is gone): just open the full page
    window.location.href = card.href;
  }
}

if (grid) {
  grid.addEventListener("click", (event) => {
    const card = event.target.closest(".person");
    if (!card) {
      return;
    }
    // Let ctrl / shift / cmd clicks and middle clicks do their normal thing (open in a new tab)
    if (event.ctrlKey || event.shiftKey || event.metaKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    open(card);
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !overlay || overlay.hidden) {
    return;
  }
  // The picture viewer may be open above this window: Escape closes only that one first
  if (document.querySelector(".lightbox:not([hidden])")) {
    return;
  }
  close();
});
