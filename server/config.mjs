import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { providerConfig } from './provider.mjs';

export function serverConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const number = (key, fallback, max = Number.MAX_SAFE_INTEGER) => {
    const value = env[key] ?? String(fallback);
    const n = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(n) || n < 1 || n > max) throw new Error('Invalid ' + key);
    return n;
  };
  const provider = providerConfig(env);
  if (production && !provider.apiKey.trim()) throw new Error('Production needs a provider API key');
  if (production && (!env.IP_HASH_SECRET || env.IP_HASH_SECRET.length < 32 || env.IP_HASH_SECRET === 'replace-with-a-long-random-secret')) throw new Error('Production needs a random IP_HASH_SECRET of at least 32 characters');
  if (production && !env.ALLOWED_ORIGINS?.trim()) throw new Error('Production needs ALLOWED_ORIGINS');
  const origins = [...new Set((env.ALLOWED_ORIGINS ?? 'http://127.0.0.1:8787,http://localhost:8787').split(',').map(s => s.trim()))];
  for (const origin of origins) {
    let url;
    try { url = new URL(origin); } catch { throw new Error('Invalid ALLOWED_ORIGINS entry'); }
    const extension = /^chrome-extension:\/\/[a-p]{32}$/.test(origin);
    const web = ['https:', 'http:'].includes(url.protocol) && url.origin === origin;
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((!extension && !web) || (production && web && url.protocol !== 'https:' && !local)) throw new Error('ALLOWED_ORIGINS needs exact HTTPS or extension origins (HTTP is allowed on localhost)');
  }
  if (env.TRUST_PROXY !== undefined && !['true', 'false'].includes(env.TRUST_PROXY)) throw new Error('TRUST_PROXY must be true or false');
  return {
    ...provider, dataDir: resolve(env.DATA_DIR || 'data'),
    dbPath: resolve(env.DATA_DIR || 'data', 'quota.sqlite'), publicDir: resolve('public'),
    host: env.HOST || '127.0.0.1', port: number('PORT', 8787, 65535),
    ipSecret: env.IP_HASH_SECRET || randomBytes(32).toString('hex'), origins,
    daily: number('DAILY_REQUEST_BUDGET', 200), monthly: number('MONTHLY_REQUEST_BUDGET', 3000),
    perIp: number('PER_IP_HOURLY_LIMIT', 20), concurrent: number('MAX_CONCURRENT_REQUESTS', 3),
    trustProxy: env.TRUST_PROXY === 'true'
  };
}
