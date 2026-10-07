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

    // The buttons
    chooseButton.textContent = hasNew || hasCurrent ? "Upload new photo" : "Upload a photo";
    removeButton.hidden = !(hasNew || hasCurrent || removed);
    removeButton.textContent = hasNew ? "Discard" : removed ? "Undo" : "Remove photo";
  }

  // Put a file into the file input, the same as if it had been picked in the file window.
  // (A file input's list of files can't be changed directly: a DataTransfer builds a new one.)
  function setFile(file) {
    if (newUrl) {
      URL.revokeObjectURL(newUrl);
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

  removeButton.addEventListener("click", () => {
    if (input.files.length > 0) {
      setFile(null);                                 // "Discard": forget the new photo
    } else if (removeBox) {
      removeBox.checked = !removeBox.checked;        // "Remove photo" / "Undo" (edit page)
      render();
    }
  });

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
