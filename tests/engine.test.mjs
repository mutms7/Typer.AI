import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { Engine } = createRequire(import.meta.url)('../extension/engine.js');
test('document-grounded vector completion, never a generic continuation', () => {
  const e = new Engine().index('A vector has magnitude. A vector has direction. The vector represents displacement.', 'Vectors');
  assert.equal(e.predict('A v').suffix, 'ector');
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
  assert.equal(e.predict('ei', .65), null);
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
  assert.equal(e.predict('A V').suffix, 'ector');
  assert.equal(e.predict('A VE').suffix, 'CTOR');
  assert.equal(e.predict('A v', .82, 'ector'), null);
  e.index('A matrix transforms coordinates.', 'Matrix');
  assert.equal(e.predict('vec'), null);
  assert.equal(e.predict('mat').suffix, 'rix');
});
test('phrase evidence never crosses sentence punctuation', () => {
  const e = new Engine().index('A vector. Banana grows. A vector. Banana grows.', 'Vector');
  assert.equal(e.predict('A v', .65).suffix, 'ector');
});
test('unicode document vocabulary and weak one-off prefixes', () => {
  const e = new Engine().index('Énergie et accélération. Énergie et accélération.', 'Énergie');
  assert.equal(e.predict('éne').suffix, 'rgie');
  assert.equal(new Engine().index('velocity', '').predict('v'), null);
});
test('unfinished current token does not hide a useful shorter context', () => {
  const text = 'A vector has a magnitude and a direction. Vector addition combines two vectors. The vector space contains vectors and their linear combinations.\n\nThe vector represents a displacement. The vector represents a displacement.\n\nA v';
  assert.equal(new Engine().index(text, 'Vectors & linear algebra').predict(text).suffix, 'ector');
});
