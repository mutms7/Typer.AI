# Website design

The page focuses on the animated title, the working demo, and the product's philosophy. The small section labels, status badge, footer slogan, and separate rich-text demo were removed. Installation instructions sit in a disclosure so they're available without competing with the demo.

The visual reference is [Grammarly's About page](https://www.grammarly.com/about): generous white space, dark sans-serif headings and green accents. Typer uses self-hosted DM Sans as a similar alternative to Matter, with its own brighter green and a distinct Tab-arrow mark. The font's SIL Open Font License is included in `public/fonts/OFL.txt`.

The redesign applies the hierarchy, choice reduction, proximity, target size and white-space principles described in [CXL's web design article](https://cxl.com/blog/universal-web-design-principles/). The headline leads to one working demo. Two familiar example choices stay together. Settings sit beside the draft, and the primary download has a large target. These are design decisions, not a claim of measured conversion improvement.

The title demonstrates `K` plus the rest of “Keep the thought.”, then `Sk` plus the rest of “Skip the repeated typing.” Gray previews become solid text after the Tab key visually depresses. The name starts fully readable, then cycles through `typer.` plus `ai`, `ty` plus `per` followed by `.` plus `ai`, and `t` plus `yper.ai`. Completed names linger for several seconds. These are scripted demonstrations; the actual demo uses the document-grounded prediction engine.

Animation widths and line heights are reserved to avoid shifting the page. The pause control restores readable, completed text. Reduced-motion preferences produce static full text, including when changed after page load. Animation timers pause when the page is hidden. Screen readers receive a stable heading and name rather than a stream of character changes.

Browser verification covered the complete headline and name cycles, Tab acceptance in both everyday examples, confidence-based phrase extension, undo, the off switch, pause, reduced motion, local font loading, and mobile layout without horizontal overflow.
