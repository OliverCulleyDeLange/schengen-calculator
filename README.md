# Schengen Calculator

A free-forever Schengen days calculator to track your 90/180 day visa-free visits to the Schengen Area.

MVP  vibe coded in a day cause i didn't wanna pay £4 a year for the app that suddenly wanted to start charging me to use it. sigh

### Features
- Simple, efficient date input, designed to make copying dates from your calendar easy
- Saves your dates to indexedDb on your browser
- Allows exporting and importing dates
- Progressive Web App, so you can add it to your home screen and 'install' it like an app

the code is jank, and inefficient, but it mostly works, so /shrug

### Running locally

It's just static files — serve the directory with anything:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

A local server (rather than `file://`) is required because the page
loads as ES modules and registers a service worker.

### Running tests

The test runner uses macOS's built-in JavaScriptCore — no Node, no npm:

```sh
./tests/run.sh
```

### Deploying

The site is deployed as static files (e.g. GitHub Pages from `main`).
Bump `CACHE_VERSION` in `service-worker.js` on every deploy so returning
clients pick up the new assets.

---

## Code Review — Fix List

A comprehensive review of the codebase as of 2026-05-02. Items are grouped by severity. File/line references use `path:line`.

### Critical (correctness / data integrity)

- [x] **Timezone bug in date persistence** — `db.js:38-39` saves dates with `toISOString()` (UTC), while dates are constructed locally via `new Date(year, month, day)` in `app.js:151`. For users in negative UTC offsets, a date created at local midnight serializes to the previous calendar day in UTC and round-trips back as the wrong day. Store as `YYYY-MM-DD` strings or as `{year, month, day}` to keep date-only semantics.
- [x] **Overlapping ranges are double-counted** — `app.js:241-248` only deletes ranges *fully contained* by the new selection. A partially overlapping range survives, and `calendarUtils.getDaysInWindow` (`calendarUtils.js:8-18`) sums each range independently, double-counting overlapping days. Merge or trim partial overlaps before saving.
- [x] **DST off-by-one in `getDaysBetween`** — `calendarUtils.js:50-53` divides ms diff by 86400000 and rounds. On DST transition days, two midnight-local dates can be 23 or 25 hours apart, producing off-by-one counts. Use `Date.UTC(y, m, d)` or pure y/m/d arithmetic.
- [x] **Service worker never invalidates on deploy** — `service-worker.js:1` uses a static `schengen-calculator-v1` cache name. JS/CSS edits won't reach users until the constant is bumped. Either bump the version on every release (build step) or use stale-while-revalidate for assets.
- [x] **Privacy page broken offline** — `service-worker.js:2-12` does not precache `/privacy/index.html`, so the linked privacy policy 404s offline.
- [x] **No navigation fallback in SW** — Cache-first match without `event.request.mode === 'navigate'` fallback to `/index.html` will fail for direct deep links offline.
- [x] **Import does not validate item shape** — `app.js:51-58` only checks `Array.isArray(imported)` and then trusts each item's `.start`/`.end`. Malformed input produces `Invalid Date` rows that poison IndexedDB.
- [x] **No IndexedDB schema versioning strategy** — `db.js:2` is `DB_VERSION = 1` with no migration path. Any future schema change will silently corrupt existing user data.

### High (UX / accessibility)

- [x] **No keyboard accessibility for day cells** — `app.js:172-211` creates `<div>` cells with click handlers only. No `tabindex`, `role="button"`, `aria-label`, or Enter/Space handling. Calendar is unusable with a keyboard or screen reader.
- [x] **Icon buttons missing `aria-label`** — `index.html:24, 61` rely on `title` only; SVGs have no `<title>` element. Screen readers announce nothing useful.
- [x] **Popover not announced** — `index.html:31` has no `role="dialog"`, `aria-modal`, `aria-labelledby`, or focus trap. Pressing Esc doesn't close it.
- [x] **Native `confirm()`/`alert()`** — `app.js:65, 67, 78` use blocking native dialogs. Replace with in-app modals for consistent UX.
- [x] **Inline `onclick` handlers** — `index.html:49` calls `handleExport()`/`handleImport()` via inline attributes, which forced the code in `app.js:22, 41` to leak globals onto `window`. Use `addEventListener` and remove the globals; this also unblocks a strict CSP later.
- [x] **Theme colors inconsistent** — `manifest.json:7` and `index.html:11` both declare `#1976d2`, but the actual UI gradient uses `#667eea`/`#764ba2` (`styles.css:3`). The browser chrome and splash will not match the app.

### Medium (performance / structure)

- [ ] **Full DOM rebuild on every interaction** — `renderCalendar` (`app.js:116`) wipes `#calendar` and rebuilds 25 months × ~30 days on every click, import, reset, and selection step. Use targeted updates or a virtualized list.
- [x] **Click handler per cell** — `app.js:208` attaches a listener to every day (~775 listeners). Use event delegation on `#calendar`.
- [x] **`getDaysInWindow` recomputed per cell** — `calendarUtils.js:2` is O(ranges) per day × O(days) cells per render = O(days × ranges) every render. Precompute a daily count array once per render.
- [x] **Date objects re-allocated repeatedly** — `calendarUtils.js` builds new `Date` instances for every range on every call; same in `app.js:215-222, 241-245`. Normalize ranges once after load.
- [x] **Reload-after-write pattern** — `app.js:59, 80, 251, 277` re-fetches all ranges from IndexedDB after every mutation. Update the in-memory array directly.
- [x] **Service worker missing `skipWaiting`/`clients.claim`** — `service-worker.js` requires closing every tab to pick up an update.
- [x] **External script lacks SRI and uses protocol-relative URL** — `index.html:83` loads `//gc.zgo.at/count.js` without integrity hash and with `//`. Use `https://` and `integrity=`/`crossorigin=` if GoatCounter publishes a hash. _Switched to `https://`. SRI not added: GoatCounter does not publish a stable hash._

### Low (style / polish)

- [x] **Duplicate CSS declarations** — `styles.css:5` and `:12` both set `min-height: 100vh`; `.calendar-day` declares `border` twice (`styles.css:75, 78`).
- [x] **Unused selector** — `.calendar-container::-webkit-scrollbar` (`styles.css:43`) targets a class that is not used in the markup.
- [x] **`isDateSelectedBoundary` exported but unused** — `calendarUtils.js:43` is dead code.
- [x] **`checkExceedsLimit` duplicates `getDaysInWindow`** — `calendarUtils.js:56-74` reimplements the same loop just to compare against 90; replace with `getDaysInWindow(...) > 90`.
- [x] **`splitRange` is a closure inside `handleDayClick`** — `app.js:261` would be clearer as a top-level function taking the range and date.
- [x] **Empty SW registration callbacks** — `index.html:75-79` swallow errors silently. Log failures.
- [x] **Manifest missing fields** — Add `id`, `scope`, `lang`, `categories`, and a maskable icon (`purpose: "any maskable"`) for better PWA install behavior on Android.
- [x] **No `.gitignore` entries for OS/editor cruft** — Verify `.DS_Store`, `node_modules/`, etc. are ignored if any tooling is added.
- [x] **No tests** — At minimum add unit tests for `calendarUtils.getDaysInWindow` (boundary cases, DST, overlapping ranges, empty input).
- [ ] **No linter / formatter** — Adopt ESLint + Prettier to catch the issues above earlier.
- [x] **README has no run/deploy instructions** — Add how to serve locally (e.g. `python -m http.server`) and how the PWA is deployed.
- [x] **No license file** — Add a LICENSE (MIT/Apache-2.0/etc.) so the "View code on GitHub" link is meaningful for forkers.
