// photo-picker.js - the "Photo" part of the Add and Edit Contact forms (replaces paste-picture.js).
//
// The page has a round picture (a "+" when there is none) and some buttons. The real form fields
// are two hidden-away inputs: the file input "picture" and, on the edit page, the checkbox
// "remove_picture". This script keeps the round picture, the buttons and the text in step with them:
//
//   no photo ............ round: "+"          buttons: Upload a photo
//   a new photo chosen .. round: the new one   buttons: Upload new photo, Discard
//   a photo exists ...... round: the current   buttons: Upload new photo, Remove photo
//   marked for removal .. round: "+"           buttons: Upload a photo, Undo
//
// Clicking the round picture: with a "+", the file window opens; with a picture, the picture opens
// full size on a dark background (the viewer in lightbox.js).
// You can also paste a copied picture anywhere on the page (Ctrl+V). Pasting text (into Notes,
// for example) keeps working as usual.

const root = document.querySelector("[data-photo-picker]");

if (root) {
  const input = root.querySelector('input[type="file"]');
  const removeBox = root.querySelector('input[name="remove_picture"]');   // only on the edit page
  const circle = root.querySelector("[data-photo-circle]");
  const image = circle.querySelector("img");
  const plus = circle.querySelector(".photo-picker-plus");
  const viewLink = root.querySelector("[data-photo-view]");   // a link nobody sees: "clicked" to open the viewer
  const actions = root.querySelector(".photo-picker-actions");
  const chooseButton = actions.querySelector("[data-photo-choose]");
  const removeButton = actions.querySelector("[data-photo-remove]");

  // "What shows in the frame": the picture in two frames that you drag, one for the BIG frames (4:3: the popup, the
  // large cards, a contact's page) and one for the SMALL ROUND picture (the compact cards). Each one keeps two percents
  // (0-100): where the picture is pointed. null = the default look (the CSS says 50% 20%).
  const position = root.querySelector("[data-photo-position]");
  const circleImage = circle.querySelector("img");

  function makeAdjuster(frame, kind, cssName) {
    const image = frame.querySelector("img");
    const xField = root.querySelector(`input[name="${kind}_x"]`);
    const yField = root.querySelector(`input[name="${kind}_y"]`);
    const number = (text) => (text === "" || text === undefined ? null : Number(text));
    return {
      frame, image, xField, yField, cssName,
      savedX: number(frame.dataset.currentX),     // what is saved for this contact
      savedY: number(frame.dataset.currentY),
      x: number(frame.dataset.currentX),
      y: number(frame.dataset.currentY),
    };
  }
  const adjusters = [
    makeAdjuster(root.querySelector('[data-photo-frame="big"]'), "photo", "--pos"),
    makeAdjuster(root.querySelector('[data-photo-frame="small"]'), "thumb", "--pos-small"),
  ];

  const currentSrc = root.dataset.currentSrc;       // the small copy of the current picture, or ""
  const currentFull = root.dataset.currentFull;     // the original of the current picture, or ""
  let newUrl = null;                                 // a temporary address for the chosen file

  // JavaScript works: show the round picture and the buttons, and tuck the plain file input away
  // (it still sends the file when you save: a hidden input is still part of the form)
  circle.hidden = false;
  actions.hidden = false;
  input.hidden = true;

  // Is a picture showing in the round picture right now? (and which one: the full-size address)
  function pictureShown() {
    if (input.files.length > 0) {
      return newUrl;
    }
    const removed = Boolean(removeBox && removeBox.checked);
    return currentSrc && !removed ? currentFull || currentSrc : "";
  }

  // Show the picture in the frames the way the positions say, and write them into the hidden fields of the form
  function applyPosition() {
    for (const adjuster of adjusters) {
      // The round picture of this form (the circle at the top) shows the small picture's position too
      const targets = adjuster.cssName === "--pos-small" ? [adjuster.image, circleImage] : [adjuster.image];
      if (adjuster.x === null || adjuster.y === null) {
        for (const target of targets) {
          target.style.removeProperty(adjuster.cssName);
        }
        adjuster.xField.value = "";
        adjuster.yField.value = "";
      } else {
        for (const target of targets) {
          target.style.setProperty(adjuster.cssName, `${adjuster.x}% ${adjuster.y}%`);
        }
        adjuster.xField.value = String(adjuster.x);
        adjuster.yField.value = String(adjuster.y);
      }
    }
  }

  function render() {
    const hasNew = input.files.length > 0;
    const removed = Boolean(removeBox && removeBox.checked);
    const hasCurrent = Boolean(currentSrc) && !removed;

    // The round picture
    const shown = hasNew ? newUrl : hasCurrent ? currentSrc : "";
    image.hidden = !shown;
    plus.hidden = Boolean(shown);
    if (shown) {
      image.src = shown;
      image.alt = hasNew ? "The new photo" : root.dataset.currentAlt;
    }
    circle.setAttribute("aria-label", shown ? "View the photo full size" : "Choose a photo");
    circle.title = shown ? "Click to see it full size" : "Choose a photo";
    circle.classList.toggle("has-picture", Boolean(shown));

    // The frame to drag the picture in (only with a picture). A different picture than before: the default look.
    position.hidden = !shown;
    for (const adjuster of adjusters) {
      if (shown && adjuster.image.getAttribute("src") !== shown) {
        adjuster.image.src = shown;
      }
    }
    applyPosition();

    // The buttons
    chooseButton.textContent = hasNew || hasCurrent ? "Upload new photo" : "Upload a photo";
    removeButton.hidden = !(hasNew || hasCurrent || removed);
    removeButton.textContent = hasNew ? "Discard" : removed ? "Undo" : "Remove photo";

    // Tell the form (form-changes.js listens) that the photo part has changed
    root.closest("form").dispatchEvent(new Event("photochange"));
  }

  // Put a file into the file input, the same as if it had been picked in the file window.
  // (A file input's list of files can't be changed directly: a DataTransfer builds a new one.)
  function setFile(file) {
    if (newUrl) {
      URL.revokeObjectURL(newUrl);
    }
    // A new picture has no position yet (the default look); with no new picture the saved position is back
    for (const adjuster of adjusters) {
      adjuster.x = file ? null : adjuster.savedX;
      adjuster.y = file ? null : adjuster.savedY;
    }
    if (file) {
      const files = new DataTransfer();
      files.items.add(file);
      input.files = files.files;
      newUrl = URL.createObjectURL(file);            // a temporary address, only inside this browser
      if (removeBox) {
        removeBox.checked = false;                   // a new photo replaces "remove"
      }
    } else {
      input.value = "";                              // empties the list of chosen files
      newUrl = null;
    }
    render();
  }

  // The round picture: a picture opens the viewer, a "+" opens the file window
  circle.addEventListener("click", () => {
    const address = pictureShown();
    if (address) {
      viewLink.href = address;                       // the viewer shows what the link points to
      viewLink.click();
    } else {
      input.click();
    }
  });
  // The "Upload a photo" / "Upload new photo" button always opens the file window
  chooseButton.addEventListener("click", () => input.click());
  // A file was picked in that window
  input.addEventListener("change", () => setFile(input.files[0] || null));

  // "Cancel" in the popup window resets the whole form. Then the round picture and the buttons must go back
  // to the saved photo too (a reset empties the file input by itself, but doesn't tell this script).
  root.closest("form").addEventListener("reset", () => {
    setTimeout(() => setFile(null), 0);   // after the reset has happened (it also un-ticks "remove_picture")
  });

  removeButton.addEventListener("click", () => {
    if (input.files.length > 0) {
      setFile(null);                                 // "Discard": forget the new photo
    } else if (removeBox) {
      removeBox.checked = !removeBox.checked;        // "Remove photo" / "Undo" (edit page)
      render();
    }
  });

  // Dragging the picture inside a frame. The picture fills the frame (object-fit: cover), so it can only move along
  // ONE direction: a tall picture up and down, a wide one left and right. Dragging by some pixels moves
  // the point of view by that many pixels: pixels -> percent of the part that sticks out of the frame.
  const DEFAULT_X = 50;
  const DEFAULT_Y = 20;

  function clamp(value) {
    return Math.min(100, Math.max(0, Math.round(value)));
  }

  function setupDragging(adjuster) {
    const { frame, image } = adjuster;

    // How many pixels the picture sticks out of the frame (sideways, up and down)
    function overflow() {
      const naturalWidth = image.naturalWidth;
      const naturalHeight = image.naturalHeight;
      if (!naturalWidth || !naturalHeight) {
        return { x: 0, y: 0 };
      }
      const box = frame.getBoundingClientRect();
      const scale = Math.max(box.width / naturalWidth, box.height / naturalHeight);
      return { x: naturalWidth * scale - box.width, y: naturalHeight * scale - box.height };
    }

    function moveBy(dx, dy) {
      const out = overflow();
      if (out.x < 1 && out.y < 1) {
        return;
      }
      const x = adjuster.x === null ? DEFAULT_X : adjuster.x;
      const y = adjuster.y === null ? DEFAULT_Y : adjuster.y;
      // Dragging the picture to the right shows more of its LEFT part: the point of view goes down in number
      adjuster.x = out.x >= 1 ? clamp(x - (dx / out.x) * 100) : x;
      adjuster.y = out.y >= 1 ? clamp(y - (dy / out.y) * 100) : y;
      applyPosition();
      root.closest("form").dispatchEvent(new Event("photochange"));
    }

    let dragFrom = null;
    frame.addEventListener("pointerdown", (event) => {
      dragFrom = { x: event.clientX, y: event.clientY };
      frame.setPointerCapture(event.pointerId);
    });
    frame.addEventListener("pointermove", (event) => {
      if (!dragFrom) {
        return;
      }
      moveBy(event.clientX - dragFrom.x, event.clientY - dragFrom.y);
      dragFrom = { x: event.clientX, y: event.clientY };
    });
    for (const end of ["pointerup", "pointercancel"]) {
      frame.addEventListener(end, () => {
        dragFrom = null;
      });
    }
    // The same with the keyboard (arrow keys, 5% each time), so it works without a mouse too
    frame.addEventListener("keydown", (event) => {
      const steps = { ArrowLeft: [5, 0], ArrowRight: [-5, 0], ArrowUp: [0, 5], ArrowDown: [0, -5] };
      const step = steps[event.key];
      if (!step) {
        return;
      }
      event.preventDefault();
      const out = overflow();
      moveBy((step[0] / 100) * out.x, (step[1] / 100) * out.y);
    });
  }
  adjusters.forEach(setupDragging);

  // File endings for the picture types a clipboard can hold
  const EXTENSIONS = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp" };

  document.addEventListener("paste", (event) => {
    const pictures = [...event.clipboardData.files].filter((file) => EXTENSIONS[file.type]);
    if (pictures.length === 0) {
      return;                                        // no picture (e.g. text): paste as usual
    }
    event.preventDefault();
    // Give it a proper name with the right ending ("pasted.png"): the server checks the ending
    const picture = pictures[0];
    setFile(new File([picture], `pasted.${EXTENSIONS[picture.type]}`, { type: picture.type }));
  });

  render();
}
