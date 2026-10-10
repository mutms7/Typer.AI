import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createApp } from '../server/app.mjs';
import { groundedTerms, rankWithOpenAI } from '../server/provider.mjs';
import { Ledger } from '../server/ledger.mjs';
const base = { apiKey: 'test-key-not-real', model: 'gpt-4.1-mini', ipSecret: 'test-secret', daily: 2, monthly: 4, perIp: 2, concurrent: 2, trustProxy: false, origins: ['http://test.local'], publicDir: resolve('public') };
test('provider schema, no stored response, exact corpus validation', async () => {
  assert.deepEqual(groundedTerms(['vector', 'invented', 'ect', 'vector', '<script>', 'transformation on x'], 'A vector and transformation on x.', ''), ['vector','transformation on x']);
  let captured;
  const terms = await rankWithOpenAI({ text: 'The vector has direction.', title: 'Vectors' }, base, new AbortController().signal, async (url, init) => {
    captured = JSON.parse(init.body);
    assert.equal(url, 'https://api.openai.com/v1/responses');
    return { ok: true, json: async () => ({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({ terms: ['vector','banana'] }) }] }] }) };
  });
  assert.equal(captured.store, false); assert.equal(captured.text.format.strict, true);
  assert.deepEqual(terms, ['vector']);
});
test('quota reservations persist across restart and failed attempts', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'typer-quota-'));
  try {
    const path = join(dir, 'quota.db'); let ledger = new Ledger(path, base);
    assert.equal(ledger.reserve('test-ip'), true); ledger.close();
    ledger = new Ledger(path, base); assert.equal(ledger.reserve('test-ip'), true);
    assert.equal(ledger.reserve('test-ip'), false); assert.equal(ledger.reserve('different-ip'), false); ledger.close();
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test('HTTP integration: origin, validation, rate limits, secret isolation and fallback', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'typer-http-'));
  let calls = 0;
  const app = createApp({ ...base, dbPath: join(dir,'quota.db') }, async () => { calls++; return ['vector']; });
  await new Promise(r => app.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + app.address().port;
  const send = (body, origin = 'http://test.local') => fetch(url + '/api/rank', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify(body) });
  try {
    const body = { text: 'A vector has magnitude and direction.', title: 'Vectors' };
    assert.equal((await send(body, 'http://evil.local')).status, 403);
    assert.equal((await send(body, '')).status, 403);
    assert.equal((await send({ text: 'short', title: '' })).status, 400);
    assert.equal((await send({ text: 'x'.repeat(6001), title: '' })).status, 400);
    assert.deepEqual(await (await send(body)).json(), { terms: ['vector'] });
    assert.equal((await send(body)).status, 200);
    assert.equal((await send(body)).status, 429); assert.equal(calls, 2);
    const health = await (await fetch(url + '/health')).text(); assert.ok(!health.includes(base.apiKey));
    assert.equal((await fetch(url + '/server/provider.mjs')).status, 404);
  } finally { await new Promise(r => app.close(r)); await rm(dir, { recursive: true, force: true }); }
});
test('missing key returns a recoverable cloud status without consuming provider calls', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'typer-offline-'));
  const app = createApp({ ...base, apiKey: '', dbPath: join(dir,'q.db') }, () => { throw new Error('should not run'); });
  await new Promise(r => app.listen(0, '127.0.0.1', r));
  try {
    const res = await fetch('http://127.0.0.1:' + app.address().port + '/api/rank', { method: 'POST', headers: { Origin: 'http://test.local', 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'A vector has magnitude and direction.', title: 'Vectors' }) });
    assert.equal(res.status, 503);
  } finally { await new Promise(r => app.close(r)); await rm(dir, { recursive: true, force: true }); }
});
