// lightbox.js - click a picture to see the WHOLE original on a dark background.
//
// Any link that has the attribute data-lightbox is handled here:
//   <a href="/uploads/photo.jpg" data-lightbox> <img src="/thumbs/photo.jpg"> </a>
// The small picture is only a preview; the link points to the original file.
// Links with the same value, e.g. data-lightbox="meeting-12", form a group: the viewer
// gets arrows (and the arrow keys) to go to the next and the previous picture.
// Without JavaScript, the link simply opens the original in the browser.

let overlay = null;       // the dark layer, made the first time it's needed
let picture = null;       // the <img> inside it
let counter = null;       // "2 / 5"
let previousButton = null;
let nextButton = null;
let group = [];           // the links of the group that is open
let current = 0;          // which one is showing
let opener = null;        // the link that was clicked: it gets the focus back at the end

function build() {
  overlay = document.createElement("div");
  overlay.className = "lightbox";
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Picture viewer");
  overlay.innerHTML = `
    <button type="button" class="lightbox-close" aria-label="Close">×</button>
    <button type="button" class="lightbox-nav lightbox-prev" aria-label="Previous picture">‹</button>
    <img class="lightbox-picture" alt="">
    <button type="button" class="lightbox-nav lightbox-next" aria-label="Next picture">›</button>
    <p class="lightbox-counter"></p>`;
  document.body.append(overlay);

  picture = overlay.querySelector(".lightbox-picture");
  counter = overlay.querySelector(".lightbox-counter");
  previousButton = overlay.querySelector(".lightbox-prev");
  nextButton = overlay.querySelector(".lightbox-next");

  overlay.querySelector(".lightbox-close").addEventListener("click", close);
  previousButton.addEventListener("click", () => show(current - 1));
  nextButton.addEventListener("click", () => show(current + 1));
  // A click on the dark background (not on the picture or a button) closes it
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      close();
    }
  });
}

// Show picture number `index` of the group (going past the end starts again at the other end)
function show(index) {
  current = (index + group.length) % group.length;
  const link = group[current];
  const small = link.querySelector("img");
  picture.src = link.href;                 // the ORIGINAL, not the small copy
  picture.alt = small ? small.alt : "";
  const several = group.length > 1;
  previousButton.hidden = !several;
  nextButton.hidden = !several;
  counter.hidden = !several;
  counter.textContent = `${current + 1} / ${group.length}`;
}

function open(link) {
  if (!overlay) {
    build();
  }
  opener = link;
  const name = link.getAttribute("data-lightbox");
  // A group: all the links with the same name. A single picture: just this link.
  group = name ? [...document.querySelectorAll(`a[data-lightbox="${CSS.escape(name)}"]`)] : [link];
  show(Math.max(group.indexOf(link), 0));
  // Inside a popup window (a <dialog>) the page behind is "inert" and the window sits above everything,
  // whatever the z-index. So the viewer is placed INSIDE the open window; otherwise it would be hidden behind it.
  (document.querySelector("dialog[open]") || document.body).append(overlay);
  overlay.hidden = false;
  document.body.classList.add("lightbox-open");   // the page behind doesn't scroll
  overlay.querySelector(".lightbox-close").focus();
}

function close() {
  overlay.hidden = true;
  picture.removeAttribute("src");          // stop loading a big picture nobody sees
  document.body.classList.remove("lightbox-open");
  if (opener) {
    opener.focus();
  }
}

// One listener for the whole page: it works for links added later too
document.addEventListener("click", (event) => {
  const link = event.target.closest("a[data-lightbox]");
  // Let ctrl/shift/middle clicks do their normal thing (e.g. open in a new tab)
  if (!link || event.ctrlKey || event.shiftKey || event.metaKey || event.button !== 0) {
    return;
  }
  event.preventDefault();
  open(link);
});

document.addEventListener("keydown", (event) => {
  if (!overlay || overlay.hidden) {
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();   // closes only the viewer, not also the popup window under it
    close();
  } else if (event.key === "ArrowLeft" && group.length > 1) {
    show(current - 1);
  } else if (event.key === "ArrowRight" && group.length > 1) {
    show(current + 1);
  }
});
