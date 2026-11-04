(function (root) {
  'use strict';
  const isPlain = el => el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement;
  const props = ['fontFamily','fontSize','fontWeight','fontStyle','letterSpacing','lineHeight','textTransform','textIndent','textAlign','wordSpacing','paddingTop','paddingRight','paddingBottom','paddingLeft','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','boxSizing','tabSize','direction'];
  function eligible(el) {
    if (!(el instanceof HTMLElement) || el.closest('[data-typer-ignore], [data-typer-ui]')) return false;
    if (el.closest('[aria-readonly="true"], [contenteditable="false"]')) return false;
    if (el instanceof HTMLInputElement) return el.type === 'text' && !el.disabled && !el.readOnly && !/password|email|card|cc-|one-time|username/i.test(el.autocomplete + ' ' + el.name + ' ' + el.id);
    return el instanceof HTMLTextAreaElement ? !el.disabled && !el.readOnly : el.isContentEditable && el.getAttribute('role') !== 'combobox';
  }
  function editorFor(target) {
    if (!(target instanceof HTMLElement)) return null;
    if (isPlain(target)) return eligible(target) ? target : null;
    let el = target.closest('[contenteditable]');
    while (el?.parentElement?.isContentEditable) el = el.parentElement;
    return eligible(el) ? el : null;
  }
  function snapshot(el) {
    if (isPlain(el)) {
      if (el.selectionStart == null || el.selectionStart !== el.selectionEnd) return null;
      return { text: el.value, before: el.value.slice(0, el.selectionStart), after: el.value.slice(el.selectionEnd), offset: el.selectionStart };
    }
    const sel = el.ownerDocument.getSelection();
    if (!sel?.isCollapsed || !sel.rangeCount || !el.contains(sel.anchorNode)) return null;
    const range = sel.getRangeAt(0);
    // Use one representation for indexing and both sides of the caret. Range.toString
    // joins separate paragraphs and BRs, turning two ordinary words into one token.
    let text = '', offset = null;
    const newline = () => { if (text && !text.endsWith('\n')) text += '\n'; };
    function visit(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node === range.startContainer) offset = text.length + range.startOffset;
        text += node.data; return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const css = getComputedStyle(node);
      if (css.display === 'none' || css.visibility === 'hidden' || node.matches('[data-typer-ui],script,style')) return;
      if (node.tagName === 'BR') { text += '\n'; return; }
      const block = node !== el && /^(block|list-item|flex|grid|table-row)$/.test(css.display);
      if (block) newline();
      for (let i = 0; i <= node.childNodes.length; i++) {
        if (node === range.startContainer && i === range.startOffset) offset = text.length;
        if (i < node.childNodes.length) visit(node.childNodes[i]);
      }
      if (block) newline();
    }
    visit(el);
    if (offset == null) return null;
    return { text, before: text.slice(0, offset), after: text.slice(offset), range: range.cloneRange() };
  }
  function textStyle(el, range) {
    let node = range?.startContainer;
    if (node?.nodeType === Node.ELEMENT_NODE) node = node.childNodes[Math.max(0, range.startOffset - 1)] || node;
    const run = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    return getComputedStyle(run && el.contains(run) ? run : el);
  }
  function scaledStyle(style, scaleX = 1, scaleY = scaleX) {
    return { fontFamily: style.fontFamily, fontSize: parseFloat(style.fontSize) * scaleY + 'px', fontWeight: style.fontWeight, fontStyle: style.fontStyle,
      letterSpacing: style.letterSpacing === 'normal' ? 'normal' : parseFloat(style.letterSpacing) * scaleX + 'px',
      wordSpacing: style.wordSpacing === 'normal' ? 'normal' : parseFloat(style.wordSpacing) * scaleX + 'px', textTransform: style.textTransform };
  }
  function wordCaret(el, snap) {
    // Word's input buffer can have a different font and origin from its painted
    // page. Prefer its visible insertion cursor, without changing the document.
    if (!/(^|\.)officeapps\.live\.com$/.test(location.hostname)) return null;
    const panel = document.getElementById('WACViewPanel');
    if (!panel) return null;
    const cursors = [...panel.querySelectorAll('.caretForCanvas,#Cursor,.Cursor,.Caret,[data-caret]')].filter(node => {
      const r = node.getBoundingClientRect(), css = getComputedStyle(node);
      return r.height >= 6 && r.width <= 4 && css.display !== 'none' && css.visibility !== 'hidden';
    });
    if (cursors.length !== 1) return null;
    const rect = cursors[0].getBoundingClientRect();
    const track = cursors[0].closest('.ParagraphTrackItem');
    if (track) {
      // Word paints paragraphs on canvas, retaining font-bearing TextRun spans
      // in an opacity-zero accessibility paragraph. Hit testing hits the canvas,
      // so read those runs directly within the cursor's own paragraph.
      const runs = [...track.querySelectorAll('.ParagraphTextContent .TextRun')];
      const distance = run => {
        const r = run.getBoundingClientRect();
        return Math.max(r.left - rect.left, rect.left - r.right, 0) + Math.abs((r.top + r.bottom) / 2 - (rect.top + rect.bottom) / 2);
      };
      runs.sort((a, b) => distance(a) - distance(b));
      if (!runs.length) return null;
      const run = runs[0], css = getComputedStyle(run);
      const scale = run.offsetHeight ? run.getBoundingClientRect().height / run.offsetHeight : 1;
      return { left: rect.left, top: rect.top, height: rect.height, style: scaledStyle(css, scale), bounds: panel.getBoundingClientRect() };
    }
    const painted = document.caretRangeFromPoint?.(rect.left - 1, rect.top + rect.height / 2);
    const run = painted?.startContainer?.parentElement;
    if (!run || !panel.contains(run) || el.contains(run)) return null;
    const css = getComputedStyle(run), scale = run.offsetHeight ? run.getBoundingClientRect().height / run.offsetHeight : 1;
    return { left: rect.left, top: rect.top, height: rect.height, style: scaledStyle(css, scale), bounds: panel.getBoundingClientRect() };
  }
  function caret(el, snap) {
    const painted = wordCaret(el, snap);
    if (painted) return painted;
    // During a canvas repaint/blink there may be no measurable painted caret.
    // Never jump back to the offscreen input buffer while waiting for Word.
    if (/(^|\.)officeapps\.live\.com$/.test(location.hostname) && el.closest('#WACViewPanel_EditingElement_WrappingDiv') && document.querySelector('#WACViewPanel .caretForCanvas')) return null;
    const style = getComputedStyle(el);
    if (style.direction === 'rtl') return null; // Avoid presenting misplaced completions in unsupported layout.
    if (!isPlain(el)) {
      const runStyle = textStyle(el, snap.range);
      const run = snap.range.startContainer.nodeType === Node.TEXT_NODE ? snap.range.startContainer.parentElement : snap.range.startContainer;
      const scaleY = run.offsetHeight ? run.getBoundingClientRect().height / run.offsetHeight : 1;
      const font = scaledStyle(runStyle, scaleY);
      const rect = snap.range.getClientRects()[0];
      if (rect?.height) return { left: rect.left, top: rect.top, height: rect.height, style: font };
      if (snap.range.startOffset > 0 && snap.range.startContainer.nodeType === Node.TEXT_NODE) {
        const prev = snap.range.cloneRange(); prev.setStart(prev.startContainer, prev.startOffset - 1);
        const r = prev.getBoundingClientRect();
        if (r.height) return { left: r.right, top: r.top, height: r.height, style: font };
      }
      return null;
    }
    const bounds = el.getBoundingClientRect(), mirror = document.createElement('div');
    Object.assign(mirror.style, { position: 'fixed', visibility: 'hidden', left: '0', top: '0', overflow: 'hidden', whiteSpace: el instanceof HTMLTextAreaElement ? 'pre-wrap' : 'pre', overflowWrap: 'break-word' });
    for (const p of props) mirror.style[p] = style[p];
    // clientWidth already excludes borders and scrollbars, but includes padding.
    // Keep the mirror's content viewport identical even for content-box fields.
    mirror.style.boxSizing = 'content-box';
    mirror.style.width = Math.max(0, el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)) + 'px';
    mirror.style.height = Math.max(0, el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)) + 'px';
    mirror.style.borderStyle = 'solid';
    mirror.textContent = snap.before;
    const mark = document.createElement('span'); mark.textContent = '\u200b'; mirror.append(mark);
    const tail = document.createTextNode(snap.after); mirror.append(tail); document.documentElement.append(mirror);
    mirror.scrollTop = el.scrollTop; mirror.scrollLeft = el.scrollLeft;
    const r = mark.getBoundingClientRect(); mirror.remove();
    const scaleX = el.offsetWidth ? bounds.width / el.offsetWidth : 1, scaleY = el.offsetHeight ? bounds.height / el.offsetHeight : 1;
    return { left: bounds.left + r.left * scaleX, top: bounds.top + r.top * scaleY,
      height: (r.height || parseFloat(style.fontSize) * 1.4) * scaleY, style: scaledStyle(style, scaleX, scaleY) };
  }
  function insert(el, suffix) {
    const before = new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: suffix });
    if (!el.dispatchEvent(before)) return false;
    // Native editing preserves undo and editor integrations where supported.
    if (document.execCommand('insertText', false, suffix)) return true;
    // Controlled rich editors should own their mutations. Do not rewrite their DOM as fallback.
    if (!isPlain(el)) return false;
    const start = el.selectionStart, value = el.value.slice(0, start) + suffix + el.value.slice(el.selectionEnd);
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.setSelectionRange(start + suffix.length, start + suffix.length);
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: suffix }));
    return true;
  }
  root.TyperEditor = { eligible, editorFor, snapshot, caret, insert };
})(globalThis);
