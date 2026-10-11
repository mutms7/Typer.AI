# Typer.AI

Typer.AI is a Chrome and Edge Manifest V3 extension that suggests words and short phrases from the active document. Suggestions appear as gray text at the cursor, with Tab to accept, Escape to dismiss, and an adjustable confidence threshold.

The autocomplete engine in `extension/engine.js` combines an offline common-word dictionary with document vocabulary, title weighting, and preceding-word context. It resolves completions locally, so typing doesn't depend on a network request. `extension/editor.js` handles editor text, cursor positions, and insertion; `extension/content.js` connects the engine to writing fields and renders suggestions. The popup controls suggestions, confidence, optional AI ranking, and paused sites.

Optional background refreshes pass through the extension's service worker to the Node.js API in `server/`. The backend checks request limits, asks Gemini 3.1 Flash-Lite for relevant vocabulary and phrases, and returns validated entries for the extension to cache locally. The deployed backend runs in Docker on Render and stores transactional request counters in Supabase PostgreSQL. Local development uses SQLite.

The website in `public/` shares the extension's autocomplete engine. Its demo uses precomputed Gemini vocabulary for sample documents and runs locally in the browser. GitHub Pages hosts the website.

`tests/` covers the engine, refresh scheduling, API behavior, configuration, and request budgets. `scripts/` handles extension packaging, demo vocabulary generation, benchmarks, and deployment checks. GitHub Actions runs automated checks and publishes the website. `docs/` contains detailed architecture, deployment, and verification notes.
