(function (root) {
  'use strict';
  // Google Docs adapter. Docs paints text onto a canvas and takes keystrokes in an
  // empty, offscreen contenteditable inside iframe.docs-texteventtarget-iframe.
  // With docs-annotate.js in place, Docs also keeps opacity-zero SVG rects (one per
  // line and style run) whose aria-label holds the painted text and whose
  // data-font-css holds its font. The top frame reads those rects and the user's own
  // painted caret, and inserts accepted text as a plain-text paste into the input frame.
  const FRAME = 'iframe.docs-texteventtarget-iframe';
  const RUNS = '.kix-canvas-tile-content:not(.kix-canvas-tile-selection) svg g[role="paragraph"]';
  function inDocs() {
    try { return location.hostname === 'docs.google.com' && location.pathname.startsWith('/document/'); } catch { return false; }
  }
  // The content script also loads inside the input frame. The top frame owns Docs.
  function inInputFrame() {
    try { return Boolean(window.frameElement?.matches?.(FRAME)); } catch { return false; }
  }
  const enabled = () => inDocs() && !inInputFrame();
  const frame = () => document.querySelector(FRAME);
  function frameDocument() { try { return frame()?.contentDocument || null; } catch { return null; } }
  function editor() { return frameDocument()?.querySelector('[contenteditable="true"]') || null; }
  // Returns the Docs input element, null when Docs owns the target but has no input,
  // or undefined when the target is ordinary page UI such as a comment box.
  function editorFor(target) {
    if (inInputFrame()) return null;
    if (!enabled() || !target) return undefined;
    const f = frame(), doc = frameDocument();
    if (target !== f && (!doc || target.ownerDocument !== doc)) return undefined;
    return editor();
  }
  const isEditor = el => Boolean(el) && enabled() && el === editor();
  // Set between an editing key and Docs' next repaint, so a suggestion is never
  // shown or accepted against annotations that don't include the latest keystroke.
  let stale = false;
  let canvas;
  function measure(font, text) {
    canvas ||= document.createElement('canvas').getContext('2d');
    canvas.font = font;
    return canvas.measureText(text).width;
  }
  function ownCaret() {
    const caret = document.getElementById('kix-current-user-cursor-caret');
    const cursor = caret?.closest('.kix-cursor');
    if (!caret || !cursor || cursor.style.opacity === '0' || getComputedStyle(cursor).display === 'none') return null;
    const r = caret.getBoundingClientRect();
    return r.height >= 4 ? r : null;
  }
  function hasSelection() {
    return [...document.querySelectorAll('.kix-canvas-tile-selection svg rect')].some(r => r.getBoundingClientRect().width > 0);
  }
  // Rebuild visible document text in paragraph order. Labels omit trailing spaces,
  // so gaps between runs on a line and wraps between lines become single spaces.
  function readRuns() {
    let text = '';
    const runs = [];
    for (const paragraph of document.querySelectorAll(RUNS)) {
      const rects = [...paragraph.querySelectorAll('rect[aria-label]')].map(node => {
        const box = node.getBoundingClientRect(), width = parseFloat(node.getAttribute('width')) || box.width;
        return { node, box, label: node.getAttribute('aria-label') || '', font: node.getAttribute('data-font-css') || '', scale: width ? box.width / width : 1 };
      }).filter(r => r.box.height > 0).sort((a, b) => Math.abs(a.box.top - b.box.top) > 2 ? a.box.top - b.box.top : a.box.left - b.box.left);
      if (!rects.length) continue;
      if (text && !text.endsWith('\n')) text += '\n';
      rects.forEach((run, i) => {
        const prev = rects[i - 1];
        if (prev) {
          const sameLine = Math.abs(prev.box.top - run.box.top) <= 2;
          if (!sameLine || run.box.left - prev.box.right > 1) text += ' ';
        }
        run.start = text.length; text += run.label; runs.push(run);
      });
    }
    return { text, runs };
  }
  function snapshot(el) {
    if (stale || !isEditor(el) || hasSelection()) return null;
    const caret = ownCaret();
    if (!caret) return null;
    let { text, runs } = readRuns();
    const y = caret.top + caret.height / 2;
    const line = runs.filter(r => r.box.top - 1 <= y && y <= r.box.bottom + 1);
    if (!line.length) return null;
    const run = line.filter(r => r.box.left <= caret.left + 1).at(-1);
    let offset;
    if (!run) offset = line[0].start;
    else {
      const dx = (caret.left - run.box.left) / run.scale, full = measure(run.font, run.label);
      if (dx >= full) {
        // Trailing spaces have no label. Count them from the caret's distance.
        const space = measure(run.font, ' ') || 4;
        offset = run.start + run.label.length;
        for (let n = Math.round((dx - full) / space); n > 0; n--) {
          if (text[offset] !== ' ') text = text.slice(0, offset) + ' ' + text.slice(offset);
          offset++;
        }
      } else {
        let best = 0, distance = Infinity;
        for (let k = 0; k <= run.label.length; k++) {
          const d = Math.abs(measure(run.font, run.label.slice(0, k)) - dx);
          if (d < distance) { distance = d; best = k; }
        }
        offset = run.start + best;
      }
    }
    const font = (run || line[0]);
    return { text, before: text.slice(0, offset), after: text.slice(offset), docs: { caret, font: font.font, scale: font.scale, tile: font.node.closest('.kix-canvas-tile-content'), runs } };
  }
  function parseFont(css, scale) {
    const probe = document.createElement('span').style;
    probe.font = css;
    return { fontFamily: probe.fontFamily || 'Arial', fontSize: (parseFloat(probe.fontSize) || 14.6667) * scale + 'px', fontWeight: probe.fontWeight || '400',
      fontStyle: probe.fontStyle || 'normal', letterSpacing: 'normal', wordSpacing: 'normal', textTransform: 'none' };
  }
  function caret(el, snap) {
    const info = snap?.docs;
    if (!info) return null;
    const view = document.querySelector('.kix-appview-editor')?.getBoundingClientRect();
    let right = view?.right ?? innerWidth;
    // Stop at the page's text edge, assuming the right margin mirrors the left one.
    if (info.tile) {
      const tile = info.tile.getBoundingClientRect();
      const left = Math.min(...info.runs.filter(r => r.node.closest('.kix-canvas-tile-content') === info.tile).map(r => r.box.left));
      if (Number.isFinite(left) && left > tile.left) right = Math.min(right, tile.right - (left - tile.left));
    }
    const top = view?.top ?? 0, bottom = view?.bottom ?? innerHeight;
    return { left: info.caret.left, top: info.caret.top, height: info.caret.height, style: parseFont(info.font, info.scale),
      bounds: { left: view?.left ?? 0, right: right + 12, top, bottom } };
  }
  function insert(el, suffix) {
    if (!isEditor(el)) return false;
    // Docs ignores execCommand in its input frame but accepts a plain-text paste,
    // which inherits the caret's formatting and undoes as a single step.
    const data = new DataTransfer();
    data.setData('text/plain', suffix);
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    stale = true;
    return true;
  }
  const title = () => document.title.replace(/\s+-\s+Google Docs$/, '').slice(0, 300);
  // Content scripts listen on the top document. Docs delivers keys to the input
  // frame and repaints its caret and annotations after the event, so attach the same
  // listeners there and re-render when the painted view changes.
  function attach(listen, changed) {
    if (!enabled()) return;
    let doc, view, observer;
    const bind = () => {
      const next = frameDocument();
      if (next && next !== doc) {
        doc = next; listen(doc);
        // Registered after the shared listeners, so an accepted Tab never gets here.
        doc.addEventListener('keydown', e => {
          if (!['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Escape', 'Tab'].includes(e.key)) stale = true;
        }, true);
      }
      const nextView = document.querySelector('.kix-appview-editor');
      if (nextView && nextView !== view) {
        observer?.disconnect(); view = nextView;
        observer = new MutationObserver(() => { stale = false; changed(); });
        observer.observe(view, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'aria-label', 'transform'] });
      }
      return doc && view;
    };
    if (bind()) return;
    const waiting = new MutationObserver(() => { if (bind()) waiting.disconnect(); });
    waiting.observe(document.documentElement, { childList: true, subtree: true });
  }
  root.TyperDocs = { enabled, editorFor, isEditor, snapshot, caret, insert, title, attach };
})(globalThis);
