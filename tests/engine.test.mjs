import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const { Engine } = createRequire(import.meta.url)('../extension/engine.js');
test('document-grounded vector completion, never a generic continuation', () => {
  const e = new Engine().index('A vector has magnitude. A vector has direction. The vector represents displacement.', 'Vectors');
  assert.equal(e.predict('A v', .82).suffix, 'ector');
  assert.equal(e.predict('however,'), null);
  assert.equal(e.predict('however, '), null);
  assert.equal(e.predict(''), null);
  assert.equal(e.predict('A q'), null);
});
test('confidence gates ambiguity and repeated phrase length', () => {
  const e = new Engine().index('A transformation on x changes coordinates. A transformation on x changes coordinates.', 'Transformation on x');
  assert.equal(e.predict('This is a tr', .82).suffix, 'ansformation');
  assert.ok(e.predict('This is a tr', .7).suffix.startsWith('ansformation on x'));
  assert.equal(e.predict('This is a tr', .99), null);
  const ambiguous = new Engine().index('Velocity varies. Vectors vary. Volume varies.', '');
  assert.equal(ambiguous.predict('v', .82), null);
});
test('related cloud words require a stronger prefix and clear on opt-out', () => {
  const e = new Engine().index('A vector has magnitude.', 'Vectors');
  e.setRanks(['eigenvalue', 'vector']);
  assert.equal(e.predict('e', .65), null);
  assert.equal(e.predict('ei', .78).suffix, 'genvalue');
  assert.equal(e.predict('ei', .9), null);
  assert.equal(e.predict('eig', .82).suffix, 'envalue');
  assert.equal(e.predict('A ve').source, 'cloud-ranked');
  e.setRanks([]);
  assert.equal(e.predict('eig', .65), null);
  assert.equal(e.predict('A ve').source, 'local');
});
test('inferred phrases respect confidence and do not invent sentence evidence', () => {
  const e = new Engine().index('We study matrices and vectors.', 'Linear algebra');
  e.setRanks(['eigenvalue decomposition']);
  assert.equal(e.predict('eig', .82).suffix, 'envalue');
  assert.equal(e.predict('eig', .7).suffix, 'envalue decomposition');
  assert.equal(e.predict('however,', .65), null);
  e.setRanks(['eigenvalue decomposition', 'eigenvalue problem']);
  assert.equal(e.predict('eig', .7).suffix, 'envalue');
  e.index('An email about an internship.', 'Job opportunity');
  assert.equal(e.predict('eig', .65), null);
});
test('case, mid-word safety and indexing isolation', () => {
  const e = new Engine().index('A vector has magnitude. A vector has direction.', 'Vector');
  assert.equal(e.predict('A V', .82).suffix, 'ector');
  assert.equal(e.predict('A VE', .82).suffix, 'CTOR');
  assert.equal(e.predict('A v', .82, 'ector'), null);
  e.index('A matrix transforms coordinates.', 'Matrix');
  assert.equal(e.predict('vec'), null);
  assert.equal(e.predict('mat').suffix, 'rix');
});

test('completion cannot insert into contractions, hyphenated words, or language suffixes', () => {
  const e = new Engine().index('Welcome welcome welcome. Colour colour colour. Coding coding coding.', '');
  for (const tail of ["'re", '’re', '-known']) assert.equal(e.predict('we', .65, tail), null);
  for (const tail of ['+', '++', '#']) assert.equal(e.predict('co', .65, tail), null);
  assert.ok(e.predict('wel', .65, "' "));
  assert.ok(e.predict('wel', .65, '.'));
});
test('phrase evidence never crosses sentence punctuation', () => {
  const e = new Engine().index('A vector. Banana grows. A vector. Banana grows.', 'Vector');
  assert.equal(e.predict('A v', .65).suffix, 'ector');
});

