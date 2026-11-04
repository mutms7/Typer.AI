# Version 0.1.10

Suggestions now use the font at the caret, preserve CSS text case, and account for scaled fields and padded, scrolled textareas. Rich editor snapshots preserve paragraph and line-break boundaries. Site pause applies to cross-origin embedded editors and blocks background requests while the outer site's status is unresolved.

Word's canvas editor uses its painted caret and font-bearing TextRun spans, rather than the invisible input buffer. Rendering follows delayed caret updates and suppresses the invisible-buffer fallback during an unavailable or ambiguous canvas caret.

Validation: 53 Node tests and 23 isolated browser checks passed. An independent referee verified before/after layout regressions and exercised pause, reload while paused, and resume through the actual extension runtime in an isolated browser. Real Word screenshots confirmed centered suggestion placement and matching font size at 12pt and 24pt; Tab acceptance was observed at 24pt. Remaining live Undo/pause and extended typing checks were stopped at the user's request. This isn't a claim of exhaustive Word or third-party editor compatibility.

The release adds no extension permissions and leaves background AI off by default. Browser regressions run in CI. Store publication is separate from source and website deployment.

## Submission

Version 0.1.10 was uploaded to the existing Chrome Web Store listing on November 3, 2026. The dashboard confirmed "Your extension was submitted for review" and "Pending review". Automatic publication after approval was selected. The published package remains 0.1.9 until Google approves this update.

Source and downloadable ZIP are published in GitHub release v0.1.10; repository checks and website deployment succeeded. The temporary unpacked build was removed, the original store extension re-enabled, and Developer mode restored to off. The disposable Word document was cleared and restored to 12pt and left alignment. Thought Journal was not edited.
