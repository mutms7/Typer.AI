(function (root) {
  'use strict';
  const keep = 'Keep the thought.', skip = 'Skip the repeated typing.', brand = 'typer.ai';
  const fullLine = text => ({ typed: text, ghost: '', tab: '', caret: false });
  const line = (typed, ghost = '', tab = '') => ({ typed, ghost, tab, caret: true });
  const heroFrames = [
    [2600, { stage: 'read', keep: fullLine(keep), skip: fullLine(skip) }],
    [220, { stage: 'keep-letter', keep: line('K'), skip: fullLine('') }],
    [850, { stage: 'keep-preview', keep: line('K', keep.slice(1), 'ready'), skip: fullLine('') }],
    [200, { stage: 'keep-tab', keep: line('K', keep.slice(1), 'pressed'), skip: fullLine('') }],
    [600, { stage: 'keep-accepted', keep: fullLine(keep), skip: fullLine('') }],
    [160, { stage: 'skip-s', keep: fullLine(keep), skip: line('S') }],
    [220, { stage: 'skip-sk', keep: fullLine(keep), skip: line('Sk') }],
    [1100, { stage: 'skip-preview', keep: fullLine(keep), skip: line('Sk', skip.slice(2), 'ready') }],
    [200, { stage: 'skip-tab', keep: fullLine(keep), skip: line('Sk', skip.slice(2), 'pressed') }],
    [3500, { stage: 'accepted', keep: fullLine(keep), skip: fullLine(skip) }]
  ];
  const brandFrames = [[2600, { stage: 'read', line: fullLine(brand) }]];
  const add = (duration, stage, value) => brandFrames.push([duration, { stage, line: value }]);
  for (let n = 1; n <= 6; n++) add(110, 'type-typer-dot', line(brand.slice(0, n)));
  add(900, 'typer-dot-preview', line('typer.', 'ai', 'ready'));
  add(200, 'typer-dot-tab', line('typer.', 'ai', 'pressed'));
  add(2600, 'typer-dot-accepted', fullLine(brand));
  add(130, 'type-t', line('t'));
  add(240, 'type-ty', line('ty'));
  add(900, 'ty-preview', line('ty', 'per', 'ready'));
  add(200, 'ty-tab', line('ty', 'per', 'pressed'));
  add(500, 'typer-accepted', line('typer'));
  add(220, 'type-dot', line('typer.'));
  add(900, 'ai-preview', line('typer.', 'ai', 'ready'));
  add(200, 'ai-tab', line('typer.', 'ai', 'pressed'));
  add(2600, 'ty-ai-accepted', fullLine(brand));
  add(260, 'single-t', line('t'));
  add(1000, 't-preview', line('t', 'yper.ai', 'ready'));
  add(200, 't-tab', line('t', 'yper.ai', 'pressed'));
  add(3000, 't-accepted', fullLine(brand));
  function timeline(frames) {
    const duration = frames.reduce((sum, frame) => sum + frame[0], 0);
    return {
      duration,
      sample(elapsed) {
        let position = ((elapsed % duration) + duration) % duration;
        for (const [length, state] of frames) {
          if (position < length) return { state, nextIn: length - position };
          position -= length;
        }
      }
    };
  }
  const api = { hero: timeline(heroFrames), brand: timeline(brandFrames), full: { keep: fullLine(keep), skip: fullLine(skip), brand: fullLine(brand) } };
  root.TyperAnimation = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
