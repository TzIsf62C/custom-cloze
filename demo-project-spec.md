# Demo Project Specification: CustomCloze (ES Module Edition)

**Goal:** A mobile-friendly browser app for custom cloze (fill-in-the-blank) language practice, built with plain HTML, CSS, and JavaScript ES Modules — no build tools, no framework, no installation required.

**Demo context:** This spec is the version used for a live coding demonstration. The architecture is chosen to be easy to explain to a non-coding audience: every file has a single, clearly-named job, and you can open the app by just opening `index.html` in a browser.

---

## Why ES Modules instead of a framework?

A framework like SvelteKit adds powerful features (server rendering, file-based routing, reactive stores), but it also adds a large number of generated and configuration files that are hard to navigate if you are new to coding.

This version achieves the same app features using only what the browser already knows how to run:

| Instead of… | We use… |
|---|---|
| SvelteKit routes (`+page.svelte`) | Plain `<section>` elements shown/hidden by JS |
| Svelte reactive stores | A simple session state object in `activity.js` |
| TypeScript | Plain JavaScript (same logic, no type annotations) |
| Tailwind CSS | A single hand-written `style.css` |
| Vite build step | Native `<script type="module">` — runs directly in the browser |

All data stays local in the user's browser. No server, no login, no internet connection required after the page first loads.

---

## 1. File Structure

```
customcloze/
├── index.html       ← The only HTML file. Contains all screen markup.
├── style.css        ← All styles. Mobile-first, readable on phones.
├── app.js           ← Entry point. Starts the app, switches screens.
├── db.js            ← Reads and writes words/history to the browser database.
├── engine.js        ← Picks words, masks sentences, builds the word bank.
├── activity.js      ← Runs the game screen (blanks, chips, grading).
├── manage.js        ← Runs the manage screen (add words, import CSV).
└── samples/
    ├── English.csv
    └── Chinese_Traditional.csv
```

**7 files total** (plus sample data). Each file is independent enough to explain on its own.

---

## 2. `index.html` — The App Shell

Contains the full page structure. JavaScript shows and hides elements rather than loading new pages.

### External libraries (loaded from CDN, before any module code)

```html
<script src="https://unpkg.com/dexie/dist/dexie.min.js"></script>
<script src="https://unpkg.com/papaparse/papaparse.min.js"></script>
```

Dexie.js wraps the browser's IndexedDB to make it easy to read and write data. PapaParse reads CSV files. Both are loaded before the app modules so they are available as globals (`Dexie`, `Papa`).

### Module entry point (at end of `<body>`)

```html
<script type="module" src="app.js"></script>
```

### `<body>` phase classes

`<body>` carries one of three classes at all times. CSS uses these classes to show/hide sections — JavaScript switches between them.

| Class on `<body>` | What is visible in `#screen-activity` |
|---|---|
| `phase-idle` | Category selector + Start button |
| `phase-active` | Sentence list + fixed word bank at bottom |
| `phase-graded` | Graded sentence list + Back / Score / Next row |

`<body>` starts with class `phase-idle`.

### Complete element inventory

Every `id` and important `class` used by JavaScript is listed here. The HTML must contain all of these.

#### Navigation

| Element | id | Notes |
|---|---|---|
| `<nav>` | `main-nav` | Fixed to screen bottom; hidden during `phase-active` and `phase-graded` |
| `<button>` inside nav | `nav-practice` | Switches to `#screen-activity` |
| `<button>` inside nav | `nav-manage` | Switches to `#screen-manage` |

#### Screens

| Element | id | Notes |
|---|---|---|
| `<section>` | `screen-activity` | Practice screen; visible by default |
| `<section>` | `screen-manage` | Manage screen; hidden by default |

Both sections carry the class `screen`. Only the visible one also carries the class `active`.

#### Inside `#screen-activity` — Idle phase (class `idle-only`, hidden unless `phase-idle`)

| Element | id | Notes |
|---|---|---|
| `<div>` wrapper | `idle-view` | Container; class `idle-only` |
| `<select>` | `cat-select` | Populated by `activity.js` with category options |
| `<button>` | `start-btn` | Triggers `startSession()` |
| `<p>` | `no-words-msg` | "No words found" message; shown only when `cat-select` is empty. Contains a link that calls `showScreen('screen-manage')`. Hidden by default. |

