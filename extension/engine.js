/* Shared by the extension, demo and Node tests. No network on the typing path. */
(function (root) {
  'use strict';
  const TOKEN = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*(?:\+{1,2}|#)?/gu;
  const STOP = new Set('a an the and or but of in on to for with is are was were be this that it as by at from however therefore'.split(' '));
  const normalize = s => s.toLocaleLowerCase('en-US');
  const tokens = s => [...s.matchAll(TOKEN)].map(m => ({ text: m[0], key: normalize(m[0]), start: m.index, end: m.index + m[0].length }));
  class Engine {
    constructor() { this.words = new Map(); this.prefixes = new Map(); this.next = new Map(); this.ranks = new Map(); }
    index(documentText, title = '') {
      this.words.clear(); this.prefixes.clear(); this.next.clear(); this.ranks.clear();
      this.cloudPhrases = [];
      const text = documentText.slice(0, 30000), ts = tokens(text);
      const addWord = (word, weight, heading) => {
        if (word.key.length < 3 || word.key.length > 64 || STOP.has(word.key)) return;
        const old = this.words.get(word.key) || { word: word.text, count: 0, heading: false };
        old.count += weight; old.heading ||= heading; this.words.set(word.key, old);
      };
      for (const t of ts) addWord(t, 1, false);
      for (const t of tokens(title.slice(0, 500))) addWord(t, 7, true);
      for (const [word] of this.words) {
        for (let n = 1; n < word.length; n++) {
          const p = word.slice(0, n);
          if (!this.prefixes.has(p)) this.prefixes.set(p, []);
          this.prefixes.get(p).push(word);
        }
      }
      // Evidence for continuations stays inside sentence and paragraph boundaries.
      for (let i = 0; i < ts.length - 1; i++) {
        if (!/^\s+$/.test(text.slice(ts[i].end, ts[i + 1].start))) continue;
        if (/\n\s*\n/.test(text.slice(ts[i].end, ts[i + 1].start))) continue;
        for (let n = 1; n <= 3 && i - n + 1 >= 0; n++) {
          const prior = ts.slice(i - n + 1, i + 1);
          if (prior.some((t, j) => j && !/^[ \t]+$/.test(text.slice(prior[j - 1].end, t.start)))) continue;
          const key = prior.map(t => t.key).join(' ');
          const choices = this.next.get(key) || new Map();
          const old = choices.get(ts[i + 1].key) || { count: 0, word: ts[i + 1].text };
          old.count++; choices.set(ts[i + 1].key, old); this.next.set(key, choices);
        }
      }
      this.size = this.words.size;
      return this;
    }
    setRanks(ranks) {
      this.ranks.clear();
      // Discard vocabulary from the previous background response, including on opt-out.
      for (const [key, word] of this.words) if (word.inferred) this.words.delete(key);
      this.cloudPhrases = [];
      for (const term of (Array.isArray(ranks) ? ranks : []).slice(0, 80)) {
        if (typeof term !== 'string' || term.length > 100 || !/^[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*(?:\+{1,2}|#)?(?: [\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*(?:\+{1,2}|#)?){0,4}$/u.test(term)) continue;
        this.cloudPhrases.push(term);
        for (const t of tokens(term)) {
          if (t.key.length < 3 || t.key.length > 64 || STOP.has(t.key)) continue;
          if (!this.words.has(t.key)) this.words.set(t.key, { word: t.text, count: .5, heading: false, inferred: true });
          this.ranks.set(t.key, 1.4);
        }
      }
      this.prefixes.clear();
      for (const [word] of this.words) for (let n = 1; n < word.length; n++) {
        const prefix = word.slice(0, n);
        if (!this.prefixes.has(prefix)) this.prefixes.set(prefix, []);
        this.prefixes.get(prefix).push(word);
      }
    }
    predict(before, threshold = 0.78, after = '') {
      if (!before || /^[\p{L}\p{N}]/u.test(after)) return null;
      const match = before.match(/([\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*(?:\+{1,2}|#)?)$/u);
      if (!match) return null; // No guesses after 'however,' or at blank line starts.
      const partial = match[1], key = normalize(partial), candidates = this.prefixes.get(key)?.filter(w => !this.words.get(w).inferred || key.length >= (threshold >= .9 ? 3 : 2));
      if (!candidates?.length) return null;
      const preceding = tokens(before.slice(Math.max(0, before.length - 250), before.length - partial.length)).map(t => t.key);
      let evidence;
      for (let n = Math.min(3, preceding.length); n > 0; n--) {
        const choices = this.next.get(preceding.slice(-n).join(' '));
        // The unfinished current token must not hide shorter, useful context.
        if (choices && candidates.some(w => choices.has(w))) { evidence = choices; break; }
      }
      const ranked = candidates.map(w => {
        const item = this.words.get(w);
        const contextual = evidence?.get(w)?.count || 0;
        return { key: w, ...item, contextual, score: (Math.log2(1 + item.count) + 4 * contextual) * (this.ranks.get(w) || 1) };
      }).sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
      const best = ranked[0], total = ranked.reduce((s, t) => s + t.score, 0);
      const margin = best.score / total;
      // A confidence score is a heuristic evidence gate, NOT a calibrated probability.
      const support = best.heading || best.count >= 2 || key.length >= 3 || (best.inferred && key.length >= 2) || best.contextual;
      const confidence = Math.min(0.99, 0.52 + 0.39 * margin + Math.min(key.length, 5) * 0.014 + (best.contextual ? 0.04 : 0));
      if (!support || confidence < threshold || (key.length === 1 && margin < 0.72 && !best.contextual)) return null;
      let word = best.word;
      if (partial === partial.toUpperCase() && partial.length > 1) word = word.toUpperCase();
      else if (partial[0] === partial[0].toUpperCase()) word = word[0].toUpperCase() + word.slice(1);
      else word = normalize(word);
      let suffix = word.slice(partial.length), sequence = [...preceding, best.key], phraseConfidence = confidence;
      // Related phrases are weaker evidence than repetitions in the actual draft.
      const related = (this.cloudPhrases || []).filter(term => normalize(term).startsWith(best.key + ' '));
      if (!best.contextual && key.length >= 2 && threshold <= .80 && related.length === 1) {
        suffix += related[0].slice(best.key.length);
        return { suffix, confidence: Math.min(confidence, .80), source: 'cloud-ranked' };
      }
      // Extend only with repeated, dominant continuation evidence. Threshold, not word-count UI.
      for (let step = 0; step < 7; step++) {
        let choices;
        for (let n = Math.min(3, sequence.length); n > 0; n--) {
          choices = this.next.get(sequence.slice(-n).join(' '));
          if (choices) break;
        }
        if (!choices) break;
        const sorted = [...choices.entries()].sort((a, b) => b[1].count - a[1].count);
        const [next, data] = sorted[0], sum = sorted.reduce((s, x) => s + x[1].count, 0);
        const c = (data.count / (sum + 0.5)) * 0.98;
        phraseConfidence = Math.min(phraseConfidence, c);
        if (data.count < 2 || phraseConfidence < threshold || next === sequence.at(-1)) break;
        suffix += ' ' + data.word; sequence.push(next);
      }
      return suffix ? { suffix, confidence, source: this.ranks.has(best.key) ? 'cloud-ranked' : 'local' } : null;
    }
  }
  root.TyperEngine = Engine;
  if (typeof module !== 'undefined') module.exports = { Engine, tokens };
})(typeof globalThis !== 'undefined' ? globalThis : window);
