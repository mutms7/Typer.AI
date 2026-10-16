# Extension copy audit, version 0.1.8

Reviewed the extension's packaged text and its Chrome Web Store submission on October 16, 2026. The audience is people writing notes, messages, and drafts in supported browser text fields.

| Surface | Change and reason |
| --- | --- |
| Manifest summary and toolbar tooltip | Name word/short-phrase completion and Tab acceptance directly. Describe AI vocabulary as optional. |
| Popup completion toggle | Use Show completions and disclose that Google Docs/canvas editors aren't supported. |
| Threshold control | Replace Prediction confidence, Conservative, and Expansive with Suggestion level, Fewer suggestions, and More suggestions. The engine uses heuristic matching scores, not calibrated probabilities. Preserve existing thresholds and preferences; expose the descriptive level to screen readers. |
| AI toggle and consent | Use Use background AI. Explain pause-triggered vocabulary refreshes and local completion. Disclose the separate 6,000-character draft and 300-character heading/page-title limits before opt-in. |
| Settings and permission messages | Describe which action was saved, distinguish unavailable AI from declined host permission, and avoid claiming local completion is on when permission is declined. |
| Site controls and keyboard hints | State Pause/Resume Typer on the actual hostname, and explain that Tab accepts gray text while Esc dismisses. |
| Background fallback text | Describe an unavailable vocabulary refresh instead of an unexplained ranking failure. |
| Unpacked installation text | Match the control names and disclose excerpt/title transmission. |
| Store description | Explain the writing tasks, partial-word trigger, local dictionary/document vocabulary, optional context-aware AI vocabulary, availability limits, and editor compatibility. Avoid promises of sentence generation, universal editor support, or measured accuracy. |
| Store privacy justifications and reviewer steps | Match the new control names and heading/page-title disclosure without changing permissions or declared data categories. |
| Public privacy policy linked by the extension | Describe the current hosted Gemini/Render/Supabase service in plain language. Explain that stopping future requests can't retract data already sent. Keep retention and limited-use disclosures. |

The popup uses the existing logo, colors, and layout with tighter spacing to keep its initial view within Chrome's 600-pixel height limit. AI consent remains off by default and the full transmission disclosure remains visible. Model prompts, ranking behavior, quotas, and network permissions are unchanged.

Verification includes the automated popup checks for accessible levels, persistence, unavailable AI, declined permission, and opt-in/out, plus installed-extension editor and popup checks.