#### Inside `#screen-activity` — Active phase (class `active-only`, hidden unless `phase-active`)

| Element | id | Notes |
|---|---|---|
| `<div>` wrapper | `active-view` | Container; class `active-only` |
| `<div>` | `sentence-list` | Cleared and rebuilt by JS each session. Gets `padding-bottom: 220px` via JS after measuring the word bank height. |
| `<div>` | `word-bank-bar` | Fixed to screen bottom. Contains two rows: controls row and chips row. |
| `<button>` inside bar | `back-btn-active` | Calls `resetToIdle()`. Always enabled. |
| `<button>` inside bar | `check-btn` | Calls `checkAnswers()`. Disabled until all blanks are filled. |
| `<div>` inside bar | `chip-area` | Cleared and rebuilt by JS each session. Contains chip buttons. |

#### Inside `#screen-activity` — Graded phase (class `graded-only`, hidden unless `phase-graded`)

| Element | id | Notes |
|---|---|---|
| `<div>` wrapper | `graded-view` | Container; class `graded-only` |
| `<div>` | `graded-sentence-list` | Cleared and rebuilt by JS after grading. |
| `<button>` | `back-btn-graded` | Calls `resetToIdle()`. |
| `<span>` | `score-display` | e.g. `"Score: 4 / 5"` — set by JS after grading. |
| `<button>` | `next-btn` | Calls `startSession()` with the current category. |

#### Inside `#screen-manage`

| Element | id | Notes |
|---|---|---|
| `<button>` | `tab-manual` | Activates Manual Entry tab |
| `<button>` | `tab-csv` | Activates CSV Upload tab |
| `<button>` | `tab-samples` | Activates Samples tab |
| `<div>` | `panel-manual` | Manual entry form; visible when Manual tab active |
| `<div>` | `panel-csv` | CSV upload UI; visible when CSV tab active |
| `<div>` | `panel-samples` | Sample buttons; visible when Samples tab active |
| `<input type="text">` | `word-input` | Base dictionary form |
| `<select>` | `gramcat-select` | Category dropdown |
| `<label>` + `<input type="checkbox">` | `custom-cat-toggle` | Reveals custom category input when checked |
| `<input type="text">` | `custom-cat-input` | Hidden unless toggle is checked |
| `<div>` | `sentences-container` | Contains one or more sentence input rows |
| `<button>` | `add-sentence-btn` | Appends a new sentence input row |
| `<div>` (amber) | `sentence-format-hint` | Static hint box explaining `(parentheses)` format |
| `<button>` | `save-word-btn` | Submits the manual entry form |
| `<p>` | `save-status` | Success or error message after save |
| `<div>` | `drop-zone` | Drag-and-drop target for CSV files |
| `<input type="file">` | `csv-file-input` | File picker, `accept=".csv"` |
| `<p>` | `csv-status` | Import summary message |
| `<div>` | `sample-buttons` | Cleared and rebuilt when Samples tab opens |
| `<div>` | `saved-words-list` | Cleared and rebuilt after any DB change |

### Sentence input rows (inside `#sentences-container`)

Each row is a `<div class="sentence-row">` containing:
- `<input type="text" class="sentence-input">` — the sentence text
- `<button class="remove-sentence-btn">×</button>` — removes this row (disabled when only one row remains)

---

## 3. `style.css` — All Styles

### Screen and phase visibility

```css
/* Screens */
.screen { display: none; }
.screen.active { display: block; }

/* Phase-gated sections: hidden by default */
.idle-only, .active-only, .graded-only { display: none; }

/* Show the right section based on body class */
body.phase-idle    .idle-only    { display: block; }
body.phase-active  .active-only  { display: block; }
body.phase-graded  .graded-only  { display: block; }

/* Nav: hidden during in-session phases */
body.phase-active  #main-nav,
body.phase-graded  #main-nav     { display: none; }
```

### Fixed word bank

```css
#word-bank-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid #e5e7eb;
  padding: 8px;
  z-index: 40;
}
```

