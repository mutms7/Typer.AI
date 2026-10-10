import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createApp } from './app.mjs';
import { providerConfig } from './provider.mjs';
const number = (key, fallback) => { const n = Number(process.env[key] ?? fallback); if (!Number.isInteger(n) || n < 1) throw new Error('Invalid ' + key); return n; };
const dataDir = resolve(process.env.DATA_DIR || 'data'); mkdirSync(dataDir, { recursive: true });
if (process.env.NODE_ENV === 'production' && (!process.env.IP_HASH_SECRET || !process.env.ALLOWED_ORIGINS)) throw new Error('Production needs IP_HASH_SECRET and ALLOWED_ORIGINS');
const config = {
  ...providerConfig(),
  dbPath: resolve(dataDir, 'quota.sqlite'), publicDir: resolve('public'),
  ipSecret: process.env.IP_HASH_SECRET || randomBytes(32).toString('hex'),
  daily: number('DAILY_REQUEST_BUDGET', 200), monthly: number('MONTHLY_REQUEST_BUDGET', 3000), perIp: number('PER_IP_HOURLY_LIMIT', 20), concurrent: number('MAX_CONCURRENT_REQUESTS', 3),
  trustProxy: process.env.TRUST_PROXY === 'true', origins: (process.env.ALLOWED_ORIGINS || 'http://127.0.0.1:8787,http://localhost:8787').split(',').map(s => s.trim())
};
createApp(config).listen(number('PORT', 8787), process.env.HOST || '127.0.0.1', () => console.log('Typer.AI server started. Cloud ranking ' + (config.apiKey ? 'configured.' : 'disabled.')));
