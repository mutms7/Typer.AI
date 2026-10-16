# Chrome Web Store listing

## Product details

Name: Typer.AI

Summary: Your words, less typing. Document-grounded gray autocomplete with Tab to accept.

Category: Productivity, Tools

Language: English

Homepage: https://mutms7.github.io/Typer.AI/

Support: https://github.com/mutms7/Typer.AI/issues

Privacy: https://mutms7.github.io/Typer.AI/privacy.html

## Description

Keep the thought. Skip the repeated typing.

Typer.AI suggests familiar words and short phrases while you write in supported text fields. Suggestions appear as gray text beside your cursor. Press Tab to accept, or Escape to dismiss.

LOCAL COMPLETION
An offline dictionary and vocabulary from your active document power suggestions directly in your browser. Typing doesn't wait for an AI request, and local suggestions keep working without a connection.

OPTIONAL BACKGROUND AI
Enable Background AI ranking in the popup to refresh a small vocabulary cache with Google Gemini. Typer sends up to 6,000 characters of the active document and up to 300 characters of its title to its hosted service, which forwards them to Gemini. The hosted service uses a billing-enabled Gemini project; prompts and responses aren't used to train Google's models under its paid-service terms. Cloud mode is off by default and requires your permission. No account or API key is needed.

YOUR CONTROLS
Adjust prediction confidence, pause Typer on individual sites, or turn suggestions off. Document vocabulary stays in memory. The extension stores your preferences locally, and the Typer server doesn't save your document excerpts or AI responses.

WORKS WITH
Ordinary text inputs, textareas, and contenteditable editors. Google Docs and canvas-based editors aren't supported. The extension skips password fields and common sensitive input types.

GET STARTED
Install Typer.AI, refresh a supported writing page, and type a few letters of a word from your document. Keep typing to ignore a suggestion, press Tab to accept it, or press Escape to dismiss it. Optional AI refreshes can take longer when the free backend wakes from inactivity. Local completion remains available.

Website and demo: https://mutms7.github.io/Typer.AI/
Privacy: https://mutms7.github.io/Typer.AI/privacy.html
Support: https://github.com/mutms7/Typer.AI/issues

## Single purpose

Provide document-grounded word and short-phrase autocomplete in supported browser writing fields, with local suggestions and optional background vocabulary ranking.

## Permission justifications

storage: Save the user's enabled state, prediction confidence, cloud opt-in, and paused-site preferences locally. No document text or writing history is saved to extension storage.

Host access (http://*/* and https://*/* content-script matches): Show suggestions and insert accepted text in supported writing fields on the sites where the user writes. Content scripts examine the active editor and its title/nearby heading to provide autocomplete, including supported editors in frames. Password fields and common sensitive input types are excluded. The extension doesn't collect browsing history or transmit page URLs.

Optional https://typer-ai.onrender.com/* host permission: Only after the user enables Background AI ranking and grants this permission, send a bounded document excerpt and title to the hosted ranking endpoint. Local completion works without this permission. No other remote host permission is requested.

Remote code: No. All executable JavaScript is bundled with the extension. The backend returns validated vocabulary strings as JSON, which are treated as data and never executed.

## Data disclosures

Website content: Active-editor text, document title or nearby heading, processed locally and optionally sent for ranking.

Personal communications: The active editor may contain a user-authored message or email. Its excerpt is processed for the same autocomplete purpose only.

Personally identifiable information: The backend and hosting providers receive connection information such as IP addresses. The request-budget database stores a keyed hash of the IP, counts, and expiry times, not the raw IP or document text. User-authored document excerpts may also contain personal information.

Location: The dashboard explicitly classifies an IP address as location data. Select it for the backend/hosting connection IP processing and hashed request-budget identifiers. No GPS, precise-location permission, or geolocation feature is used.

Do not declare that no user data is handled. No advertising, sale of data, unrelated profiling, or general-purpose model training is performed. The current declaration selects personally identifiable information, personal communications, location (IP address), and website content. It doesn't select health, financial, authentication, browsing-history, or user-activity categories: the extension doesn't specifically collect those records, maintain a browsing-history list, or log keystrokes. Review the current form's exact definitions before certification.

## Reviewer test instructions

No login or API key is required.

1. Open https://mutms7.github.io/Typer.AI/editor-fixture.html and refresh after installing. This page doesn't load prediction scripts, so any suggestion comes from the installed extension.
2. Click Textarea notes, move to its end (the text ends in "A v"), and wait briefly. Gray text should offer a completion of "vector". Press Tab to accept. Undo should restore the original text.
3. Repeat and press Escape to dismiss instead of accepting. Test the Text input and Rich notes fields. Add a dynamic textarea using Add textarea.
4. Open the extension popup. Toggle suggestions, adjust Prediction confidence, and pause/resume the site.
5. For optional cloud ranking, enable Background AI ranking and grant access to https://typer-ai.onrender.com/. Use a disposable draft of at least 80 characters in a supported editor and wait until typing is idle. Refreshes are throttled to at least 45 seconds apart. The backend can take about a minute to wake from inactivity, with automatic bounded retries. Network failures don't stop local completion.
6. Turn Background AI ranking off to stop future uploads and clear cached AI vocabulary.

## Upload and identity

Build the direct download with `npm run package`. Build the store ZIP separately with `npm run package:store`, setting `TYPER_API_URL=https://typer-ai.onrender.com` for both commands. The store archive is `dist/chrome-web-store/typer-ai.zip`. It omits the unpacked-install key and installation text and doesn't replace the website download. No secrets are included.

Chrome Web Store item ID: gfekhahompbphjlcadpjlmndnglkojnn

Version 0.1.7 was submitted on October 16, 2026. The dashboard confirmed Pending review, with automatic publication after approval. The listing is free of charge and public in all available regions. Its submission includes the description, two screenshots, padded icon, small promotional tile, permission explanations, privacy disclosures, and reviewer instructions. Google flagged broad content-script host access for a potentially longer review; that access supports autocomplete across supported writing fields.

The store version and unpacked release have different IDs. The backend must allow both exact extension origins. Before submission, verify the store origin's readiness/preflight, test the uploaded package locally, and confirm the public privacy page is deployed.

The owner confirmed on October 16, 2026 that billing is enabled for the Gemini project used by the hosted backend. Keep billing-enabled paid-service data handling in place while this cloud-enabled store version is offered.

Submission checks passed all 40 Node tests, all eight installed-extension browser smoke checks, and the store origin's backend liveness/readiness/preflight checks. The final live ranking probes hit Google's HTTP 503 high-demand response, surfaced as a recoverable HTTP 502 from the backend. This is a known provider-availability limitation at submission time, not a verified successful live ranking call. The extension retains local completion and its existing bounded retry behavior.

## Source requirements

- https://developer.chrome.com/docs/webstore/prepare
- https://developer.chrome.com/docs/webstore/images
- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
- https://ai.google.dev/gemini-api/terms