`#sentence-list` gets `padding-bottom` set dynamically by JS (see Section 7) so sentences are never hidden behind the bar.

### Touch targets

All `<button>` elements and `.chip` elements: `min-height: 44px; min-width: 44px; padding: 8px 12px;`

### Blank button states (applied by JS)

| Class | Meaning | Style |
|---|---|---|
| *(no class)* | Empty blank | Dashed border, grey, italic placeholder `_____` |
| `filled` | Chip placed, not yet graded | Solid blue border |
| `correct` | Graded correct | Green border + light green background |
| `incorrect` | Graded incorrect | Red border + light red background |

### Chip button states

| Class | Meaning | Style |
|---|---|---|
| *(no class)* | Available | White background, grey border |
| `used` | Placed in a blank | Opacity 0.4, `pointer-events: none` |

### Tab buttons

Active tab button: slightly darker background and a bottom border to indicate selection. `<div>` panels inside `#screen-manage` use `display: none` by default; the active panel gets `display: block`.

### Manage tab panels

```css
.manage-panel { display: none; }
.manage-panel.active { display: block; }
```

### Misc

* Max content width: `max-width: 640px; margin: 0 auto;` on all screens (centred on wide displays).
* `body { font-family: system-ui, sans-serif; background: #f9fafb; }`
* Sentence cards: `background: white; border-radius: 8px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);`
* The amber hint box: `background: #fffbeb; border: 1px solid #f59e0b; border-radius: 6px; padding: 10px; font-size: 0.85rem;`

---

## 4. `db.js` — The Database

Exports async functions. No other module touches `Dexie` directly.

### Database setup

```js
const db = new Dexie("CustomClozeDB");
db.version(1).stores({
  words:   "++id, word, gramCat",
  history: "++id, wordId, sentenceHash"
});
```

Note: `sentences` is not an indexed field — it is stored as a plain array in the word record.

### `words` table record shape

```js
{ id: 3, word: "run", gramCat: "Verb", sentences: ["She (runs) every morning.", "He (ran) fast."] }
```

### `history` table record shape

```js
{ id: 7, wordId: 3, sentenceHash: "abc123", status: "correct", lastReviewed: 1713456789000 }
```

`status` is one of `"never_reviewed"`, `"incorrect"`, `"correct"`.

`sentenceHash` is computed as:
```js
btoa(unescape(encodeURIComponent(wordId + "|" + sentenceText)))
```
The full raw sentence text (including parens) is used in the hash, so the same sentence always produces the same hash.

### Exported functions

```js
// Return all words. If gramCat is provided, filter to that category only.
export async function getWords(gramCat = null) {
  if (gramCat) return db.words.where("gramCat").equals(gramCat).toArray();
  return db.words.toArray();
}

// Return sorted list of all distinct gramCat values currently in the DB.
export async function getCategories() {
  const words = await db.words.toArray();
  return [...new Set(words.map(w => w.gramCat))].sort();
}

// Add a new word. sentences must be an array of strings.
export async function saveWord({ word, gramCat, sentences }) {
  return db.words.add({ word, gramCat, sentences });
}

// Delete a word and all its associated history records.
export async function deleteWord(wordId) {
  await db.history.where("wordId").equals(wordId).delete();
  await db.words.delete(wordId);
}

// Return all history records for a single word.
export async function getHistory(wordId) {
  return db.history.where("wordId").equals(wordId).toArray();
}

// Create or update the history record for one sentence.
// status must be "never_reviewed", "incorrect", or "correct".
export async function upsertHistory({ wordId, sentenceHash, status }) {
  const existing = await db.history
    .where({ wordId, sentenceHash })
    .first();
  if (existing) {
    await db.history.update(existing.id, { status, lastReviewed: Date.now() });
  } else {
    await db.history.add({ wordId, sentenceHash, status, lastReviewed: Date.now() });
  }
}
```

---

## 5. `engine.js` — Game Logic

Contains **no DOM code**. Imports from `db.js` only. Returns plain objects; the caller renders them.

### Exported function: `selectSentences(gramCat)`

Returns `{ sessionWords, wordBank }` or `null` if no words with maskable sentences exist in `gramCat`.

