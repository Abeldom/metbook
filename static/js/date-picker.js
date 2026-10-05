// date-picker.js - two ways to fill in a date:
//   1. Type it in the text box (2026, 2026-09 or 2026-09-22), as always.
//   2. Tap the calendar button next to it: a small calendar opens.
//
// The mini calendar has three levels, and you choose how exact the date is:
//   Days    - tap a day                          -> 2026-09-22
//           - or "Use September 2026"            -> 2026-09     (no day)
//   Months  - (tap the title to get here) tap a month to see its days
//           - or "Use 2026"                      -> 2026        (no month, no day)
//   Years   - (tap the title again) tap a year to see its months
// The text box is still the one the server reads; the calendar only fills it in.

const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
                "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];   // the week starts on Monday
const YEARS_PER_PAGE = 12;

const CALENDAR_ICON = `
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
  </svg>`;

const pad = (number) => String(number).padStart(2, "0");

// A little helper: make an element, with a class and some text
function make(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

// A button inside the calendar. type="button" so it never saves the form.
function makeButton(className, text, onClick, label) {
  const button = make("button", className, text);
  button.type = "button";
  if (label) button.setAttribute("aria-label", label);
  button.addEventListener("click", onClick);
  return button;
}

function setUp(textBox) {
  const wrapper = make("div", "date-input");
  const openButton = make("button", "btn btn-secondary date-button");
  openButton.type = "button";
  openButton.innerHTML = CALENDAR_ICON;
  openButton.setAttribute("aria-label", "Choose the date from a calendar");
  openButton.setAttribute("aria-expanded", "false");
  openButton.title = "Choose from a calendar";

  const popup = make("div", "calendar");
  popup.hidden = true;
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-label", "Calendar");

  textBox.replaceWith(wrapper);
  wrapper.append(textBox, openButton, popup);

  // What the calendar is showing right now
  let view = "days";            // "days", "months" or "years"
  let year = new Date().getFullYear();
  let month = new Date().getMonth();      // 0 = January
  let yearPage = 0;             // first year of the page in the "years" view

  // Fill the text box and close
  function choose(text) {
    textBox.value = text;
    textBox.dispatchEvent(new Event("input", { bubbles: true }));
    close();
  }

  function close() {
    popup.hidden = true;
    openButton.setAttribute("aria-expanded", "false");
  }

  function open() {
    // Start where the typed date is (2026, 2026-09 or 2026-09-22); otherwise today
    const today = new Date();
    const [y, m] = textBox.value.trim().split("-");
    year = today.getFullYear();
    month = today.getMonth();
    if (/^\d{4}$/.test(y)) {
      year = Number(y);
      if (/^\d{2}$/.test(m) && Number(m) >= 1 && Number(m) <= 12) {
        month = Number(m) - 1;
      }
    }
    view = "days";
    render();
    popup.hidden = false;
    openButton.setAttribute("aria-expanded", "true");
  }

  // The top row: previous, a title you can tap to zoom out, next
  function header(title, onTitle, onPrevious, onNext, previousLabel, nextLabel) {
    const row = make("div", "calendar-head");
    row.append(
      makeButton("calendar-nav", "‹", onPrevious, previousLabel),
      makeButton("calendar-title", title, onTitle),
      makeButton("calendar-nav", "›", onNext, nextLabel),
    );
    return row;
  }

  function render() {
    popup.replaceChildren();
    const typed = textBox.value.trim().split("-");   // to mark the date that's typed now

    if (view === "days") {
      // Month ± 1; new Date() fixes the year by itself (month -1 = December last year)
      const step = (n) => { const d = new Date(year, month + n, 1); year = d.getFullYear(); month = d.getMonth(); render(); };
      popup.append(header(`${MONTHS[month]} ${year}`, () => { view = "months"; render(); },
                          () => step(-1), () => step(1), "Previous month", "Next month"));

      const grid = make("div", "calendar-grid");
      for (const name of WEEKDAYS) grid.append(make("span", "calendar-weekday", name));

      // getDay(): 0 = Sunday ... 6 = Saturday. We want Monday first, so Monday = 0.
      const blanks = (new Date(year, month, 1).getDay() + 6) % 7;
      for (let i = 0; i < blanks; i++) grid.append(make("span"));
      const lastDay = new Date(year, month + 1, 0).getDate();   // day 0 of next month
      const selected = typed.length === 3 && Number(typed[0]) === year && Number(typed[1]) === month + 1 ? Number(typed[2]) : 0;
      const today = new Date();
      for (let day = 1; day <= lastDay; day++) {
        const cell = makeButton("calendar-cell", String(day), () => choose(`${year}-${pad(month + 1)}-${pad(day)}`));
        if (day === selected) cell.setAttribute("aria-current", "true");
        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) cell.classList.add("is-today");
        grid.append(cell);
      }
      popup.append(grid);
      popup.append(makeButton("calendar-use", `Use ${MONTHS[month]} ${year} (no day)`, () => choose(`${year}-${pad(month + 1)}`)));

    } else if (view === "months") {
      popup.append(header(String(year), () => { yearPage = year - (year % YEARS_PER_PAGE); view = "years"; render(); },
                          () => { year--; render(); }, () => { year++; render(); }, "Previous year", "Next year"));
      const grid = make("div", "calendar-grid calendar-wide");
      MONTHS.forEach((name, i) => {
        const cell = makeButton("calendar-cell", name.slice(0, 3), () => { month = i; view = "days"; render(); });
        if (Number(typed[0]) === year && Number(typed[1]) === i + 1) cell.setAttribute("aria-current", "true");
        grid.append(cell);
      });
      popup.append(grid);
      popup.append(makeButton("calendar-use", `Use ${year} (no month)`, () => choose(String(year))));

    } else {
      const last = yearPage + YEARS_PER_PAGE - 1;
      popup.append(header(`${yearPage} – ${last}`, () => {},       // nothing to zoom out to
                          () => { yearPage -= YEARS_PER_PAGE; render(); }, () => { yearPage += YEARS_PER_PAGE; render(); },
                          "Earlier years", "Later years"));
      popup.querySelector(".calendar-title").disabled = true;
      const grid = make("div", "calendar-grid calendar-wide");
      for (let y = yearPage; y <= last; y++) {
        const cell = makeButton("calendar-cell", String(y), () => { year = y; view = "months"; render(); });
        if (Number(typed[0]) === y) cell.setAttribute("aria-current", "true");
        grid.append(cell);
      }
      popup.append(grid);
    }
  }

  openButton.addEventListener("click", () => (popup.hidden ? open() : close()));

  // Close with Escape, or by tapping anywhere outside the calendar
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !popup.hidden) {
      close();
      openButton.focus();
    }
  });
  // (composedPath = every element the click went through. We can't ask "is the clicked
  // button inside the calendar?" directly, because render() has already replaced it.)
  document.addEventListener("click", (event) => {
    if (!popup.hidden && !event.composedPath().includes(wrapper)) close();
  });
}

document.querySelectorAll("input[data-date-picker]").forEach(setUp);
