## 4 Real OC · Property Search Flow

This repo powers a static marketing site with an interactive property search
experience. The homepage features an AI-style assistant that parses free-form
requests, persists the filters, and redirects to `search.html`, where a Leaflet
map, top-ten panel, and inline chat keep everything in sync.

### Requirements

- Node.js 18+ (for running lightweight tests and local tooling)
- An API key for the Repliers `website_search` product (`REPLIERS_API_KEY`)
- Optional: `npm install` (installs `http-server`, used by `npm run serve`)

### Local Development

1. **Install dependencies (optional, only needed for the helper script):**

   ```bash
   npm install
   ```

2. **Start a static dev server:**

   ```bash
   # vite/http-server both work; the repo ships a helper:
   npm run serve
   # or
   ./serve.sh            # macOS/Linux
   # or
   serve.bat             # Windows
   ```

   This serves the site at `http://localhost:8080` so the browser can load
   assets and avoid CORS issues.

3. **Proxy configuration (Repliers API):**

   - The browser never touches the Repliers API directly.
   - Deploy (or run locally) the serverless function in `api/website_search.ts`.
     It expects an environment variable named `REPLIERS_API_KEY`.
   - On Vercel: set the env var, then the static pages can call
     `/api/website_search?...`.

### Running Tests

Minimal unit tests cover the filter parser and API client. Run them with Node:

```bash
node tests/filters.test.mjs
node tests/api.test.mjs
```

### How the flow works

1. **Homepage (`index.html`)**
   - `js/homepage-search.js` listens to the AI assistant form.
   - `js/filters.js` parses “HB or Newport, under 1.2M, 3+ beds, pool” into
     structured filters.
   - Filters are stored in `sessionStorage` and serialised to query params, then
     the user is redirected to `search.html?...`.

2. **Search page (`search.html`)**
   - `js/search-page.js` hydrates filters from the URL/session and initialises:
     - `js/map.js` (Leaflet map with debounced bounds updates),
     - `js/api.js` (fetches through `/api/website_search`),
     - `js/filters.js` (parsing + serialisation helpers).
   - Results drive the map markers, top-ten grid, and inline chat. Map moves,
     chat refinements, or filter chips push updates back into the URL/session so
     the state is always shareable.
   - Search page styling is contained in `css/style.css` (layout specifics,
     skeleton loaders, chat styling, map popups, etc.).

3. **Serverless proxy (`api/website_search.ts`)**
   - Receives the filter query string and forwards it to Repliers with the
     injected `REPLIERS_API_KEY`.
   - Returns a normalised payload to keep the front-end agnostic of upstream
     changes.

### Security Notes

- Never expose the Repliers API key in client JavaScript.
- All listing calls should go through `/api/website_search`.
- The proxy intentionally limits accepted query parameters; extend
  `ALLOWED_PARAMS` if new filters are required.

### Quick Reference

| Task                        | Command / File                                  |
| --------------------------- | ------------------------------------------------|
| Run dev server              | `npm run serve`                                 |
| Parse filters / helpers     | `js/filters.js`                                 |
| Front-end API client        | `js/api.js`                                     |
| Map integration             | `js/map.js`                                     |
| Search page controller      | `js/search-page.js`                             |
| Homepage chat redirect      | `js/homepage-search.js`                         |
| Serverless proxy            | `api/website_search.ts`                         |
| Manual tests                | `node tests/filters.test.mjs` / `node tests/api.test.mjs` |

### Future Enhancements (TODOs)

- Expand the proxy to support listing detail endpoints and valuations so the
  legacy `property-api.js` can lose its mock fallbacks.
- Swap the rule-based parser for an LLM-powered interpreter for nuanced queries.
- Introduce saved searches, shareable URLs, and clustering for dense areas.
