# Chrome Web Store listing

## Product details

Name: Typer.AI

Summary: Complete words and short phrases from your draft as you type. Press Tab to accept gray text. Optional background AI vocabulary.

Category: Productivity, Tools

Language: English

Homepage: https://mutms7.github.io/Typer.AI/

Support: https://github.com/mutms7/Typer.AI/issues

Privacy: https://mutms7.github.io/Typer.AI/privacy.html

## Description

Less repeated typing in your notes, messages, and drafts.

Typer.AI offers word and short-phrase completions in supported browser writing fields. It uses a built-in common-word dictionary, vocabulary from your current draft, and optional AI vocabulary. Suggestions appear as gray text at your cursor when a matching completion is available.

While you write
Type the beginning of a word. Press Tab to insert the gray text, press Esc to dismiss it, or keep typing. Completions are chosen locally, so accepting a suggestion doesn't require a network request. Typer doesn't offer a suggestion for every word.

Choose how much help you want
Use Suggestion level in the popup to choose More suggestions, Balanced, or Fewer suggestions. Fewer filters for stronger matches; More can include related words and longer phrases. These are matching preferences, not measured accuracy scores. Turn Show completions off or pause Typer on a particular site at any time.

Optional background AI
Use background AI is off by default. When you enable it and grant access to the hosted service, Google Gemini suggests additional words and short phrases based on your draft's topic, purpose, and tone. Typer reuses that vocabulary locally between refreshes. It doesn't send a new AI request for each keystroke.

AI refreshes send an excerpt of the active draft (up to 6,000 characters) and a heading or page title (up to 300 characters) to Typer.AI's server and Google Gemini. No account or API key is required. The hosted Gemini project has billing enabled; its paid-service terms exclude using these prompts and responses to train Google's models. Refreshes wait for a pause in typing and may be delayed or unavailable. Local dictionary and document suggestions keep working without AI.

Data and controls
Your preferences are saved on your device. Document vocabulary stays in memory and resets when you switch editors or reload. Typer's server doesn't save draft excerpts or AI responses. Turning background AI off stops new uploads and clears its cached vocabulary. See the privacy policy for provider retention and connection-data details.

Where it works
Standard text inputs, textareas, and contenteditable writing fields. Google Docs and canvas-based editors aren't supported, and some custom web editors may be incompatible. Password fields and common sensitive input types are skipped.

To get started, install Typer.AI, refresh an existing writing page, and type a partial word in a supported field. You can try it on the website demo before installing.

Website and demo: https://mutms7.github.io/Typer.AI/
Privacy: https://mutms7.github.io/Typer.AI/privacy.html
Support: https://github.com/mutms7/Typer.AI/issues

## Single purpose

Provide document-grounded word and short-phrase autocomplete in supported browser writing fields, with local suggestions and optional background vocabulary ranking.

## Permission justifications

storage: Save the user's completion toggle, suggestion level, background AI opt-in, and paused-site preferences locally. No document text or writing history is saved to extension storage.

Host access (http://*/* and https://*/* content-script matches): Show suggestions and insert accepted text in supported writing fields on the sites where the user writes. Content scripts examine the active editor and its title/nearby heading to provide autocomplete, including supported editors in frames. Password fields and common sensitive input types are excluded. The extension doesn't collect browsing history or transmit page URLs.

Optional https://typer-ai.onrender.com/* host permission: Only after the user enables Use background AI and grants this permission, send a bounded document excerpt and heading or page title to the hosted ranking endpoint. Local completion works without this permission. No other remote host permission is requested.

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
4. Open the extension popup. Toggle Show completions, adjust Suggestion level, and pause/resume the site. More suggestions and Fewer suggestions are matching preferences, not calibrated probabilities.
5. For optional cloud vocabulary, enable Use background AI and grant access to https://typer-ai.onrender.com/. Use a disposable draft of at least 80 characters in a supported editor and wait until typing is idle. Refreshes are throttled to at least 45 seconds apart. The backend can take about a minute to wake from inactivity, with automatic bounded retries. Provider delays and failures don't stop local completion.
6. Turn Use background AI off to stop future uploads and clear cached AI vocabulary.

## Upload and identity

Build the direct download with `npm run package`. Build the store ZIP separately with `npm run package:store`, setting `TYPER_API_URL=https://typer-ai.onrender.com` for both commands. The store archive is `dist/chrome-web-store/typer-ai.zip`. It omits the unpacked-install key and installation text and doesn't replace the website download. No secrets are included.

Chrome Web Store item ID: gfekhahompbphjlcadpjlmndnglkojnn

Version 0.1.7 was submitted on October 16, 2026. The dashboard confirmed Pending review, with automatic publication after approval. The listing is free of charge and public in all available regions. Its submission includes the description, two screenshots, padded icon, small promotional tile, permission explanations, privacy disclosures, and reviewer instructions. Google flagged broad content-script host access for a potentially longer review; that access supports autocomplete across supported writing fields.

That review was canceled at the owner's request to audit the text. Version 0.1.8 was uploaded and submitted again on October 16, 2026, and the dashboard confirmed Pending review with automatic publication after approval. The popup, manifest, status messages, installation text, privacy policy, store description, permission explanations, and reviewer instructions now use the audited wording in [copy-audit.md](copy-audit.md). All 42 automated tests, eight installed-extension editor checks, and seven popup checks passed. The uploaded archive's SHA-256 is `c4b7eb5c634cf9ad60f09bd9e0d378ab5ff215d4c70d57bd8a98b4bb9564614e`.

The store version and unpacked release have different IDs. The backend must allow both exact extension origins. Before submission, verify the store origin's readiness/preflight, test the uploaded package locally, and confirm the public privacy page is deployed.

The owner confirmed on October 16, 2026 that billing is enabled for the Gemini project used by the hosted backend. Keep billing-enabled paid-service data handling in place while this cloud-enabled store version is offered.

Submission checks passed all 40 Node tests, all eight installed-extension browser smoke checks, and the store origin's backend liveness/readiness/preflight checks. The final live ranking probes hit Google's HTTP 503 high-demand response, surfaced as a recoverable HTTP 502 from the backend. This is a known provider-availability limitation at submission time, not a verified successful live ranking call. The extension retains local completion and its existing bounded retry behavior.

## Source requirements

- https://developer.chrome.com/docs/webstore/prepare
- https://developer.chrome.com/docs/webstore/images
- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
- https://ai.google.dev/gemini-api/terms