```js
export async function selectSentences(gramCat)
// Returns:
// {
//   sessionWords: SessionWord[],   // up to 5 items
//   wordBank:     BankChip[]       // correct answers + up to 2 distractors, shuffled
// }
// or null if no usable words found
```

#### `SessionWord` shape

```js
{
  wordId: 3,
  sentenceHash: "abc123",   // hash of the raw sentence text (with parens)
  parts: [
    { type: "text",  text: "She finally " },
    { type: "blank", answer: "achieved" },  // answer is the contextual form
    { type: "text",  text: " her goal." }
  ]
}
```

#### `BankChip` shape

```js
{ id: "chip-2", text: "achieved", isDistractor: false }
```

`id` is a unique string (`"chip-0"`, `"chip-1"`, …) used to link chips to blanks (see Section 7).

### Step-by-step algorithm

#### Step 1 — Bucket each word

For every word returned by `getWords(gramCat)`:

1. Call `maskSentence()` on each sentence. Discard sentences where it returns `null`. If a word has zero maskable sentences, skip the word entirely.
2. Fetch all `history` records for the word via `getHistory(wordId)`.
3. Build a `Map` from `sentenceHash → status` for quick lookup.
4. For each maskable sentence, look up its hash in the map. If not found, treat status as `"never_reviewed"`.
5. Assign the word to its bucket:
   - **Bucket 1** if any maskable sentence has status `"never_reviewed"`.
   - **Bucket 2** if no sentence is `"never_reviewed"` but at least one is `"incorrect"`.
   - **Bucket 3** otherwise (all `"correct"`).

#### Step 2 — Pick up to 5 words

```
shuffle(bucket1) → take from front until 5 selected or exhausted
shuffle(bucket2) → continue taking
bucket3: sort by Math.floor(lastReviewed / 86_400_000) ascending,
         then shuffle within equal days → continue taking
```

`lastReviewed` for a Bucket 3 word = the minimum `lastReviewed` among its `"correct"` sentences (i.e. the sentence reviewed least recently).

#### Step 3 — Pick one sentence per word

For each chosen word, collect its qualifying sentences (those whose status matches the bucket: `"never_reviewed"` for Bucket 1, `"incorrect"` for Bucket 2, any maskable sentence for Bucket 3). Shuffle that list. Try each sentence with `maskSentence()` until one succeeds (returns non-null). Use that result as the word's `parts`.

#### Step 4 — Build the word bank

1. For each of the (up to 5) session words, create one chip: `{ id: "chip-N", text: parts[blankIndex].answer, isDistractor: false }`.
2. Collect all words in the category that were **not** selected as session words. Shuffle them. For the first two that `getContextualForm()` returns a non-empty string for, create a chip: `{ id: "chip-N", text: contextualForm, isDistractor: true }`.
3. Shuffle the entire chip array.

#### Step 5 — Shuffle session words and return

```js
shuffle(sessionWords);
return { sessionWords, wordBank };
```

### Helper: `maskSentence(sentenceText)`

```js
// Returns an array of parts, or null if no (marker) found.
function maskSentence(sentenceText) {
  const match = sentenceText.match(/\(([^)]+)\)/);
  if (!match) return null;
  const before = sentenceText.slice(0, match.index);
  const answer = match[1];
  const after  = sentenceText.slice(match.index + match[0].length);
  const parts = [];
  if (before) parts.push({ type: "text", text: before });
  parts.push({ type: "blank", answer });
  if (after)  parts.push({ type: "text", text: after });
  return parts;
}
```

### Helper: `getContextualForm(word)`

```js
// Returns the first (marker) form found across the word's sentences.
// Falls back to word.word if none found.
function getContextualForm(word) {
  const shuffled = [...word.sentences].sort(() => Math.random() - 0.5);
  for (const s of shuffled) {
    const m = s.match(/\(([^)]+)\)/);
    if (m) return m[1];
  }
  return word.word;
}
```

### Helper: `shuffle(array)`

Fisher-Yates in-place shuffle. Returns the same array.

```js
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
```

---

## 6. Sentence Format — The `(parentheses)` Convention

All sentence strings must wrap the target word's contextual (inflected) form in parentheses.

