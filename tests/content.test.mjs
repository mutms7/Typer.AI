import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const source = readFileSync(new URL('../extension/content.js', import.meta.url), 'utf8');

async function contentHarness(cloudEnabled = true) {
  let now = 100000, text = 'A vector has magnitude and direction. '.repeat(3), response = { terms: ['quaternion'] }, calls = 0;
  const timers = new Map(), listeners = new Map(), rankingUpdates = [];
  let nextTimer = 1, settingsChanged;
  const active = { getAttribute: () => 'Vectors', closest: () => null };
  const node = () => ({ style: {}, textContent: '' });
  const host = { dataset: {}, style: {}, setAttribute() {}, attachShadow: () => ({ adoptedStyleSheets: [], querySelector: node }) };
  const settings = { enabled: true, threshold: .78, cloud: cloudEnabled, excluded: [] };
  class Engine { setRanks(terms) { rankingUpdates.push([...terms]); } }
  runInNewContext(source, {
    document: {
      activeElement: active, hidden: false, title: 'Vectors', documentElement: { append() {} }, createElement: () => host,
      addEventListener: (name, listener) => listeners.set(name, listener)
    },
    window: { addEventListener() {} }, location: { hostname: 'example.com' },
    TyperEngine: Engine, TyperEditor: { editorFor: target => target === active ? active : null, snapshot: () => ({ text, before: text, after: '' }) },
    CSSStyleSheet: class { replaceSync() {} }, performance: { now: () => now },
    Date: { now: () => now }, requestAnimationFrame: () => 1,
    setTimeout: (fn, delay) => { const id = nextTimer++; timers.set(id, { fn, delay }); return id; }, clearTimeout: id => timers.delete(id),
    chrome: { runtime: { id: 'test-extension',
      sendMessage: async message => message.type === 'settings' ? { settings } : (calls++, response),
      onMessage: { addListener: listener => { settingsChanged = listener; } }
    } }
  });
  await Promise.resolve();
  return {
    get calls() { return calls; }, rankingUpdates,
    changeText() { text += 'New context. '; listeners.get('input')({ target: active }); },
    settings(patch) { settingsChanged({ type: 'settingsChanged', settings: { ...settings, ...patch } }); },
    response(value) { response = value; },
    time(value) { now = 100000 + value; },
    async fire() { const [id, timer] = [...timers].at(-1); timers.delete(id); await timer.fn(); return timer.delay; },
    get delay() { return [...timers.values()].at(-1)?.delay; }
  };
}

test('cloud enable schedules a refresh without another keystroke', async () => {
  const h = await contentHarness(false);
  await h.fire(); assert.equal(h.calls, 0);
  h.settings({ cloud: true });
  assert.equal(h.delay, 1800);
  await h.fire(); assert.equal(h.calls, 1);
});

test('edits during the cooldown refresh once the interval expires', async () => {
  const h = await contentHarness();
  await h.fire(); assert.equal(h.calls, 1);
  h.time(20000); h.changeText(); await h.fire();
  assert.equal(h.calls, 1); assert.equal(h.delay, 25000);
  h.time(45000); await h.fire(); assert.equal(h.calls, 2);
});

test('failed refresh can retry unchanged text, successful text stays cached', async () => {
  const h = await contentHarness();
  h.response({ terms: [] }); await h.fire();
  h.response({ terms: ['quaternion'] }); h.time(45000); h.settings({ threshold: .8 }); await h.fire();
  assert.equal(h.calls, 2);
  h.time(90000); h.settings({ threshold: .82 }); await h.fire();
  assert.equal(h.calls, 2);
});

test('confidence changes retain cloud vocabulary and opting out clears it', async () => {
  const h = await contentHarness(); await h.fire();
  assert.deepEqual(h.rankingUpdates, [['quaternion']]);
  h.settings({ threshold: .9 });
  assert.deepEqual(h.rankingUpdates, [['quaternion']]);
  h.settings({ cloud: false });
  assert.deepEqual(h.rankingUpdates, [['quaternion'], []]);
  assert.equal(h.delay, undefined);
});
