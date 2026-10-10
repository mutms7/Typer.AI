import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { rankVocabulary } from './provider.mjs';
import { Ledger } from './ledger.mjs';
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.zip': 'application/zip', '.ttf': 'font/ttf' };
export function createApp(config, provider = rankVocabulary) {
  const ledger = new Ledger(config.dbPath, config);
  let inflight = 0;
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");
    const json = (status, body) => { if (!res.destroyed) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); } };
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (pathname === '/health' && req.method === 'GET') return json(200, { ok: true, cloudConfigured: Boolean(config.apiKey), version: '0.1.0' });
      if (pathname === '/api/rank') {
        const origin = req.headers.origin;
        if (!origin || !config.origins.includes(origin)) return json(403, { error: 'Origin not allowed' });
        res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin');
        if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' }); return res.end(); }
        if (req.method !== 'POST') return json(405, { error: 'Use POST' });
        if (!req.headers['content-type']?.startsWith('application/json')) return json(415, { error: 'Expected JSON' });
        if (Number(req.headers['content-length']) > 30000) return json(413, { error: 'Excerpt too large' });
        const chunks = []; let bytes = 0;
        for await (const chunk of req) { bytes += chunk.length; if (bytes > 30000) { json(413, { error: 'Excerpt too large' }); return; } chunks.push(chunk); }
        const raw = Buffer.concat(chunks).toString('utf8');
        let body; try { body = JSON.parse(raw); } catch { return json(400, { error: 'Invalid JSON' }); }
        if (!body || typeof body.text !== 'string' || typeof body.title !== 'string' || body.text.length < 20 || body.text.length > 6000 || body.title.length > 300) return json(400, { error: 'Expected text (20–6000 characters) and title (up to 300 characters)' });
        if (!config.apiKey) return json(503, { error: 'Cloud ranking is not configured. Local predictions remain available.' });
        if (inflight >= config.concurrent) return json(429, { error: 'Busy. Keep using local predictions.' });
        const ip = config.trustProxy ? String(req.headers['x-forwarded-for'] || req.socket.remoteAddress).split(',')[0].trim() : req.socket.remoteAddress || 'unknown';
        if (!ledger.reserve(ip)) return json(429, { error: 'Ranking limit reached. Local predictions remain available.' });
        // Every provider attempt consumes a durable allowance, including failed attempts.
        inflight++;
        const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 30000);
        const onClose = () => { if (!res.writableEnded) controller.abort(); };
        res.on('close', onClose);
        try { const terms = await provider(body, config, controller.signal); return json(200, { terms }); }
        catch { return json(502, { error: 'Cloud ranking unavailable. Local predictions remain available.' }); }
        finally { clearTimeout(timer); res.off('close', onClose); inflight--; }
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') return json(405, { error: 'Use GET' });
      const base = resolve(config.publicDir), relative = decodeURIComponent(pathname === '/' ? '/index.html' : pathname), file = resolve(base, '.' + relative);
      if (!file.startsWith(base + sep)) return json(403, { error: 'Forbidden' });
      const ext = file.slice(file.lastIndexOf('.'));
      if (!mime[ext]) return json(404, { error: 'Not found' });
      try { const contents = await readFile(file); res.writeHead(200, { 'Content-Type': mime[ext] }); res.end(req.method === 'HEAD' ? undefined : contents); }
      catch { return json(404, { error: 'Not found' }); }
    } catch { if (!res.headersSent) json(500, { error: 'Request failed' }); else res.end(); }
  });
  server.requestTimeout = 15000; server.headersTimeout = 10000;
  server.on('close', () => ledger.close());
  return server;
}
