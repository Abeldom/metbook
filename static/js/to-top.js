// to-top.js - a small round button in the bottom right corner that takes you back to
// the top of the page. It only appears once you've scrolled down quite a bit.

const SHOW_AFTER = 600;   // how many pixels you must scroll down before the button appears

const button = document.querySelector(".to-top");

// Show or hide it depending on how far down the page is scrolled
function update() {
  button.classList.toggle("is-visible", window.scrollY > SHOW_AFTER);
}

button.addEventListener("click", () => {
  // Scroll up smoothly, unless the device is set to "reduce motion" (some people get dizzy)
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" });
});

// { passive: true } tells the browser we won't block the scrolling, so it stays smooth
window.addEventListener("scroll", update, { passive: true });
update();
