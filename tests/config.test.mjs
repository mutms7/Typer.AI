import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serverConfig } from '../server/config.mjs';
const production = {
  NODE_ENV: 'production', AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'test-key-not-real',
  IP_HASH_SECRET: 'test-secret-32-characters-or-longer',
  ALLOWED_ORIGINS: 'https://mutms7.github.io,chrome-extension://' + 'a'.repeat(32),
  DATA_DIR: './data', HOST: '0.0.0.0'
};

test('production config uses the current model, exact origins and bounded settings', () => {
  const config = serverConfig(production);
  assert.equal(config.model, 'gemini-3.1-flash-lite');
  assert.equal(config.host, '0.0.0.0');
  assert.equal(config.trustProxy, false);
  assert.equal(config.daily, 200);
  assert.equal(config.origins.length, 2);
  assert.equal(serverConfig({ ...production, ALLOWED_ORIGINS: 'https://mutms7.github.io, https://mutms7.github.io' }).origins.length, 1);
  assert.equal(serverConfig({}).apiKey, '');
});

test('production config rejects missing secrets and malformed origin lists without echoing values', () => {
  for (const patch of [{ GEMINI_API_KEY: '' }, { IP_HASH_SECRET: '' }, { IP_HASH_SECRET: 'replace-with-a-long-random-secret' }, { ALLOWED_ORIGINS: '' }]) assert.throws(() => serverConfig({ ...production, ...patch }));
  for (const origin of ['*', 'null', 'https://example.com/', 'https://example.com/path', 'https://user:private@example.com', 'http://example.com', 'chrome-extension://invalid', 'https://example.com,']) {
    assert.throws(() => serverConfig({ ...production, ALLOWED_ORIGINS: origin }), error => !error.message.includes(origin) && !error.message.includes('private'));
  }
  assert.equal(serverConfig({ ...production, ALLOWED_ORIGINS: 'http://127.0.0.1:8787' }).origins[0], 'http://127.0.0.1:8787');
});

test('invalid port, budgets and proxy flags fail before startup', () => {
  for (const [key, values] of Object.entries({ PORT: ['0', '65536', '1.5'], DAILY_REQUEST_BUDGET: ['0', '-1', 'Infinity', '9007199254740992', ''], MAX_CONCURRENT_REQUESTS: ['abc'], TRUST_PROXY: ['yes', 'TRUE'] })) {
    for (const value of values) assert.throws(() => serverConfig({ ...production, [key]: value }), new RegExp(key));
  }
});