**Example:** `"She finally (achieved) her goal after months of hard work."`

* Text before `(achieved)` → rendered as plain text.
* `(achieved)` → becomes the blank; `"achieved"` is the expected answer and the chip text.
* Text after `(achieved)` → rendered as plain text.

This works for any language. The engine needs no grammar knowledge.

**CSV format:**
```
word,category,sentences
achieve,Verb,She finally (achieved) her goal.|With hard work, you can (achieve) anything.
run,Verb,She (runs) every morning.|He (ran) as fast as he could.
```

Multiple sentences per word are separated by `|`. Each sentence must contain at least one `(...)` marker; only the first marker is used.

---

## 7. `activity.js` — The Game Screen

Exports one function: `initActivity()`. Manages all state for the practice screen internally.

### Module-level session state

```js
// Held in module scope — not exported
let currentSession = null;
// Shape while a session is active:
// {
//   gramCat: "Verb",
//   sessionWords: SessionWord[],
//   wordBank: BankChip[],
//   // Runtime state added during the session:
//   blanks: [
//     { sentenceIndex: 0, chipId: "chip-2" | null }
//     // one entry per blank across all sentences
//   ]
// }
```

### Session persistence (localStorage)

The active session is saved to `localStorage` under the key `"customcloze_session"` so a page refresh doesn't lose progress.

* **On save:** `localStorage.setItem("customcloze_session", JSON.stringify(currentSession))` — called every time a chip is placed or removed.
* **On restore:** At startup (inside `initActivity()`), check for a saved session and restore it before rendering.
* **On clear:** `localStorage.removeItem("customcloze_session")` — called when resetting to idle or moving to graded phase.

Only `phase-active` sessions are persisted. Graded results are not saved.

### `initActivity()` — called once by `app.js`

1. Attach click listener on `#start-btn` → calls `startSession()`.
2. Attach click listener on `#back-btn-active` → calls `resetToIdle()`.
3. Attach click listener on `#check-btn` → calls `checkAnswers()`.
4. Attach click listener on `#back-btn-graded` → calls `resetToIdle()`.
5. Attach click listener on `#next-btn` → calls `startSession()` with `currentSession.gramCat`.
6. Check `localStorage` for a saved session. If found, restore `currentSession` and call `renderActivePhase()`. If not, call `renderIdle()`.

`initActivity()` takes no arguments and returns nothing.

### `renderIdle()`

1. Populate `#cat-select` by calling `db.getCategories()`. Create one `<option>` per category.
2. If no categories exist, show `#no-words-msg` and hide `#cat-select` + `#start-btn`.
3. Set `document.body.className = "phase-idle"`.

### `startSession()`

1. Read the selected value from `#cat-select`. Store as `gramCat`.
2. Call `engine.selectSentences(gramCat)`.
3. If the result is `null` (no usable words):
   - Show `#no-words-msg`.
   - Return early (stay in idle phase).
4. Build `currentSession = { gramCat, sessionWords, wordBank, blanks: [] }`.
   - Populate `blanks`: one entry `{ sentenceIndex, chipId: null }` per blank part across all sentences (in display order).
5. Call `renderActivePhase()`.
6. Save to `localStorage`.

### `renderActivePhase()`

#### Render sentence list into `#sentence-list`

Clear `#sentence-list`. For each `SessionWord` (in array order):

1. Create a `<div class="sentence-card">`.
2. For each part:
   - `type: "text"` → `<span>` with `textContent = part.text`.
   - `type: "blank"` → `<button class="blank-btn">` with:
     - `data-sentence-index` = the word's index in `sessionWords`.
     - `data-blank-index` = index of this blank within that sentence's parts (there is only one blank per sentence, but using an index keeps addressing consistent).
     - If `currentSession.blanks` already has a `chipId` for this blank (restored from localStorage): set `textContent` to the chip's text and add class `filled`. Otherwise: `textContent = "_____"`.
     - Click handler: calls `tapBlank(sentenceIndex, blankIndex)`.
3. Append the card to `#sentence-list`.

#### Render chip buttons into `#chip-area`

Clear `#chip-area`. For each chip in `currentSession.wordBank`:

