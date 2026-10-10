# Initial verification

Verified locally on October 10, 2026 with Node.js 24.11.1 and Microsoft Edge driven through Playwright CLI.

## Automated checks

`npm test` passes 35 checks covering document-grounded completion, punctuation abstention, confidence-based phrase extension, ambiguous prefixes, cloud vocabulary isolation, case and Unicode behavior, mid-word safety, document reset, unfinished-prefix context backoff, cached phrase reachability, provider response validation, production configuration validation, quota persistence and HTTP endpoint behavior. Content-script tests cover enabling cloud mode, delayed refreshes during the cooldown, failed-refresh retries, preserving vocabulary when confidence changes, clearing vocabulary on opt-out, and bounded retries after cloud failures. Remote quota tests cover hashed identifiers, database outage fallback, and concurrency while reservations are pending. Backend tests also verify readiness and deployment preflights without provider calls, allowed and denied origins, and missing-key fallback.

Provider tests inspect mocked Gemini and OpenAI request schemas. Real Gemini 3.1 Flash-Lite calls generated 80 statistics-note entries and 80 email entries for the public demo. These samples establish a working provider call, not general accuracy or production performance. Browser checks confirm Tab completion, undo, titles inside the draft, zero-width animation carets, left alignment and mobile layout.

## Installed extension checks

Loaded the packaged Manifest V3 extension in a persistent Edge profile. Its service worker started successfully. The test fixture loads no prediction scripts, so these checks exercise the installed content script rather than the demo's copy.

Verified textarea Tab completion, native undo, Escape dismissal, no continuation after `however,`, text-input completion, rich-text completion, dynamically added editor completion, and one active extension overlay. The popup loaded and reflected the local build's cloud-unavailable state. Global disabling was checked separately.

The browser smoke snippet is saved in `tests/browser-smoke.js`. Run with Playwright CLI's `run-code --filename=tests/browser-smoke.js` after loading the extension and opening `/editor-fixture.html`. It expects a fresh fixture and the default settings. It is not part of the dependency-free Node test command.

## Limits

No claim of compatibility with every web editor, a Web Store submission, measured user adoption, calibrated probabilities, improved memory retention, or measured human writing speed is made. Engine microbenchmarks exclude rendering and network time.

## Modeled API request reduction

`node scripts/request-model.mjs` compares a 10-minute, single-editor session at 50 WPM (five characters per word) with one request per character. The baseline is 2,500 requests; a 45-second minimum refresh interval permits at most 14 background calls, including the initial call. That is a modeled 99.44% reduction. Idle delays and unchanged excerpts can reduce calls further. This is not production telemetry or a claim about writing speed, accuracy, or API cost. Switching editors starts a new refresh window.

The updated fixtures put their titles on the first line. Class Notes covers mean and median of five quiz scores. Browser checks verify ordinary `an` to `and` and `th` to `the` completion, repeated email vocabulary and mobile caret visibility. Provider tests cover the structured vocabulary schema and exclude built-in standalone words while retaining phrases. The published cache uses Gemini 3.1 Flash-Lite.

On October 10, 2026, Render built the Docker image and deployed the free backend at https://typer-ai.onrender.com. Its readiness and extension-origin preflight checks passed. The dedicated Supabase quota table passed atomic counter checks; anonymous and authenticated roles cannot access the table or execute quota functions. A real extension background refresh of disposable mathematics notes returned HTTP 200 and 79 Gemini entries. Cloud mode was disabled afterward. The automated cloud test used a separate copy with its host permission already granted because headless Edge cannot complete the browser permission prompt. The published ZIP retains the optional permission and explicit popup opt-in. The original ZIP's local editor checks passed in Edge, including Tab, undo, Escape, rich text and dynamic editors.
