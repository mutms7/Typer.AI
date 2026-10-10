import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SupabaseLedger } from '../server/supabase-ledger.mjs';
import { createApp } from '../server/app.mjs';
import { resolve } from 'node:path';
const config = { supabaseUrl: 'https://test.supabase.co', supabaseKey: 'sb_secret_test-not-real', ipSecret: 'test-ip-secret', daily: 2, monthly: 4, perIp: 2 };

test('Supabase reservations send only hashed quota windows with server authentication', async () => {
  const ledger = new SupabaseLedger(config, async (url, init) => {
    assert.equal(url, config.supabaseUrl + '/rest/v1/rpc/typer_reserve_quota');
    assert.equal(init.headers.apikey, config.supabaseKey);
    assert.equal(init.headers.Authorization, undefined);
    assert.equal(init.redirect, 'error');
    const body = JSON.parse(init.body);
    assert.deepEqual(body.p_limits, [2, 4, 2]);
    assert.equal(body.p_keys[0], 'day:2026-10-10');
    assert.equal(body.p_keys[1], 'month:2026-10');
    assert.match(body.p_keys[2], /^ip:2026-10-10T12:[a-f0-9]{64}$/);
    assert.ok(!init.body.includes('198.51.100.1'));
    assert.ok(!init.body.includes(config.supabaseKey));
    return { ok: true, json: async () => true };
  });
  assert.equal(await ledger.reserve('198.51.100.1', new Date('2026-10-10T12:00:00Z')), true);
});

test('Supabase quota limits and failures never authorize extra calls', async () => {
  const denied = new SupabaseLedger(config, async () => ({ ok: true, json: async () => false }));
  assert.equal(await denied.reserve('ip'), false);
  for (const response of [{ ok: false }, { ok: true, json: async () => ({ error: config.supabaseKey }) }]) {
    const ledger = new SupabaseLedger(config, async () => response);
    await assert.rejects(ledger.reserve('ip'), e => !e.message.includes(config.supabaseKey));
  }
  const legacy = new SupabaseLedger({ ...config, supabaseKey: 'legacy-jwt' }, async (_url, init) => {
    assert.equal(init.headers.Authorization, 'Bearer legacy-jwt');
    return { ok: true, json: async () => true };
  });
  assert.equal(await legacy.healthy(), true);
});

test('database outage disables cloud calls and readiness, preserving local fallback', async () => {
  let providerCalls = 0;
  const ledger = { healthy: async () => { throw Error('private database error'); }, reserve: async () => { throw Error('private database error'); }, close() {} };
  const app = createApp({ ...config, apiKey: 'test-key', origins: ['http://test.local'], concurrent: 1, publicDir: resolve('public') }, async () => { providerCalls++; return ['vector']; }, ledger);
  await new Promise(r => app.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + app.address().port;
  try {
    assert.equal((await fetch(url + '/ready')).status, 503);
    const res = await fetch(url + '/api/rank', { method: 'POST', headers: { Origin: 'http://test.local', 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'A vector has magnitude and direction.', title: '' }) });
    assert.equal(res.status, 503);
    assert.ok(!(await res.text()).includes('private database error'));
    assert.equal(providerCalls, 0);
  } finally { await new Promise(r => app.close(r)); }
});

test('concurrency counts pending remote quota reservations', async () => {
  let release, entered;
  const started = new Promise(r => { entered = r; });
  const reservation = new Promise(r => { release = r; });
  const ledger = { healthy: async () => true, reserve: () => { entered(); return reservation; }, close() {} };
  let calls = 0;
  const app = createApp({ ...config, apiKey: 'test-key', origins: ['http://test.local'], concurrent: 1, publicDir: resolve('public') }, async () => { calls++; return ['vector']; }, ledger);
  await new Promise(r => app.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + app.address().port;
  const send = () => fetch(url + '/api/rank', { method: 'POST', headers: { Origin: 'http://test.local', 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'A vector has magnitude and direction.', title: '' }) });
  let first;
  try {
    first = send(); await started;
    assert.equal((await send()).status, 429);
    assert.equal(calls, 0);
    release(true); assert.equal((await first).status, 200);
    assert.equal(calls, 1);
  } finally { release(false); if (first) await first; await new Promise(r => app.close(r)); }
});