1. Create `<button class="chip">` with:
   - `data-chip-id` = chip's `id` (e.g. `"chip-2"`).
   - `textContent` = chip's `text`.
   - If this chip's `id` appears in any `blanks[i].chipId` (restored session): add class `used` and set `disabled = true`.
   - Click handler: calls `tapChip(chip.id)`.
2. Append to `#chip-area`.

#### Fix bottom padding

After rendering, measure `#word-bank-bar`'s height with `getBoundingClientRect()` and set `#sentence-list`'s `paddingBottom` to that value in pixels.

#### Switch phase

```js
document.body.className = "phase-active";
```

### Chip-to-blank linking

Each `blanks` entry holds the `chipId` of whichever chip is currently placed there (`null` if empty). This is the single source of truth for which chip is in which blank:

```js
currentSession.blanks = [
  { sentenceIndex: 0, chipId: "chip-2" },  // blank 0 is filled with chip-2
  { sentenceIndex: 1, chipId: null },       // blank 1 is empty
  // ...
]
```

Blank buttons hold their position in `data-sentence-index`. To find a blank's entry in `currentSession.blanks`, find the entry whose `sentenceIndex` matches.

### `tapChip(chipId)`

Called when a chip in `#chip-area` is tapped.

1. Find the first `blanks` entry where `chipId === null` (first empty blank).
2. If none found, return early (all blanks are filled — shouldn't happen since `#check-btn` is enabled at that point).
3. Set `blanks[i].chipId = chipId`.
4. Find the chip button with `data-chip-id === chipId`. Add class `used`. Set `disabled = true`.
5. Find the blank button for that blank (query `[data-sentence-index="${blanks[i].sentenceIndex}"]` inside `#sentence-list`). Set its `textContent` to the chip's text. Add class `filled`. Remove class `incorrect` and `correct` (shouldn't be set, but clean up).
6. If all blanks now have a non-null `chipId`, enable `#check-btn` (remove `disabled`).
7. Save to `localStorage`.

### `tapBlank(sentenceIndex)`

Called when a filled blank button is tapped (during `phase-active` only — graded taps are handled separately).

1. Find the `blanks` entry for this `sentenceIndex`.
2. If `chipId` is `null` (blank is empty), return early.
3. Remember the `chipId`. Set `blanks[i].chipId = null`.
4. Find the chip button with `data-chip-id === chipId`. Remove class `used`. Set `disabled = false`.
5. Find the blank button. Set `textContent = "_____"`. Remove class `filled`.
6. Disable `#check-btn` (add `disabled`).
7. Save to `localStorage`.

### `checkAnswers()`

1. Let `score = 0`.
2. For each entry in `currentSession.blanks`:
   - Find the chip with `id === entry.chipId`. Get its `text`.
   - Find the `parts` of the session word at `entry.sentenceIndex`. Get the blank part's `answer`.
   - Compare `chip.text.toLowerCase()` to `answer.toLowerCase()`.
   - If equal: `score++`.
3. Clear `localStorage`.
4. Call `renderGradedPhase(score)`.

### `renderGradedPhase(score)`

1. Clear `#graded-sentence-list`. For each session word (same order as in `renderActivePhase`):
   - Create a `<div class="sentence-card">`.
   - Render text parts as `<span>`.
   - Render the blank part as `<button class="blank-btn graded">` with the placed chip's text.
     - If correct: add class `correct`.
     - If incorrect: add class `incorrect`. Also append a `<div class="correct-answer-reveal" style="display:none">` containing the correct answer text. A click handler on the blank button toggles this div's `display`.
2. Set `#score-display` text to `"Score: ${score} / ${currentSession.sessionWords.length}"`.
3. Set `document.body.className = "phase-graded"`.

### `resetToIdle()`

1. `currentSession = null`.
2. `localStorage.removeItem("customcloze_session")`.
3. Call `renderIdle()`.

---

## 8. `manage.js` — The Manage Screen

Exports one function: `initManage()`. Takes no arguments and returns nothing.

### `initManage()` — called once by `app.js`

