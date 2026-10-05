// paste-picture.js - lets you paste a copied picture (Ctrl+V) into the
// "Picture" field of the Add and Edit Contact forms.
//
// When you paste anywhere on the page, the browser tells us what's on the
// clipboard. If it's a picture, we put it into the file input, exactly as if
// you had picked it with "Choose File", and show a small preview.
// (Pasting text, e.g. into Notes, keeps working as usual.)

const pictureInput = document.querySelector('input[type="file"][name="picture"]');
const preview = document.querySelector(".picture-preview");
const previewImage = preview.querySelector("img");
const previewText = preview.querySelector("span");

// File endings for the picture types a clipboard can hold
const EXTENSIONS = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp" };

// Show a small preview of the picture that's in the file input now
function showPreview(text) {
  const file = pictureInput.files[0];
  if (!file) {
    preview.hidden = true;
    return;
  }
  // createObjectURL makes a temporary address for a file that only exists in the browser
  previewImage.src = URL.createObjectURL(file);
  previewText.textContent = text;
  preview.hidden = false;
}

// Chosen with "Choose File" -> preview too
pictureInput.addEventListener("change", () => {
  showPreview("New picture: it's saved when you save the form.");
});

document.addEventListener("paste", (event) => {
  // The pasted files that are pictures of a type we accept
  const pictures = [...event.clipboardData.files].filter((file) => EXTENSIONS[file.type]);
  if (pictures.length === 0) {
    return;   // no picture (e.g. text): let the browser paste normally
  }
  event.preventDefault();

  // Give it a proper name with the right ending ("pasted.png"), because the
  // server checks the ending to know it's a picture
  const picture = pictures[0];
  const named = new File([picture], `pasted.${EXTENSIONS[picture.type]}`, { type: picture.type });

  // A file input's list of files can't be changed directly;
  // a DataTransfer builds a new list for us
  const files = new DataTransfer();
  files.items.add(named);
  pictureInput.files = files.files;

  showPreview("Pasted picture: it's saved when you save the form.");
});
