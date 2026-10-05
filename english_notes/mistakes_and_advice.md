# English Learning Notes

This file tracks English language usage as we build the Metbook project.

## How to use this
- I note common grammar, vocabulary, or phrasing mistakes from your messages
- Each entry shows what you wrote, a corrected version, and why
- Review these between stages to improve your English while coding

---

## Stage 1-2 Notes (2026-09-22)

Your questions were clear and easy to understand:
- "is it better if i ask you questions here, or if i do everything in vscode?"
- "why is it good to use flask here?"

---

## Stage 3-4 Notes (2026-09-22 / 23)

### 1. Always capitalize "I"
- You wrote: "i added people html", "when i click on a person"
- Correct: "**I** added people.html", "when **I** click on a person"
- Why: In English, "I" (me) is always a capital letter, even in the middle of a sentence.

### 2. Apostrophes in short forms
- You wrote: "doesnt matter", "dont show", "its ok"
- Correct: "does**n't** matter", "do**n't** show", "**it's** OK"
- Why: The apostrophe replaces the missing letter: don't = do not, it's = it is.
- Careful: "its" (no apostrophe) means "belonging to it": "The app and its database."

### 3. "Big and small letters" → "uppercase and lowercase"
- You wrote: "big and small letters doesnt matter"
- Correct: "Uppercase and lowercase letters **don't** matter" or "Sorting should be case-insensitive"
- Why: The usual terms are "uppercase/lowercase" (or "capital/small letters"). The subject is plural (letters), so the verb is "don't", not "doesn't".

### 4. "its" vs "their" for people
- You wrote: "a new window opens with its details"
- Correct: "a new page opens with **their** details"
- Why: Use "its" for things and "their" (or his/her) for people.

### 5. Describing what you *want* (vs. what already happens)
- You wrote: "when i click on a person, a new window opens with its details."
- This sounds like it already happens. To ask for a feature, say:
  "When I click on a person, **I want** a new page **to open** with their details."

### 6. Commas between separate ideas
- You wrote: "dont show any preview details only the picture and the name"
- Correct: "Don't show any preview details, **only** the picture and the name."
- Why: A comma separates the two parts and makes the sentence easier to read.

### 7. Present perfect for things you just did
- You wrote: "now i changed the templates and the styles. Everything is ok?"
- More natural: "I've **changed** the templates and styles. **Is everything OK?**"
- Why: For a recent action that matters now, English often uses "have + past participle". Questions usually put the verb first: "**Is** everything OK?"

### 8. Informal numbers in writing
- You wrote: "Maybe we met 3x"
- Fine in chat. In more formal writing: "Maybe we've met **three times**."

### 9. "than" vs "then"
- You wrote: "when i click on add a meeting, than the add a meeting text should stay"
- Correct: "When I click on 'Add a meeting', **then** the 'Add a meeting' text should stay"
  (or simply leave "then" out: "When I click 'Add a meeting', the text should stay in place")
- Why: **then** = time or order ("first this, then that"). **than** = comparing ("bigger than", "faster than").
- Tip: when you quote a button's text, put it in quotes ('Add a meeting'), so the reader knows it's a name.

### 10. Articles: "a" / "the"
- You wrote: "why do i have contacts_backup db?"
- Correct: "Why do **I** have **a** contacts_backup database?"
- Why: a single countable thing (file, database, box, meeting) usually needs **a** (any one / first mention) or **the** (a specific one we both know).
  "I need **a** search box." / "**The** search box doesn't work."
- Hungarian often skips the article where English needs one, so this is a very common mistake for Hungarian speakers.

### 11. "more" vs "several"
- You wrote: "i want to be able to add photos for events. Not just one, but more"
- More natural: "I want to be able to add photos to meetings. Not just one, but **several**."
  (or: "...add **multiple** photos to each meeting")
- Why: **more** compares ("more than yesterday"). For "a number of them", use **several** or **multiple**.
- Also: you add photos **to** something (to a meeting, to an album).

### 12. Word order with "show me"
- You wrote: "when there are a lot of labels, then only some of them show me"
- Correct: "When there are a lot of labels, **show me only some of them**."
  (or: "...only some of them **should be shown**")
- Why: in English the verb comes early: **show me** + what. Hungarian can put the verb at the end ("csak néhányat mutass"), English can't.
- I first read your sentence as a bug report ("only some of them show up"), so word order really changes the meaning here.
- Also: "i mean when you list all the contacts" → "I mean **on the page that lists** all the contacts."

### 13. Asking for a change: "shouldn't" / "don't let it"
- You wrote: "the +11 dont show in a new line"
- Clearer: "The +11 **shouldn't go onto** a new line." or "**Don't let** the +11 **wrap** to a new line."
- Why: "the +11 doesn't show" sounds like a report (it's missing). To say how it *should* be, use **should / shouldn't**.
- Also: **on** a new line (not "in"), and "doesn't" for one thing (the +11 doesn't...).
- Useful word: text or boxes that jump to the next line **wrap**.

### 14. "do back" → "change it back" / "undo it"
- You wrote: "do back, i want the narrow style"
- Correct: "**Change it back**, I want the narrow style." or "**Undo that**, please." or "**Go back to** the narrow style."
- Why: English doesn't say "do back". To return something to how it was: **change it back**, **put it back**, **undo** (a change), **revert** (the programmer word).

### 15. Quotation marks
- You wrote: `,,first met"`
- In English: **"first met"** (or 'first met'). Both marks are at the top.
- Why: Hungarian opens quotes at the bottom („...”); English doesn't. On a keyboard, just type " twice.

### 16. "enough" comes AFTER the adjective
- You wrote: "The all is not enough descriptibe."
- Correct: "**'All'** isn't **descriptive enough**."
- Why: with adjectives, **enough** goes after: *big enough, clear enough, descriptive enough*.
  (With nouns it goes before: *enough time, enough labels*.)
- Also: when you talk about a word itself, put it in quotes and drop "the": **"All"** isn't clear.
- Spelling: descripti**v**e (with v).

---

## Vocabulary from the project
- **store**: save data ("we store contacts")
- **route**: a URL path that Flask handles
- **template**: a reusable HTML file with placeholders
- **case-insensitive**: uppercase and lowercase are treated the same
- **timeline**: a list of events in time order
- **mockup**: a picture of how a screen will look, before it's built

---

**Your progress:** Your messages are always understandable, which is what matters most. The most common fixes are capital "I" and apostrophes (don't, it's, doesn't). If you fix just those two, your writing will look much more polished.
