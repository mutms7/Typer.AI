import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const source = readFileSync(new URL('../extension/content.js', import.meta.url), 'utf8');

async function contentHarness(cloudEnabled = true) {
  let now = 100000, text = 'A vector has magnitude and direction. '.repeat(3), response = { terms: ['quaternion'] }, calls = 0;
  const timers = new Map(), listeners = new Map(), rankingUpdates = [];
  let nextTimer = 1, settingsChanged;
  let title = 'Vectors';
  const active = { getAttribute: () => title, closest: () => null };
  const node = () => ({ style: {}, textContent: '' });
  const host = { dataset: {}, style: {}, setAttribute() {}, attachShadow: () => ({ adoptedStyleSheets: [], querySelector: node }) };
  const settings = { enabled: true, threshold: .78, cloud: cloudEnabled, excluded: [] };
  class Engine { setRanks(terms) { rankingUpdates.push([...terms]); } }
  const document = {
      activeElement: active, hidden: false, title: 'Vectors', documentElement: { append() {} }, createElement: () => host,
      addEventListener: (name, listener) => listeners.set(name, listener)
  };
  const requests = [];
  runInNewContext(source, {
    document,
    window: { addEventListener() {} }, location: { hostname: 'example.com' },
    TyperEngine: Engine, TyperEditor: { editorFor: target => target === active ? active : null, snapshot: () => ({ text, before: text, after: '' }) },
    CSSStyleSheet: class { replaceSync() {} }, performance: { now: () => now },
    Date: { now: () => now }, requestAnimationFrame: () => 1,
    setTimeout: (fn, delay) => { const id = nextTimer++; timers.set(id, { fn, delay }); return id; }, clearTimeout: id => timers.delete(id),
    chrome: { runtime: { id: 'test-extension',
      sendMessage: async message => message.type === 'settings' ? { settings } : (requests.push(message), calls++, response),
      onMessage: { addListener: listener => { settingsChanged = listener; } }
    } }
  });
  await Promise.resolve();
  return {
    get calls() { return calls; }, rankingUpdates, requests,
    title(value) { title = value; },
    visibility(hidden) { document.hidden = hidden; listeners.get('visibilitychange')(); },
    composition(start) { listeners.get(start ? 'compositionstart' : 'compositionend')(); },
    pageContext() { let result; settingsChanged({type:'pageContext'}, {}, value=>{result=value;}); return result; },
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

test('unavailable cloud refresh retries with backoff and stops after three retries', async () => {
  const h = await contentHarness(); h.response({ terms: [] });
  await h.fire(); assert.equal(h.delay, 45000);
  h.time(45000); await h.fire(); assert.equal(h.delay, 90000);
  h.time(135000); await h.fire(); assert.equal(h.delay, 180000);
  h.time(315000); await h.fire(); assert.equal(h.delay, undefined);
  assert.equal(h.calls, 4);
});

test('returning to a visible document resumes its interrupted refresh', async () => {
  const h = await contentHarness();
  h.visibility(true);
  assert.equal(h.delay, undefined);
  assert.equal(h.calls, 0);
  h.visibility(false);
  assert.equal(h.delay, 1800);
  await h.fire();
  assert.equal(h.calls, 1);
  h.time(20000); h.changeText(); h.visibility(true); h.visibility(false);
  await h.fire();
  assert.equal(h.calls, 1);
  assert.equal(h.delay, 25000);
  h.time(45000); await h.fire();
  assert.equal(h.calls, 2);
});

test('IME composition defers background refresh until text is committed', async () => {
  const h = await contentHarness();
  h.composition(true);
  assert.equal(h.delay, undefined);
  h.changeText(); await h.fire();
  assert.equal(h.calls, 0);
  h.composition(false);
  assert.equal(h.delay, 1800);
  await h.fire();
  assert.equal(h.calls, 1);
});

test('custom editor titles are bounded before sending a cloud request', async () => {
  const h = await contentHarness();
  h.title('Long heading '.repeat(50));
  await h.fire();
  assert.equal(h.requests[0].title.length, 300);
});

test('page context exposes only the current frame hostname for popup site controls', async () => {
  const h = await contentHarness();
  assert.equal(h.pageContext().hostname,'example.com');
  assert.deepEqual(Object.keys(h.pageContext()),['hostname']);
  assert.equal(h.calls,0);
});
