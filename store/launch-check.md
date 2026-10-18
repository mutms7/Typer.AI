# Launch verification, October 18, 2026

The public Chrome Web Store listing is live at https://chromewebstore.google.com/detail/typerai/gfekhahompbphjlcadpjlmndnglkojnn. It shows version 0.1.8, updated October 18, 2026, the audited description, privacy disclosures, and an Add to Chrome button. The in-app browser itself can't perform a native Chrome installation. The private dashboard requested Google account verification; the public listing independently establishes publication.

The published CRX was downloaded from Google's update service, its publisher signature and extension ID were verified, and its seven core source/UI files matched the repository's 0.1.8 files. It was loaded in an isolated Edge profile for testing, with its public identity key restored to the unpacked manifest. All eight editor smoke checks and seven popup checks passed. The original optional host permission was retained. AI remained off with no saved opt-in when the headless browser couldn't complete the native permission prompt; the grant-and-refresh flow is not claimed as verified through that prompt.

The website and privacy page returned HTTP 200. The hosted /health and /ready endpoints returned HTTP 200 for 0.1.8, including a healthy database and configured provider. A separate live POST from the store origin, using disposable vector notes, returned HTTP 200 and 79 Gemini entries. This is a successful live provider check, distinct from readiness. It supersedes the transient Gemini high-demand failure observed at submission.

## Confirmed site-control bug and 0.1.9 fix

In the published build, Chrome/Edge could omit tab.url even though the content script was running on the active writing page. The popup then disabled the site-pause button. Content-script match patterns alone didn't make the URL available to the tabs query.

Version 0.1.9 asks the existing top-frame content script for its current hostname when tab.url is unavailable. It doesn't add tabs, activeTab, or any host permission. The response contains only the hostname, and restricted pages retain unavailable site controls. Existing preferences and pause/resume behavior are preserved.

All 45 Node tests pass, including regressions for a withheld tab URL, missing content script, and the hostname-only response. In an isolated Edge profile with the store ID, the fixed build passed the eight editor checks, seven popup checks, and three actual page-control checks: pause blocks acceptance, resume restores acceptance, and global disabling blocks acceptance.

The corrected package is built at dist/chrome-web-store/typer-ai.zip. Uploading the update requires completing Google verification in the developer dashboard. The launch follow-up must remain active until the corrected store version is published and any remaining launch checks are resolved. The website's main install link now points to the live store listing; the ZIP remains available for manual installation.
