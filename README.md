# Typer.AI

Typer.AI is a Chrome and Edge Manifest V3 extension that suggests words and short phrases from the active document. Suggestions appear as gray text at the cursor, with Tab to accept, Escape to dismiss, and an adjustable suggestion level.

[Website and interactive demo](https://mutms7.github.io/Typer.AI/) · [Chrome Web Store](https://chromewebstore.google.com/detail/typerai/gfekhahompbphjlcadpjlmndnglkojnn) · [Manual download](https://github.com/mutms7/Typer.AI/releases/latest/download/typer-ai.zip) · [Privacy](https://mutms7.github.io/Typer.AI/privacy.html)

## Features

- Local autocomplete using an offline common-word dictionary, document vocabulary, title weighting, and preceding-word context.
- Gray-text suggestions with Tab acceptance, Escape dismissal, and adjustable suggestion level.
- Optional background Gemini refreshes that cache relevant words and phrases for local lookup.
- Popup controls to toggle suggestions, enable AI ranking, and pause individual sites.
- A browser demo that uses the same autocomplete engine as the extension.

## Tech stack

| Layer | Technology | Role |
| --- | --- | --- |
| Extension | JavaScript, Chrome/Edge Manifest V3 | Editor integration, gray-text overlays, settings, and background requests |
| Autocomplete | Shared JavaScript engine | Document indexing, prefix lookup, phrase matching, and candidate scoring |
| Website | HTML, CSS, JavaScript, GitHub Pages | Product site and local interactive demo |
| API | Node.js 24, built-in HTTP server | Request validation, quota enforcement, and AI provider calls |
| AI | Gemini 3.1 Flash-Lite | Background vocabulary and phrase ranking |
| Production database | Supabase PostgreSQL | Durable, transactional request budgets |
| Local database | Built-in Node.js SQLite | Request budgets during local development |
| Hosting | Docker, Render | Backend builds, HTTPS hosting, environment secrets, and health checks |
| Automation | GitHub Actions, Node.js test runner | Automated checks, extension packaging, and website deployment |

The application has no third-party runtime dependencies.

For editor layout regressions, install development dependencies with `npm ci`,
install the test browser with `npx playwright install chromium`, then run
`npm run test:browser`. These checks use an isolated browser and synthetic text;
they don't open your existing browser profile or personal documents.

## How it works

### Local completion

`extension/editor.js` reads editor text and cursor positions and handles insertion. `extension/content.js` connects writing fields to `extension/engine.js`, which combines the offline dictionary, words from the document, and any cached AI vocabulary. Candidates are scored using document frequency, title relevance, and the words preceding the cursor. Explicit word entries take priority over incidental words inside cached phrases.

The engine resolves suggestions locally as the user types. Accepting a suggestion inserts its remaining text at the cursor. Network availability doesn't affect this lookup path.

### Background AI refreshes

When users enable AI ranking, the extension waits for an idle period in an active document before requesting fresh vocabulary. Its Manifest V3 service worker sends a bounded document excerpt and title to `POST /api/rank`. Refreshes are throttled and cached rather than requested on every keystroke.

The Node.js backend validates the request, reserves its quota allowance, and asks Gemini for up to 80 relevant words and short phrases. It filters and validates the response before returning entries to the extension. Those entries become another input to the local autocomplete engine. Failed refreshes leave local suggestions available.

### Deployed backend

Render builds and runs the Node.js API in a Docker container at [typer-ai.onrender.com](https://typer-ai.onrender.com). Provider credentials stay in the server environment. The extension contains only the public backend URL.

Before each provider call, the backend reserves daily, monthly, and per-IP allowances through a Supabase PostgreSQL function. The counters update together in a transaction, so concurrent requests can't exceed a budget through competing reads. Supabase stores counts, expiry times, and hashed IP identifiers, not document text. If the quota store is unavailable, the backend rejects the refresh before calling Gemini. Local development uses SQLite for the same request-budget role.

`GET /health` checks process liveness. `GET /ready` also checks the quota database and whether a provider key is configured. Render uses readiness checks during deployment. The free service can sleep while inactive, so the first background refresh may take longer after a cold start.

### Website demo

The website shares the extension's autocomplete engine and uses precomputed Gemini vocabulary for its sample documents. Suggestions run in the browser without uploading visitor edits. GitHub Actions packages the shared engine files and publishes the static site to GitHub Pages.

See [the architecture documentation](docs/architecture.md) for scoring and refresh details.

## Install the extension

[Install Typer.AI from the Chrome Web Store](https://chromewebstore.google.com/detail/typerai/gfekhahompbphjlcadpjlmndnglkojnn), then refresh writing pages that were already open. The store version updates through the browser.

For a manual Chrome or Edge install:

1. [Download the latest ZIP](https://github.com/mutms7/Typer.AI/releases/latest/download/typer-ai.zip) and extract it into a folder you'll keep.
2. Open `chrome://extensions` or `edge://extensions` and enable Developer mode.
3. Choose **Load unpacked** and select the folder containing `manifest.json`.
4. Refresh a writing page, type a few letters, and press Tab when a gray suggestion appears.

Enable AI ranking in the popup to allow background document excerpts to reach the hosted backend and Gemini. Cloud mode is off by default and requires granting access to the backend. Users don't need their own API key.

The extension supports ordinary text inputs, textareas, and contenteditable editors. Google Docs and canvas-based editors aren't supported. Unpacked installations require manual updates by replacing the files and clicking **Reload** on the extensions page.

## Run locally

Requires Node.js 24+ and npm.

```powershell
git clone https://github.com/mutms7/Typer.AI.git
cd Typer.AI
npm run package
npm start
```

Open `http://127.0.0.1:8787` for the website. Load `dist/extension` as an unpacked extension to test local completion. A package built without `TYPER_API_URL` runs without live AI refreshes.

To test background refreshes against a local backend, copy `.env.example` to `.env`, set `GEMINI_API_KEY`, and add the extension origin to `ALLOWED_ORIGINS` alongside the local website origin:

```text
ALLOWED_ORIGINS=http://127.0.0.1:8787,chrome-extension://gneblpphgipcdhphnclghfmeoageenbg
```

Build the connected extension before starting the server:

```powershell
$env:TYPER_API_URL = 'http://127.0.0.1:8787'
npm run package
npm start
```

Load or reload `dist/extension`, then enable AI ranking in its popup. Keep `.env` local and ignored. Provider and database secrets belong only in the backend environment.

## Repository structure

| Directory or file | Purpose |
| --- | --- |
| `extension/` | Shared engine, editor integration, content script, service worker, popup, and manifest |
| `server/` | HTTP API, provider adapter, configuration, SQLite/Supabase quota stores, and database SQL |
| `public/` | Website, demo documents, precomputed vocabulary, and privacy page |
| `tests/` | Engine, refresh scheduling, API, configuration, and quota checks |
| `scripts/` | Packaging, benchmarks, vocabulary generation, and deployment checks |
| `docs/` | Architecture, deployment, and verification notes |
| `.github/workflows/` | Automated checks and GitHub Pages deployment |
| `Dockerfile`, `render.yaml` | Container build and Render service configuration |

## Build and checks

```powershell
npm test
npm run benchmark
npm run package
```

The tests cover candidate ranking, phrase reachability, refresh scheduling, request validation, provider failures, and quota persistence. Packaging copies the shared engine into the website and creates `dist/extension`, `dist/typer-ai.zip`, and the website download.

| Command | Purpose |
| --- | --- |
| `npm start` | Start the local API and website server |
| `npm test` | Run automated engine and backend checks |
| `npm run benchmark` | Run the modeled request benchmark |
| `npm run package` | Build the unpacked extension, ZIP, and website engine copies |
| `npm run package:store` | Build a separate Chrome Web Store ZIP with store-assigned identity |
| `npm run demo:vocabulary` | Regenerate sample vocabulary using the configured provider |
| `npm run deployment:check -- <api-origin> <allowed-origin>` | Check liveness, readiness, and origin permission without calling Gemini |

GitHub Actions runs checks and packaging. The Pages workflow publishes `public/`, while Render independently deploys backend changes from `main`.

## Deployment

The default `render.yaml` configures a free Render Docker service with Supabase for persistent quotas. `server/supabase-quota.sql` defines the database table and reservation functions. `render-sqlite.yaml` provides an optional configuration for hosting SQLite on a persistent disk.

For a hosted extension build, set `TYPER_API_URL` to the backend's HTTPS origin before packaging. Set the same public URL as a GitHub repository variable for the Pages build. See [deployment instructions](docs/deployment.md) for server configuration and [verification notes](docs/verification.md) for release checks.

Chrome Web Store submission assets, permission explanations, and reviewer instructions are in [`store/`](store/listing.md). The store build uses a separate extension ID from the unpacked download, and its exact origin must be allowed by the backend.

## Getting through Chrome Web Store review

Typer.AI runs content scripts on every site and reads the text in the active editor, so its first submission was flagged for a potentially longer review. Version 0.1.8 was submitted on October 16, 2026 and was live on October 18. Version 0.1.9, a bug fix, was submitted on October 18 and live on October 20. That's one extension's timeline, not a typical one.

What the submission did on purpose:

- **One required permission.** The manifest asks for `storage` only. The popup needs the current site's hostname for its pause control, which usually means adding `tabs`. It asks the content script that's already running on the page for the hostname, so no permission was added.
- **Optional access to the backend.** The hosted API is an optional host permission for one exact origin, requested when the user turns on AI ranking. Local completion works without it.
- **A specific justification for the broad host access.** It says what the content script reads, that password fields are skipped, and that page URLs and browsing history aren't collected.
- **A hosted test page for the reviewer.** The [reviewer instructions](store/listing.md#reviewer-test-instructions) point to a fixture page with text fields ready to type in, and give the expected result after each step.
- **Limits stated in the listing.** Google Docs and canvas editors aren't supported, and the description says so.

The full paperwork is in [`store/listing.md`](store/listing.md): the single purpose statement, each permission justification, the data disclosures, and the reviewer instructions. [`store/copy-audit.md`](store/copy-audit.md) lists the wording changes made before resubmitting.

If your own extension was rejected, the email names a two-word code such as "Purple Potassium". I wrote up what each one means in a separate repository: [Chrome Web Store rejection codes, in plain English](https://github.com/mutms7/chrome-web-store-rejection-codes).

## License

[MIT](LICENSE).
