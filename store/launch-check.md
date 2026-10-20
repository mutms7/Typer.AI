# Launch verification, October 18, 2026

The public Chrome Web Store listing is live at https://chromewebstore.google.com/detail/typerai/gfekhahompbphjlcadpjlmndnglkojnn. It shows version 0.1.8, updated October 18, 2026, the audited description, privacy disclosures, and an Add to Chrome button. The in-app browser itself can't perform a native Chrome installation. The private dashboard requested Google account verification; the public listing independently establishes publication.

The published CRX was downloaded from Google's update service, its publisher signature and extension ID were verified, and its seven core source/UI files matched the repository's 0.1.8 files. It was loaded in an isolated Edge profile for testing, with its public identity key restored to the unpacked manifest. All eight editor smoke checks and seven popup checks passed. The original optional host permission was retained. AI remained off with no saved opt-in when the headless browser couldn't complete the native permission prompt; the grant-and-refresh flow is not claimed as verified through that prompt.

The website and privacy page returned HTTP 200. The hosted /health and /ready endpoints returned HTTP 200 for 0.1.8, including a healthy database and configured provider. A separate live POST from the store origin, using disposable vector notes, returned HTTP 200 and 79 Gemini entries. This is a successful live provider check, distinct from readiness. It supersedes the transient Gemini high-demand failure observed at submission.

## Confirmed site-control bug and 0.1.9 fix

In the published build, Chrome/Edge could omit tab.url even though the content script was running on the active writing page. The popup then disabled the site-pause button. Content-script match patterns alone didn't make the URL available to the tabs query.

Version 0.1.9 asks the existing top-frame content script for its current hostname when tab.url is unavailable. It doesn't add tabs, activeTab, or any host permission. The response contains only the hostname, and restricted pages retain unavailable site controls. Existing preferences and pause/resume behavior are preserved.

All 45 Node tests pass, including regressions for a withheld tab URL, missing content script, and the hostname-only response. In an isolated Edge profile with the store ID, the fixed build passed the eight editor checks, seven popup checks, and three actual page-control checks: pause blocks acceptance, resume restores acceptance, and global disabling blocks acceptance.

The corrected package is built at dist/chrome-web-store/typer-ai.zip. After Google verification, version 0.1.9 was uploaded and submitted on October 18, 2026 with automatic publication after approval enabled. The developer dashboard confirmed Pending review, draft version 0.1.9 (revision 00003), and published version 0.1.8. The launch follow-up remains active until the corrected store version is published and any remaining launch checks are resolved. The website's main install link now points to the live store listing; the ZIP remains available for manual installation.

## Published 0.1.9 verification, October 20, 2026

The public listing now shows version 0.1.9, updated October 20, 2026, and Add to Chrome. Google's downloaded CRX3 passed publisher-signature and extension-ID verification. Its seven core source/UI files match the repository. The signed payload was loaded in an isolated Edge profile with only its public identity key restored for unpacked loading. This verifies the distributed code, not a native installation through the store.

The released package passed all eight editor checks, seven popup checks, and three actual page-control checks, including site pause/resume with a withheld tab URL. All 45 Node tests pass. The website, privacy page, backend health and database readiness returned HTTP 200; the backend reports version 0.1.9.

AI remains off by default. The unchanged optional-permission package did not save cloud opt-in when headless Edge couldn't grant the native host-permission prompt. To test the rest of the cloud flow, a separate isolated copy of the published payload pregranted only the existing hosted API origin. Its popup opt-in and content-script background refresh returned HTTP 200 with 80 Gemini entries from disposable mathematics notes. Cloud mode was disabled afterward. This is a successful extension-to-provider call, not just a readiness check. Native permission-dialog acceptance remains unverified in this environment and is not claimed as passing.

No new launch failures were found. Publication and the available launch checks are complete; the one-time review follow-up can stop with the native-dialog limitation disclosed.
