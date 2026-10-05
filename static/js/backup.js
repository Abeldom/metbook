// backup.js - after you press "Download backup", the page stays where it is (the zip
// arrives as a download). So this script updates the "Last backup" line and shows a
// reminder to copy the zip somewhere safe.

const form = document.querySelector("#backup-form");
const status = document.querySelector("#backup-status");
const done = document.querySelector("#backup-done");

form.addEventListener("submit", () => {
  // The form is sent as normal (the browser downloads the file); we only change the text.
  // A little later, so the click itself isn't disturbed.
  setTimeout(() => {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    status.textContent = `Last backup: today, ${time}.`;
    status.classList.remove("is-old");
    done.hidden = false;
  }, 500);
});
