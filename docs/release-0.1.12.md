# Version 0.1.12

Typer.AI now completes words in Google Docs. Docs paints text onto a canvas and takes keystrokes in an empty, hidden input frame, so earlier versions had nothing to read there. A small main-world script on `docs.google.com/document/*` sets `_docs_annotate_canvas_by_ext` before Docs starts, which makes Docs keep invisible SVG rectangles with each painted line's text and font. The new Docs adapter rebuilds the visible text from those rectangles, maps the user's own painted caret to a text position, and accepts a suggestion with Tab by sending a plain-text paste into Docs' input frame. That keeps the caret's formatting and undoes in one step. Suggestions stay hidden while text is selected and between an editing key and Docs' next repaint, and collaborators' cursors are ignored. Because Docs only renders pages near the viewport, local vocabulary in Docs comes from the visible pages.

The popup's Suggestion level slider now reads left to right as fewer to more suggestions. Stored thresholds are unchanged, so saved settings carry over. The suggestion overlay now builds its nodes without `innerHTML`, since Docs enforces Trusted Types.

Validation: 57 Node tests and 30 isolated browser checks passed, including seven Docs checks modeled on the live editor's structure (painted-caret placement and font, Tab paste without indenting, Escape, wrapped lines and bold runs, selections and collaborator cursors, stale-annotation suppression, and no activation elsewhere). The five behavior checks fail against 0.1.11. The exact extension scripts ran in a live, disposable Google Doc with the annotation flag set, matched to the files by SHA-256: suggestions appeared at the caret in the document's font, Tab inserted the completion without a tab character, one undo removed it, Escape dismissed it, selections suppressed it, and bold runs got bold suggestions. The unpacked extension loaded in an isolated Chromium, set the flag before the page's first script on a Docs URL and not on Sheets, and still completed a textarea. The installed extension wasn't run against signed-in live Docs, and suggestion latency in Docs wasn't measured. The adapter depends on Docs behavior that Google doesn't document.

The release adds no extension permissions and leaves background AI off by default. Store publication is separate from source and website deployment.

## Submission

Not yet submitted. The Chrome Web Store package is `dist/chrome-web-store/typer-ai.zip`.
