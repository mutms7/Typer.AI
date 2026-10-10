(function (root) {
  'use strict';
  const keep = 'Keep the thought.', skip = 'Skip the repeated typing.', brand = 'typer.ai';
  const fullLine = text => ({ typed: text, ghost: '', tab: '', caret: false });
  const line = (typed, ghost = '', tab = '') => ({ typed, ghost, tab, caret: true });
  const heroFrames = [
    [2600, { stage: 'read', keep: fullLine(keep), skip: fullLine(skip) }],
    [80, { stage: 'keep-letter', keep: line('K'), skip: fullLine('') }],
    [240, { stage: 'keep-preview', keep: line('K', 'eep', 'ready'), skip: fullLine('') }],
    [80, { stage: 'keep-tab', keep: line('K', 'eep', 'pressed'), skip: fullLine('') }],
    [120, { stage: 'keep-word-accepted', keep: line('Keep '), skip: fullLine('') }],
    [80, { stage: 'the-letter', keep: line('Keep t'), skip: fullLine('') }],
    [240, { stage: 'the-preview', keep: line('Keep t', 'he', 'ready'), skip: fullLine('') }],
    [80, { stage: 'the-tab', keep: line('Keep t', 'he', 'pressed'), skip: fullLine('') }],
    [120, { stage: 'the-accepted', keep: line('Keep the '), skip: fullLine('') }],
    [80, { stage: 'thought-t', keep: line('Keep the t'), skip: fullLine('') }],
    [80, { stage: 'thought-th', keep: line('Keep the th'), skip: fullLine('') }],
    [240, { stage: 'thought-preview', keep: line('Keep the th', 'ought.', 'ready'), skip: fullLine('') }],
    [80, { stage: 'thought-tab', keep: line('Keep the th', 'ought.', 'pressed'), skip: fullLine('') }],
    [200, { stage: 'keep-accepted', keep: fullLine(keep), skip: fullLine('') }],
    [80, { stage: 'skip-s', keep: fullLine(keep), skip: line('S') }],
    [80, { stage: 'skip-sk', keep: fullLine(keep), skip: line('Sk') }],
    [240, { stage: 'skip-preview', keep: fullLine(keep), skip: line('Sk', skip.slice(2), 'ready') }],
    [80, { stage: 'skip-tab', keep: fullLine(keep), skip: line('Sk', skip.slice(2), 'pressed') }],
    [3500, { stage: 'accepted', keep: fullLine(keep), skip: fullLine(skip) }]
  ];
  const brandFrames = [[2600, { stage: 'read', line: fullLine(brand) }]];
  const add = (duration, stage, value) => brandFrames.push([duration, { stage, line: value }]);
  for (let n = 1; n <= 6; n++) add(110, 'type-typer-dot', line(brand.slice(0, n)));
  add(240, 'typer-dot-preview', line('typer.', 'ai', 'ready'));
  add(80, 'typer-dot-tab', line('typer.', 'ai', 'pressed'));
  add(2600, 'typer-dot-accepted', fullLine(brand));
  add(130, 'type-t', line('t'));
  add(240, 'type-ty', line('ty'));
  add(240, 'ty-preview', line('ty', 'per', 'ready'));
  add(80, 'ty-tab', line('ty', 'per', 'pressed'));
  add(500, 'typer-accepted', line('typer'));
  add(220, 'type-dot', line('typer.'));
  add(240, 'ai-preview', line('typer.', 'ai', 'ready'));
  add(80, 'ai-tab', line('typer.', 'ai', 'pressed'));
  add(2600, 'ty-ai-accepted', fullLine(brand));
  add(260, 'single-t', line('t'));
  add(240, 't-preview', line('t', 'yper.ai', 'ready'));
  add(80, 't-tab', line('t', 'yper.ai', 'pressed'));
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
