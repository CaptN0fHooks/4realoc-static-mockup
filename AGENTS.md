# Repository Guidelines

## Project Structure & Module Organization
Each customer-facing page sits at the repository root (`index.html`, `buyers.html`, `search.html`, etc.) so edits stay easy to trace. Shared styling lives in `css/style.css`, while JavaScript is broken into focused modules under `js/` (`search-handler.js` orchestrates filters and UI, `property-api.js` handles Repliers requests, `map-handler.js` renders Leaflet maps, and `chatbot-handler.js` manages prompt wiring). Assets such as imagery, fonts, and mock data reside in `assets/`. Keep `test-*.html` prototypes current whenever you add new interactions—they act as quick regression sandboxes.

## Build, Test, and Development Commands
- `npm install` — Installs `http-server`, the only runtime dependency.
- `npm run serve` / `npm start` — Serves the site on http://localhost:8080 with caching disabled so API and asset changes appear immediately.
- `./serve.sh` (macOS/Linux) or `serve.bat` (Windows) — Shortcut scripts that mirror the npm command and are useful for non-Node contributors.
Run from the project root to avoid relative path issues.

## Coding Style & Naming Conventions
Use two-space indentation across HTML, CSS, and JS, and prefer single quotes in JavaScript to match existing files. Name new modules and assets in kebab-case (`feature-flags.js`, `hero-banner.jpg`) and keep DOM hooks prefixed consistently (`data-` attributes or `.js-*` classes). Extend the existing class-based patterns when expanding handlers; annotate complex logic with brief comments only where the intent is not obvious.

## Testing Guidelines
There is no automated test suite yet—follow `TESTING_CHECKLIST.md` for manual verification of hero carousels, search flows, and responsive states. Always serve the site (npm script or shell script above) before testing so CORS-sensitive API calls succeed; confirm mock-data fallback and map interactions in the browser console. Document tested pages, browsers, and key findings in your PR description.

## Commit & Pull Request Guidelines
Write commit subjects in the imperative mood (e.g., “Update search fallback messaging”); optional prefixes like `feat:` or `fix:` are acceptable when they clarify scope. For pull requests, provide a concise summary, list manual test results referencing the checklist, include before/after screenshots for visual tweaks, and link related issues or tickets. Flag any API key changes and note whether mocks or live data were exercised during review.

## API & Configuration Tips
`js/property-api.js` ships with a demo Repliers key for local work; replace it with environment-specific keys before deploying. Do not commit production secrets—coordinate with maintainers on secure storage and ensure the fallback mock data still functions whenever API integrations change.
