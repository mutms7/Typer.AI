(() => {
  'use strict';
  if (globalThis.__typerLoaded) return;
  globalThis.__typerLoaded = true;
  const E = TyperEditor;
  let settings = { enabled: true, threshold: 0.78, cloud: false, excluded: [] };
  let active = null, engine = new TyperEngine(), ranks = [], indexedText = '', title = '', lastIndex = 0;
  let composing = false, suggestion = null, signature = '', epoch = 0, lastCloud = 0, lastExcerpt = '', dismissed = '';
  let rebuildTimer, cloudTimer, frame;
  let cloudFailures = 0;
  const host = document.createElement('div');
  host.dataset.typerUi = ''; host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647';
  const shadow = host.attachShadow({ mode: 'closed' });
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(':host{pointer-events:none}.ghost{position:fixed;color:#7a7f89;white-space:pre;overflow:hidden;pointer-events:none}.hint{position:fixed;background:#f4f6f9;color:#4b5563;border:1px solid #dce1e8;border-radius:5px;padding:1px 5px;font:11px/18px system-ui;pointer-events:none}');
  shadow.adoptedStyleSheets = [sheet];
  shadow.innerHTML = '<span class="ghost"></span><span class="hint">Tab</span>';
  const ghost = shadow.querySelector('.ghost'), hint = shadow.querySelector('.hint');
  document.documentElement.append(host);
  const allowed = () => settings.enabled && !settings.excluded.includes(location.hostname) && !document.hidden;
  const hide = () => { suggestion = null; ghost.textContent = ''; hint.style.display = 'none'; };
  hide();
  const currentTitle = el => (el.getAttribute('data-typer-title') || el.closest('article,main,form')?.querySelector('h1,h2')?.textContent || document.title).slice(0, 300);
  function rebuild(snap) {
    indexedText = snap.text.slice(0, 30000); title = currentTitle(active);
    engine.index(indexedText, title); engine.setRanks(ranks); lastIndex = performance.now();
  }
  function render() {
    frame = null;
    if (!active || E.editorFor(document.activeElement) !== active || !allowed() || composing || !E.eligible(active)) return hide();
    const snap = E.snapshot(active);
    if (!snap) return hide();
    if (!lastIndex || title !== currentTitle(active)) rebuild(snap);
    else if (snap.text.slice(0, 30000) !== indexedText && performance.now() - lastIndex > 900) rebuild(snap);
    clearTimeout(rebuildTimer);
    if (snap.text.slice(0, 30000) !== indexedText) rebuildTimer = setTimeout(() => {
      if (active && allowed()) { const s = E.snapshot(active); if (s && s.text.slice(0, 30000) !== indexedText) { rebuild(s); schedule(); } }
    }, 1000);
    signature = snap.before + '\u0000' + snap.after;
    if (dismissed === signature) return hide();
    suggestion = engine.predict(snap.before, settings.threshold, snap.after);
    if (!suggestion) return hide();
    const point = E.caret(active, snap), bounds = active.getBoundingClientRect();
    if (!point || point.left < bounds.left || point.left > bounds.right - 12 || point.top < bounds.top || point.top + point.height > bounds.bottom + 3) return hide();
    Object.assign(ghost.style, { left: point.left + 'px', top: point.top + 'px', maxWidth: Math.max(0, Math.min(bounds.right, innerWidth) - point.left - 4) + 'px', fontFamily: point.style.fontFamily, fontSize: point.style.fontSize, fontWeight: point.style.fontWeight, fontStyle: point.style.fontStyle, letterSpacing: point.style.letterSpacing, lineHeight: point.height + 'px', height: point.height + 'px' });
    ghost.textContent = suggestion.suffix;
    Object.assign(hint.style, { left: Math.min(innerWidth - 38, point.left) + 'px', top: Math.min(innerHeight - 23, point.top + point.height + 3) + 'px', display: 'block' });
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(render); }
  async function cloud() {
    if (!active || E.editorFor(document.activeElement) !== active || !allowed() || !settings.cloud || composing) return;
    const remaining = 45000 - (Date.now() - lastCloud);
    if (remaining > 0) { clearTimeout(cloudTimer); cloudTimer = setTimeout(cloud, remaining); return; }
    const snap = E.snapshot(active); if (!snap || snap.text.length < 80) return;
    // First paragraphs plus recent local context. Never gather surrounding page text.
    const text = snap.text.length <= 6000 ? snap.text : snap.text.slice(0, 2500) + '\n' + snap.before.slice(-3400);
    if (text === lastExcerpt) return;
    lastCloud = Date.now();
    const version = epoch, editor = active;
    const retry = () => {
      if (version !== epoch || editor !== active || !settings.cloud || !allowed()) return;
      if (++cloudFailures > 3) return;
      clearTimeout(cloudTimer);
      cloudTimer = setTimeout(cloud, 45000 * 2 ** (cloudFailures - 1));
    };
    try {
      const result = await chrome.runtime.sendMessage({ type: 'rank', text, title: currentTitle(active) });
      if (version !== epoch || editor !== active || !settings.cloud || !allowed()) return;
      // A failed or throttled refresh must not erase the useful current cache.
      if (result?.terms?.length) { cloudFailures = 0; lastExcerpt = text; ranks = result.terms; engine.setRanks(ranks); schedule(); }
      else retry();
    } catch { retry(); /* Local engine keeps working when extension context is gone. */ }
  }
  function focus(target) {
    const editor = E.editorFor(target);
    if (editor === active) { schedule(); clearTimeout(cloudTimer); if (active) cloudTimer = setTimeout(cloud, 1800); return; }
    epoch++; active = editor; ranks = []; indexedText = ''; lastIndex = 0; lastCloud = 0; lastExcerpt = ''; dismissed = '';
    cloudFailures = 0;
    engine = new TyperEngine(); hide(); clearTimeout(cloudTimer); clearTimeout(rebuildTimer);
    if (active) { schedule(); cloudTimer = setTimeout(cloud, 1800); }
  }
  document.addEventListener('focusin', e => focus(e.target), true);
  document.addEventListener('focusout', () => { hide(); clearTimeout(cloudTimer); }, true);
  document.addEventListener('input', e => {
    if (!allowed()) return hide();
    const editor = E.editorFor(e.target); if (!editor) return;
    if (editor !== active) focus(e.target);
    dismissed = ''; cloudFailures = 0; schedule(); clearTimeout(cloudTimer); cloudTimer = setTimeout(cloud, 1800);
  }, true);
  document.addEventListener('keydown', e => {
    if (E.editorFor(e.target) !== active || !allowed() || composing || e.isComposing) return;
    if (e.key === 'Escape' && suggestion) { dismissed = signature; hide(); return; }
    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && suggestion) {
      const snap = E.snapshot(active);
      if (!snap || snap.before + '\u0000' + snap.after !== signature) return hide();
      const suffix = suggestion.suffix;
      // Consume Tab only after native insertion succeeds.
      if (E.insert(active, suffix)) { e.preventDefault(); e.stopImmediatePropagation(); hide(); dismissed = ''; schedule(); }
    } else if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key)) { hide(); schedule(); }
  }, true);
  document.addEventListener('compositionstart', () => { composing = true; hide(); clearTimeout(cloudTimer); }, true);
  document.addEventListener('compositionend', () => {
    composing = false; schedule(); clearTimeout(cloudTimer);
    if (active && allowed() && settings.cloud) cloudTimer = setTimeout(cloud, 1800);
  }, true);
  document.addEventListener('selectionchange', () => {
    const editor = E.editorFor(document.activeElement);
    if (editor !== active) focus(document.activeElement);
    else schedule();
  });
  document.addEventListener('pointerdown', () => { hide(); schedule(); }, true);
  document.addEventListener('scroll', schedule, true);
  window.addEventListener('resize', schedule);
  document.addEventListener('visibilitychange', () => {
    clearTimeout(cloudTimer);
    if (document.hidden) hide();
    else {
      schedule();
      if (active && allowed() && settings.cloud) cloudTimer = setTimeout(cloud, 1800);
    }
  });
  if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
    chrome.runtime.sendMessage({ type: 'settings' }).then(r => { if (r?.settings) settings = r.settings; focus(document.activeElement); }).catch(() => {});
    chrome.runtime.onMessage.addListener((message, sender, reply) => {
      if (message?.type === 'pageContext') { reply({ hostname: location.hostname }); return; }
      if (message.type === 'settingsChanged') {
        const wasCloud = settings.cloud;
        settings = message.settings; epoch++;
        if (!settings.cloud) { ranks = []; engine.setRanks([]); }
        if (wasCloud !== settings.cloud) { lastExcerpt = ''; cloudFailures = 0; }
        clearTimeout(cloudTimer); hide(); schedule();
        if (active && allowed() && settings.cloud) cloudTimer = setTimeout(cloud, 1800);
      }
    });
  } else {
    // Demo can change the same engine's threshold without persisting document text.
    window.addEventListener('typer-settings', e => { settings = { ...settings, ...e.detail }; hide(); schedule(); });
    window.addEventListener('typer-demo-vocabulary', e => { ranks = e.detail?.terms || []; engine.setRanks(ranks); hide(); schedule(); });
  }
  focus(document.activeElement);
})();
