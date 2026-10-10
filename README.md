# Typer.AI

Your words, less typing. A Chrome and Edge extension for document-grounded autocomplete: gray text at the cursor, **Tab** to accept, **Escape** to dismiss.

[Try the browser demo](https://mutms7.github.io/Typer.AI/) · [Architecture](docs/architecture.md) · [Deployment](docs/deployment.md) · [Privacy](public/privacy.html)

## Why this exists

When taking academic notes, the thought should still come from you. Repeated technical vocabulary should not make typing slower than thinking. Typer uses the active document and its title to offer familiar words and phrases. It does not generate a new argument or bring in outside material.

William Chenyin's architectural idea separates slow understanding from fast interaction: periodically send document excerpts to the server for vocabulary ranking, then let the local engine resolve prefixes and accept completions immediately. No model call sits on the typing path.

## Install

1. Download `typer-ai.zip` from the demo or [Releases](https://github.com/mutms7/Typer.AI/releases).
2. Unzip it. Open `chrome://extensions` or `edge://extensions`.
3. Enable Developer mode, choose **Load unpacked**, and select the folder containing `manifest.json`.
4. Refresh an ordinary writing page. Type a prefix of a term already in the document and press Tab when gray text appears.

This is an unpacked developer release, not a Chrome Web Store listing. The local build works immediately, offline, with no account or API key. Cloud-connected builds use an owner-operated server and ask for consent once in the popup. Users never supply an API key.

## Run locally

Requires Node.js 24 or newer. There are no third-party runtime dependencies.

```sh
npm run package
npm test
npm start
```

Open `http://127.0.0.1:8787` for the interactive demo. Load `dist/extension` in the browser for the actual extension. `npm run benchmark` measures engine lookup time separately from rendering and indexing.

## Features

- Vocabulary and short continuation evidence from the active document, with title weighting.
- A confidence slider that gates suggestions and phrase continuation. Confidence is a heuristic evidence score, not a calibrated probability.
- Native insertion where supported, with input events for editor integrations. Tab keeps its normal behavior when there is no suggestion.
- Escape dismissal, composition handling, selection checks, scroll positioning, paused sites, and a global off switch.
- Optional structured-output OpenAI vocabulary ranking in the background, validated against the original excerpt and title.
- Owner-only API key, exact-origin access policy, bounded excerpts and output, durable SQLite daily/monthly request budgets, per-IP limits, and concurrency control.
- No accounts, document persistence, telemetry, or writing history. Provider retention is governed by OpenAI's own policies.

## Compatibility

Supports ordinary text inputs, textareas, and `contenteditable` editors, including nested formatting where native insertion works. Dynamic fields are detected through delegated events. The extension runs in matching frames.

Google Docs and other canvas editors are not supported. Closed shadow-root editors, editors that reject native insertion, right-to-left ghost placement, browser-protected pages, and some heavily customized editors need dedicated adapters. No blanket compatibility claim is made for Notion, ProseMirror, or every React editor.

The first 30,000 characters are indexed locally. Long documents remain editable, but vocabulary outside that window may not be available. Completions are clipped at the visible editor boundary rather than wrapping gray text onto a potentially incorrect line.

## Cloud mode and costs

The API key goes only in the backend's `OPENAI_API_KEY` environment variable. Package a cloud-connected extension with `TYPER_API_URL=https://your-server.example` (no key in the extension). See [deployment instructions](docs/deployment.md).

Cloud mode is optional and off by default because excerpts leave the device. Excerpts refresh after an idle interval, no more than once every 45 seconds per active frame, and only when changed. Local completion continues if the provider is slow, offline, or over quota.

Request budgets are hard limits on reserved provider attempts. They are not exact dollar caps: pricing depends on the configured model and provider. The request and output bounds keep exposure predictable; set provider-side limits as well. Failed calls still consume a request allowance. The public endpoint does not treat CORS or extension IDs as authentication. Anonymous users can spoof origins, so abuse controls and global budgets are essential.

## Status

This repository includes a functional local extension, browser demo, tested shared-key backend, packaging, and CI/Pages workflows. Live cloud ranking requires the owner to provision the backend and set the key. No real API request was made during initial verification without an owner key. Resume adoption figures are not product telemetry and are not claimed here.

## License

MIT. See [LICENSE](LICENSE).
