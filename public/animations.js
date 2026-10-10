(() => {
  'use strict';
  const timeline = TyperAnimation, reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const button = document.querySelector('#animation-toggle'), label = document.querySelector('#animation-label');
  const parts = Object.fromEntries(['keep', 'skip', 'brand'].map(name => [name, {
    typed: document.querySelector('#' + name + '-typed'), ghost: document.querySelector('#' + name + '-ghost'),
    caret: document.querySelector('#' + name + '-caret'), tab: document.querySelector('#' + name + '-tab')
  }]));
  for (const part of Object.values(parts)) part.typed.after(part.caret);
  let timer, paused = false, elapsed = 0, resumedAt = performance.now(), running = false;
  function paint(name, state) {
    const p = parts[name];
    p.typed.textContent = state.typed; p.ghost.textContent = state.ghost;
    p.caret.hidden = !state.caret; p.tab.hidden = !state.tab;
    p.tab.classList.toggle('pressed', state.tab === 'pressed');
  }
  function full() { for (const name of Object.keys(parts)) paint(name, timeline.full[name]); }
  function tick() {
    if (paused || reduced.matches || document.hidden) return;
    const now = elapsed + performance.now() - resumedAt;
    const hero = timeline.hero.sample(now), brand = timeline.brand.sample(now);
    paint('keep', hero.state.keep); paint('skip', hero.state.skip); paint('brand', brand.state.line);
    document.documentElement.dataset.heroStage = hero.state.stage;
    document.documentElement.dataset.brandStage = brand.state.stage;
    timer = setTimeout(tick, Math.max(16, Math.min(hero.nextIn, brand.nextIn)));
  }
  function stop() {
    clearTimeout(timer);
    if (running) elapsed += performance.now() - resumedAt;
    running = false;
  }
  function start() {
    if (paused || reduced.matches || document.hidden || running) return;
    resumedAt = performance.now(); running = true; tick();
  }
  button.addEventListener('click', () => {
    paused = !paused; stop();
    button.setAttribute('aria-pressed', String(paused));
    button.setAttribute('aria-label', paused ? 'Resume typing animations' : 'Pause typing animations');
    label.textContent = paused ? 'Resume animation' : 'Pause animation';
    button.querySelector('path').setAttribute('d', paused ? 'M5 3 12 8 5 13Z' : 'M5 3v10M11 3v10');
    if (paused) full(); else { elapsed = 0; start(); }
  });
  reduced.addEventListener('change', () => { stop(); elapsed = 0; if (reduced.matches) full(); else start(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', start);
  if (reduced.matches) full(); else start();
})();