1. Attach click listeners for `#tab-manual`, `#tab-csv`, `#tab-samples` → call `showTab(panelId)`.
2. Attach click listener on `#add-sentence-btn` → appends a new sentence row.
3. Attach event listener on `#sentences-container` for clicks on `.remove-sentence-btn` elements → removes that row (using event delegation). Disable remove buttons when only one row remains.
4. Attach click listener on `#save-word-btn` → calls `handleSave()`.
5. Attach click listener on `#custom-cat-toggle` → toggles visibility of `#custom-cat-input`.
6. Attach `dragover` + `drop` listeners on `#drop-zone` → calls `handleCsvFile(file)`.
7. Attach `change` listener on `#csv-file-input` → calls `handleCsvFile(file)`.
8. Set Manual Entry as the default active tab: call `showTab("panel-manual")`.
9. Populate `#gramcat-select` by calling `db.getCategories()`.
10. Call `renderSavedWords()`.

### `showTab(panelId)`

Hide all `.manage-panel` elements. Show the one with `id === panelId` by adding class `active`. Update tab button styles (add/remove an `active-tab` class on the `#tab-*` buttons).

When `panelId === "panel-samples"`, also call `renderSampleButtons()`.

### `handleSave()`

1. Read `#word-input` value (trim). If empty, show error in `#save-status` and return.
2. Determine `gramCat`:
   - If `#custom-cat-toggle` is checked and `#custom-cat-input` is non-empty: use that value.
   - Else: use the selected value from `#gramcat-select`.
3. Collect all `.sentence-input` values (trim, filter empty).
4. If no sentences remain after filtering, show error in `#save-status` and return.
5. Call `await db.saveWord({ word, gramCat, sentences })`.
6. Show success message in `#save-status`.
7. Reset the form: clear `#word-input`, reset sentences to one empty row.
8. Call `renderSavedWords()` and refresh the category dropdown.

### Category dropdown refresh

After any save or delete, re-populate `#gramcat-select` and `#cat-select` (in `activity.js`) from `db.getCategories()`. Because `manage.js` should not reach into `activity.js`, the simplest approach is to export a `refreshActivityCategories()` function from `activity.js` and import it in `manage.js`, or to dispatch a custom DOM event `"db-updated"` that `activity.js` listens for and uses to refresh its dropdown.

Use the **custom DOM event approach**:
```js
// manage.js — after any save or delete:
window.dispatchEvent(new CustomEvent("db-updated"));

// activity.js — inside initActivity():
window.addEventListener("db-updated", renderIdle);
```

`renderIdle()` in `activity.js` already repopulates `#cat-select` from the DB, so this is sufficient.

### `handleCsvFile(file)`

1. Read the file with `Papa.parse(file, { header: true, skipEmptyLines: true, complete: result => { ... } })`.
2. Expect columns `word`, `category`, `sentences`.
3. For each row: split `sentences` on `|`, filter empty strings. If `word` or `category` is empty, count as an error row. Otherwise call `db.saveWord()`.
4. Set `#csv-status` text to `"Imported N words. M rows had errors."`.
5. Call `renderSavedWords()` and dispatch `"db-updated"`.

### `renderSampleButtons()`

Determines the import state of each sample file and renders buttons into `#sample-buttons`.

#### How "already imported" is determined

For each sample file:
1. `fetch("samples/English.csv")` (or whichever filename).
2. Parse the CSV with `Papa.parse()` to get a list of `{ word, category }` pairs.
3. Call `db.getWords()` to get all words currently in the DB.
4. Count how many DB words have both `word` and `gramCat` matching any pair from the CSV (case-sensitive exact match on both fields).
5. If count > 0: the sample is considered imported. Button label: `🗑️ ${count} English`.
6. If count === 0: not imported. Button label: `🌐 English`.

#### Button behaviour

* **Import click** (when not imported): parse the CSV, call `db.saveWord()` for each row, then call `renderSampleButtons()` and dispatch `"db-updated"`.
* **Delete click** (when imported): get all words from DB that match any `{ word, gramCat }` pair from the CSV, call `db.deleteWord(id)` for each, then call `renderSampleButtons()` and dispatch `"db-updated"`.

#### Hardcoded file list

