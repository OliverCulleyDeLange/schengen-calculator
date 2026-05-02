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

## Outstanding

Remaining items from the 2026-05-02 code review:

- **Full DOM rebuild on every interaction** — `renderCalendar` wipes `#calendar` and rebuilds all 25 months on every click, import, reset, or selection step. Use targeted updates or a virtualized list.
- **No linter / formatter** — Adopt ESLint + Prettier to catch issues earlier.
