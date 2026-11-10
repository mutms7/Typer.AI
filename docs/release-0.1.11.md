# Version 0.1.11

The word being typed at the caret no longer enters the suggestion vocabulary. Before this release, each re-index read the whole draft, including the unfinished word, so a pause partway through "document" could save "documen" as a word and as continuation evidence for the words before it. The engine now skips the token touching the caret, and a heading word with the same spelling, until the writer moves past it. The background ranking excerpt drops the same fragment, so the server can't return it as a ranked term.

Validation: 57 Node tests and 23 isolated browser checks passed, including four new engine tests for a fragment at the end of the draft, a fragment mid-sentence, a heading being edited, and a finished word being indexed normally.

The release adds no extension permissions and leaves background AI off by default. Store publication is separate from source and website deployment.

## Submission

Not yet submitted. The Chrome Web Store package is `dist/chrome-web-store/typer-ai.zip`.
