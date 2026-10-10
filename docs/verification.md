# Initial verification

Verified locally on October 10, 2026 with Node.js 24.11.1 and Microsoft Edge driven through Playwright CLI.

## Automated checks

`npm test` passes 19 checks covering document-grounded completion, punctuation abstention, confidence-based phrase extension, ambiguous prefixes, cloud vocabulary isolation, case and Unicode behavior, mid-word safety, document reset, unfinished-prefix context backoff, provider response validation, quota persistence and HTTP endpoint behavior.

Provider tests inspect mocked Gemini and OpenAI request schemas. Real Gemini 3.5 Flash-Lite calls generated 80 statistics-note entries and 80 email entries for the public demo. These samples establish a working provider call, not general accuracy or production performance. Browser checks confirm Tab completion, undo, titles inside the draft, zero-width animation carets, left alignment and mobile layout.

## Installed extension checks

Loaded the packaged Manifest V3 extension in a persistent Edge profile. Its service worker started successfully. The test fixture loads no prediction scripts, so these checks exercise the installed content script rather than the demo's copy.

Verified textarea Tab completion, native undo, Escape dismissal, no continuation after `however,`, text-input completion, rich-text completion, dynamically added editor completion, and one active extension overlay. The popup loaded and reflected the local build's cloud-unavailable state. Global disabling was checked separately.

The browser smoke snippet is saved in `tests/browser-smoke.js`. Run with Playwright CLI's `run-code --filename=tests/browser-smoke.js` after loading the extension and opening `/editor-fixture.html`. It expects a fresh fixture and the default settings. It is not part of the dependency-free Node test command.

## Limits

No claim of compatibility with every web editor, a Web Store submission, a live shared cloud deployment, measured user adoption, calibrated probabilities, improved memory retention, or measured human writing speed is made. Engine microbenchmarks exclude rendering and network time.

## Modeled API request reduction

`node scripts/request-model.mjs` compares a 10-minute, single-editor session at 50 WPM (five characters per word) with one request per character. The baseline is 2,500 requests; a 45-second minimum refresh interval permits at most 14 background calls, including the initial call. That is a modeled 99.44% reduction. Idle delays and unchanged excerpts can reduce calls further. This is not production telemetry or a claim about writing speed, accuracy, or API cost. Switching editors starts a new refresh window.

The updated fixtures put their titles on the first line. Class Notes covers mean and median of five quiz scores. Browser checks verify ordinary `an` to `and` and `th` to `the` completion, repeated email vocabulary and mobile caret visibility. Provider tests cover the three-group schema and retain one- and two-letter function words. Stronger Gemini model trials returned service errors or timeouts; the published cache uses Gemini 3.5 Flash-Lite.
