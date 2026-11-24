// Runs in the page's main world at document_start on Google Docs only.
// Docs paints document text onto a canvas. When this flag is set before Docs
// starts, it also keeps invisible, font-labelled SVG rectangles for each painted
// line, which the isolated content script reads to see the text near the caret.
// The value only tells Docs which extension asked. It grants no access.
if (!window._docs_annotate_canvas_by_ext) window._docs_annotate_canvas_by_ext = 'gfekhahompbphjlcadpjlmndnglkojnn';
