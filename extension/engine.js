/* Shared by the extension, demo and Node tests. No network on the typing path. */
(function (root) {
  'use strict';
  const TOKEN = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*(?:\+{1,2}|#)?/gu;
  // Offline priors, not predictions after an empty prefix. Document evidence wins.
  const COMMON_WORDS = Object.freeze({
    the: 5, and: 4, to: 3, of: 3, is: 2, in: 2, for: 1.5, with: 1.5,
    a: 1, an: .3, I: 1, you: 1, we: 1, it: 1, that: .3, this: .3,
    are: 1, was: 1, were: .5, be: 1, been: .4, being: .3, have: 1, has: .7,
    had: .4, do: .8, does: .4, did: .4, can: 1, could: .4, will: 1, would: .7,
    should: .5, may: .4, might: .3, must: .3, not: 1, no: .5, or: 1, but: 1,
    if: 1, as: .7, at: .7, by: .7, on: .7, from: .7, into: .3, about: .4,
    than: .25, then: .2, there: .2, their: .2, them: .2, they: .2, these: .15, those: .15,
    our: .4, your: .4, my: .4, me: .4, its: .3, also: .3, more: .4, most: .3,
    some: .3, any: .2, all: .3, each: .3, other: .3, another: .2, same: .3,
    when: .5, where: .3, which: .4, who: .3, what: .5, how: .4, because: .5,
    so: .4, just: .3, only: .3, still: .3, even: .3, again: .3, before: .3, after: .3,
    between: .3, through: .15, both: .3, such: .2, like: .4, need: .4, want: .4,
    know: .4, think: .15, make: .4, use: .4, get: .4, help: .3, see: .3, find: .3,
    let: .3, please: .3, thanks: .3, much: .3, well: .3, very: .2
  });
  const normalize = s => s.toLocaleLowerCase('en-US');
  const tokens = s => [...s.matchAll(TOKEN)].map(m => ({ text: m[0], key: normalize(m[0]), start: m.index, end: m.index + m[0].length }));
  class Engine {
    constructor() { this.words = new Map(); this.prefixes = new Map(); this.next = new Map(); this.ranks = new Map(); }
    index(documentText, title = '') {
      this.words.clear(); this.prefixes.clear(); this.next.clear(); this.ranks.clear();
      this.cloudPhrases = [];
      for (const [word, prior] of Object.entries(COMMON_WORDS)) this.words.set(normalize(word), { word, count: 0, heading: false, common: true, prior });
      const text = documentText.slice(0, 30000), ts = tokens(text);
      const addWord = (word, weight, heading) => {
        if (word.key.length < 2 || word.key.length > 64) return;
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
          if (t.key.length < 2 || t.key.length > 64) continue;
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
    phraseCompletion(before, threshold) {
      if (threshold > .80) return null;
      const recent = before.slice(-300), typed = tokens(recent);
      if (typed.length < 2) return null;
      const matches = [];
      for (const term of this.cloudPhrases || []) {
        const phrase = tokens(term);
        for (let length = Math.min(typed.length, phrase.length); length >= 2; length--) {
          const tail = typed.slice(-length);
          if (tail.slice(0, -1).some((word, i) => word.key !== phrase[i].key)) continue;
          if (tail.some((word, i) => i && !/^[ \t]+$/.test(recent.slice(tail[i - 1].end, word.start)))) continue;
          const partial = tail.at(-1), nextWord = phrase[length - 1];
          if (!nextWord.key.startsWith(partial.key)) continue;
          const end = nextWord.start + partial.text.length;
          if (end >= term.length) continue;
          const confidence = Math.min(.80, .72 + (length - 1) * .06 + Math.min(partial.text.length, 2) * .01);
          if (confidence >= threshold) matches.push({ term, length, wordKey: nextWord.key, suffix: term.slice(end), confidence, source: 'cloud-ranked' });
          break;
        }
      }
      const longest = Math.max(0, ...matches.map(match => match.length));
      const specific = matches.filter(match => match.length === longest);
      // Use the typed phrase to disambiguate, never arbitrarily pick a continuation.
      const distinct = new Map(specific.map(match => [normalize(match.suffix), match]));
      return distinct.size === 1 ? distinct.values().next().value : null;
    }
    predict(before, threshold = 0.78, after = '') {
      if (!before || /^[\p{L}\p{N}]/u.test(after)) return null;
      const match = before.match(/([\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*(?:\+{1,2}|#)?)$/u);
      if (!match) return null; // No guesses after 'however,' or at blank line starts.
      const partial = match[1], key = normalize(partial), candidates = this.prefixes.get(key)?.filter(w => !this.words.get(w).inferred || key.length >= (threshold >= .9 ? 3 : 2));
      const cachedPhrase = this.phraseCompletion(before, threshold);
      const phraseResult = () => cachedPhrase && ({ suffix: cachedPhrase.suffix, confidence: cachedPhrase.confidence, source: cachedPhrase.source });
      if (!candidates?.length) return phraseResult();
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
        return { key: w, ...item, contextual, score: ((item.prior || 0) + Math.log2(1 + item.count) + 4 * contextual) * (this.ranks.get(w) || 1) };
      }).sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
      const best = ranked[0], total = ranked.reduce((s, t) => s + t.score, 0);
      const margin = best.score / total;
      // A confidence score is a heuristic evidence gate, NOT a calibrated probability.
      const support = best.heading || best.count >= 2 || key.length >= 3 || ((best.inferred || best.common) && key.length >= 2) || best.contextual;
      const confidence = Math.min(0.99, 0.52 + 0.39 * margin + Math.min(key.length, 5) * 0.014 + (best.contextual ? 0.04 : 0));
      const agreesWithDraft = () => {
        const sequence = [...preceding, cachedPhrase.wordKey];
        for (const next of tokens(cachedPhrase.term).slice(cachedPhrase.length)) {
          let choices;
          for (let n = Math.min(3, sequence.length); n > 0; n--) {
            choices = this.next.get(sequence.slice(-n).join(' '));
            if (choices) break;
          }
          if (choices) {
            const sorted = [...choices.entries()].sort((a, b) => b[1].count - a[1].count);
            const [word, data] = sorted[0], total = sorted.reduce((sum, [, item]) => sum + item.count, 0);
            if (data.count >= 2 && data.count / (total + .5) * .98 >= threshold && word !== next.key) return false;
          }
          sequence.push(next.key);
        }
        return true;
      };
      if (cachedPhrase && (!best.contextual || best.key === cachedPhrase.wordKey) && agreesWithDraft()) return phraseResult();
      if (!support || confidence < threshold || (key.length === 1 && margin < 0.72 && !best.contextual)) return null;
      let word = best.word;
      if (partial === partial.toUpperCase() && partial.length > 1) word = word.toUpperCase();
      else if (partial[0] === partial[0].toUpperCase()) word = word[0].toUpperCase() + word.slice(1);
      else word = normalize(word);
      let suffix = word.slice(partial.length), sequence = [...preceding, best.key], phraseConfidence = confidence;
      // Related phrases are weaker evidence than repetitions in the actual draft.
      const related = (this.cloudPhrases || []).filter(term => normalize(term).startsWith(best.key + ' '));
      const observedPhrase = term => {
        const words = tokens(term).map(t => t.key);
        return words.slice(1).every((w, i) => this.next.get(words[i])?.has(w));
      };
      const familiar = related.filter(observedPhrase);
      const phrase = familiar.length === 1 ? familiar[0] : !best.common && !best.contextual && related.length === 1 ? related[0] : null;
      if (key.length >= 2 && threshold <= .80 && phrase) {
        suffix += phrase.slice(best.key.length);
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
      return suffix ? { suffix, confidence, source: this.ranks.has(best.key) ? 'cloud-ranked' : best.common && !best.count ? 'common' : 'local' } : null;
    }
  }
  root.TyperEngine = Engine;
  root.TyperCommonWords = COMMON_WORDS;
  if (typeof module !== 'undefined') module.exports = { Engine, tokens, COMMON_WORDS };
})(typeof globalThis !== 'undefined' ? globalThis : window);
