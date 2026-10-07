// form-check.js - when you press Save and a required field is empty, say what is missing.
//
// The message appears right below the buttons ("Missing: Name, Date First Met"), and the cursor
// goes to the first empty field. It goes away by itself as you fill the fields in.
// (Without JavaScript the browser's own "Please fill out this field" bubble still does the job:
// the fields keep their "required" attribute. We only switch the bubble off, with noValidate,
// when this script is running.)

for (const form of document.querySelectorAll("form")) {
  const required = [...form.elements].filter((field) => field.required);
  if (required.length === 0) {
    continue;
  }
  form.noValidate = true;

  let message = null;   // the <p> under the buttons, made the first time it is needed

  // The name of a field = the text of its <label>, without the star ("Name *" -> "Name")
  function nameOf(field) {
    const label = form.querySelector(`label[for="${field.id}"]`);
    return label ? label.textContent.replace("*", "").trim() : field.name;
  }

  function emptyFields() {
    return required.filter((field) => field.value.trim() === "");
  }

  // Write (or take away) the message under the buttons
  function showMissing() {
    const missing = emptyFields();
    if (missing.length === 0) {
      if (message) {
        message.remove();
        message = null;
      }
      return;
    }
    if (!message || !message.isConnected) {   // (add-meeting.js's Cancel can remove it from the page)
      message = document.createElement("p");
      message.className = "form-missing";
      message.setAttribute("role", "alert");
      const buttons = form.querySelector(".form-actions, .meeting-form-buttons");
      (buttons || form).after(message);
    }
    message.textContent = `Missing: ${missing.map(nameOf).join(", ")}`;
  }

  form.addEventListener("submit", (event) => {
    const missing = emptyFields();
    if (missing.length > 0) {
      event.preventDefault();
      showMissing();
      missing[0].focus();
    }
  });

  // Fixing a field updates the message at once (only once it has been shown)
  form.addEventListener("input", () => {
    if (message) {
      showMissing();
    }
  });
}