```js
const SAMPLE_FILES = [
  { filename: "English.csv",           label: "English" },
  { filename: "Chinese_Traditional.csv", label: "Chinese Traditional" }
];
```

To add a new sample: place the CSV in `samples/` and add an entry to this array.

### `renderSavedWords()`

1. Call `db.getWords()` (no filter — all words).
2. Clear `#saved-words-list`.
3. If no words: show a `<p>No words saved yet.</p>`.
4. For each word, append a `<div class="word-row">` containing:
   - `<span class="word-text">` with `word.word`.
   - `<span class="gramcat-badge">` with `word.gramCat`.
   - `<span class="sentence-count">` with `${word.sentences.length} sentence(s)`.
   - `<button class="delete-word-btn" data-word-id="${word.id}">🗑️</button>` — click calls `db.deleteWord(word.id)`, then `renderSavedWords()`, then dispatches `"db-updated"`.

---

## 9. `app.js` — Entry Point

```js
import { initActivity } from "./activity.js";
import { initManage }   from "./manage.js";

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(screenId).classList.add("active");
}

document.getElementById("nav-practice").addEventListener("click", () => showScreen("screen-activity"));
document.getElementById("nav-manage").addEventListener("click",   () => showScreen("screen-manage"));

await initActivity();
await initManage();
```

Both `init` functions are async (they read from IndexedDB). Use top-level `await` (valid inside an ES module).

---

## 10. Edge Cases

| Situation | Behaviour |
|---|---|
| DB is empty when activity screen loads | `#cat-select` is empty; `#no-words-msg` is shown; `#start-btn` is hidden |
| `selectSentences()` returns `null` (all words in category have no `(...)` sentence) | Show `#no-words-msg` and stay in idle phase |
| Fewer than 5 words available in the category | Session contains however many are available (1–4); score denominator matches that count: `"Score: 2 / 3"` |
| Fewer than 3 words available (not enough for 2 distractors) | Word bank has fewer chips — as many correct answers as there are session words, plus as many distractors as are available (0, 1, or 2) |
| A sentence has no `(...)` marker | `maskSentence()` returns `null`; the sentence is skipped and another is tried |
| Word has no maskable sentences at all | Word is skipped by the selection engine; never appears in a session |
| All blanks correct | Score display: `"Score: 5 / 5"` (or actual count); `#next-btn` and `#back-btn-graded` are both available |
| Page refreshed during `phase-active` | Session restored from `localStorage`; chips and blanks re-rendered in their last state |
| Page refreshed during `phase-graded` | Nothing saved to localStorage in graded phase; app starts at `phase-idle` |
| CSV row missing `word` or `category` column | Counted as an error; skipped; reported in `#csv-status` |
| CSV row has no valid sentence (all pipe-split parts are empty) | Counted as an error; skipped |

---

## 11. Data Flow Summary

```
User taps "Start Session"
        │
        ▼
  activity.js → engine.selectSentences(gramCat)
                        │
                        ▼
                  engine.js → db.getWords(gramCat)
                               db.getHistory(wordId)  [per word]
                        │
                        ▼
              returns { sessionWords, wordBank }  or  null
        │
        ▼
  activity.js renders sentence cards + chip buttons
  Saves session to localStorage
        │
  User fills blanks (tapChip / tapBlank)
  Each change saved to localStorage
        │
  User taps "Check Answers"
        │
        ▼
  activity.js grades each blank
  db.upsertHistory() per sentence
  localStorage cleared
        │
        ▼
  Renders graded view
```

---

## 12. Adding New Sample Files

1. Place a `.csv` file in the `samples/` folder.
2. Add an entry to `SAMPLE_FILES` in `manage.js`.
3. No build step needed — the browser fetches it with `fetch()`.

The CSV must use the format described in Section 6.

---

## 13. Running the App

Because the app uses ES Modules, browsers require it to be served over HTTP (not opened as a raw local file). The simplest options:

* **VS Code:** Install the "Live Server" extension → right-click `index.html` → "Open with Live Server".
* **Python (built-in):** `python3 -m http.server 8000` then open `http://localhost:8000`.
* **Node.js:** `npx serve .` then open the URL shown.

No installation, build step, or configuration is needed beyond the above.