test('typed context resets at punctuation and line breaks', () => {
  const engine = new Engine().index('Regarding the interview. Regarding the interview.', '');
  assert.equal(engine.predict('regarding t').suffix, 'he interview');
  for (const boundary of ['. ', ', ', ': ', '! ', '? ', '\n', '\n\n']) {
    assert.deepEqual(engine.predict('regarding' + boundary + 't'), engine.predict('t'));
  }
  assert.equal(engine.predict('regarding\tt').suffix, 'he interview');
});
test('unicode document vocabulary and weak one-off prefixes', () => {
  const e = new Engine().index('Énergie et accélération. Énergie et accélération.', 'Énergie');
  assert.equal(e.predict('éne', .82).suffix, 'rgie');
  assert.equal(new Engine().index('velocity', '').predict('v'), null);
});
test('80th cloud term remains usable and default completes repeated phrases', () => {
  const e = new Engine().index('We study vectors.', 'Vectors');
  e.setRanks([...Array.from({ length: 79 }, (_, i) => 'topic' + i), 'quaternion']);
  assert.equal(e.predict('qu').suffix, 'aternion');
  e.index('A vector has magnitude. A vector has direction.', 'Vectors');
  assert.equal(e.predict('A v').suffix, 'ector has');
});
test('technical language names preserve plus suffixes during completion', () => {
  const e = new Engine().index('A software engineering internship.', 'Job opportunity');
  e.setRanks(['C++', 'JavaScript']);
  assert.equal(e.predict('I use C+').suffix, '+');
  assert.equal(e.predict('ja').suffix, 'vascript');
});
test('observed context wins over a related cloud phrase', () => {
  const e = new Engine().index('A linear transformation maps vectors. A linear transformation changes coordinates.', 'Linear transformations');
  e.setRanks(['transformation matrix']);
  assert.equal(e.predict('This is a linear tr').suffix, 'ansformation');
});
test('ordinary words work offline and survive clearing AI vocabulary', () => {
  const e = new Engine().index('', '');
  assert.equal(e.predict('th').suffix, 'e');
  assert.equal(e.predict('an').suffix, 'd');
  e.setRanks(['and the', 'cloud']);
  assert.equal(e.predict('an').suffix, 'd');
  e.setRanks([]);
  assert.equal(e.predict('th').suffix, 'e');
  assert.equal(e.predict('however, '), null);
});
test('local sentence evidence distinguishes common words', () => {
  const e = new Engine().index('These scores are in order. These scores are in order.', 'Quiz scores');
  assert.ok(e.predict('Scores ar').suffix.startsWith('e'));
  assert.equal(e.predict('th', .78, 'e'), null);
});
test('unfinished current token does not hide a useful shorter context', () => {
  const text = 'A vector has a magnitude and a direction. Vector addition combines two vectors. The vector space contains vectors and their linear combinations.\n\nThe vector represents a displacement. The vector represents a displacement.\n\nA v';
  assert.equal(new Engine().index(text, 'Vectors & linear algebra').predict(text).suffix, 'ector');
});

test('typed phrase context makes every email cache entry reachable', () => {
  const sample = JSON.parse(readFileSync('public/demo-vocabulary.json', 'utf8')).samples.email;
  const engine = new Engine().index(sample.document, sample.title);
  engine.setRanks(sample.terms);
  for (const term of sample.terms) {
    const reachable = Array.from({ length: term.length - 2 }, (_, i) => term.slice(0, i + 2)).some(prefix => {
      const suggestion = engine.predict(prefix);
      return suggestion && (prefix + suggestion.suffix).toLowerCase().startsWith(term.toLowerCase());
    });
    assert.ok(reachable, 'Unreachable email entry: ' + term);
  }
  assert.equal(engine.predict('regarding m').suffix, 'y');
  assert.equal(engine.predict('as well a').suffix, 's');
  assert.equal(engine.predict('would li').suffix, 'ke to');
  for (const [prefix, word] of [['ba', 'background'], ['exp', 'experience'], ['proc', 'process'], ['prof', 'professional'], ['ope', 'opening'], ['des', 'description'], ['inq', 'inquiry'], ['cont', 'contact'], ['sk', 'skills'], ['ac', 'academic'], ['proj', 'projects'], ['te', 'technical'], ['dev', 'development'], ['cod', 'coding'], ['por', 'portfolio']]) {
    assert.equal(prefix + engine.predict(prefix).suffix, word);
  }
});

test('phrase matching respects ambiguity, punctuation, confidence and document evidence', () => {
  const engine = new Engine().index('Regarding the interview. Regarding the interview.', '');
  engine.setRanks(['regarding team', 'in my opinion', 'in my experience', 'as well as']);
  assert.equal(engine.predict('regarding t').suffix, 'he interview');
  assert.equal(engine.phraseCompletion('in my', .78), null);
  assert.equal(engine.phraseCompletion('in my op', .78).suffix, 'inion');
  assert.equal(engine.phraseCompletion('as. well a', .78), null);
  assert.equal(engine.phraseCompletion('as\nwell a', .78), null);
  assert.equal(engine.phraseCompletion('as well a', .9), null);
  assert.equal(engine.predict('as well a', .78, 's'), null);
  engine.setRanks([]);
  assert.equal(engine.phraseCompletion('as well a', .78), null);
  engine.index('Find the mean. Find the mean.', '');
  engine.setRanks(['find the median']);
  assert.equal(engine.predict('find th').suffix, 'e mean');
});
