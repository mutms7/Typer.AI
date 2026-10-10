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
    const range = sel.getRangeAt(0), prior = range.cloneRange(), remaining = range.cloneRange();
    prior.selectNodeContents(el); prior.setEnd(range.startContainer, range.startOffset);
    remaining.selectNodeContents(el); remaining.setStart(range.endContainer, range.endOffset);
    return { text: el.innerText, before: prior.toString(), after: remaining.toString(), range: range.cloneRange() };
  }
  function caret(el, snap) {
    const style = getComputedStyle(el);
    if (style.direction === 'rtl') return null; // Avoid presenting misplaced completions in unsupported layout.
    if (!isPlain(el)) {
      const rect = snap.range.getClientRects()[0];
      if (rect?.height) return { left: rect.left, top: rect.top, height: rect.height, style };
      if (snap.range.startOffset > 0 && snap.range.startContainer.nodeType === Node.TEXT_NODE) {
        const prev = snap.range.cloneRange(); prev.setStart(prev.startContainer, prev.startOffset - 1);
        const r = prev.getBoundingClientRect();
        if (r.height) return { left: r.right, top: r.top, height: r.height, style };
      }
      return null;
    }
    const bounds = el.getBoundingClientRect(), mirror = document.createElement('div');
    Object.assign(mirror.style, { position: 'fixed', visibility: 'hidden', left: bounds.left + 'px', top: bounds.top + 'px', width: bounds.width + 'px', height: bounds.height + 'px', overflow: 'hidden', whiteSpace: el instanceof HTMLTextAreaElement ? 'pre-wrap' : 'pre', overflowWrap: 'break-word' });
    for (const p of props) mirror.style[p] = style[p];
    mirror.style.borderStyle = 'solid';
    mirror.textContent = snap.before;
    const mark = document.createElement('span'); mark.textContent = '\u200b'; mirror.append(mark);
    const tail = document.createTextNode(snap.after || '.'); mirror.append(tail); document.documentElement.append(mirror);
    mirror.scrollTop = el.scrollTop; mirror.scrollLeft = el.scrollLeft;
    const r = mark.getBoundingClientRect(); mirror.remove();
    return { left: r.left, top: r.top, height: r.height || parseFloat(style.fontSize) * 1.4, style };
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
