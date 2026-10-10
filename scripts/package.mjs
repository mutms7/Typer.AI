import { mkdir, readdir, readFile, writeFile, cp } from 'node:fs/promises';
import { resolve } from 'node:path';
const apiUrl = process.env.TYPER_API_URL || '';
if (apiUrl) { const u = new URL(apiUrl); if (u.protocol !== 'https:' && !['localhost','127.0.0.1'].includes(u.hostname)) throw new Error('Public API must use HTTPS'); if (u.username || u.password || u.search || u.hash || u.pathname !== '/') throw new Error('TYPER_API_URL must be an origin'); }
await mkdir('dist/extension', { recursive: true });
await cp('extension', 'dist/extension', { recursive: true });
await writeFile('dist/extension/config.js', 'globalThis.TYPER_CONFIG = ' + JSON.stringify({ apiUrl: apiUrl.replace(/\/$/, '') }) + ';\n');
for (const name of ['engine.js','editor.js','content.js']) await cp('extension/' + name, 'public/' + name);
const crcTable = Array.from({ length: 256 }, (_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
function crc32(data) { let crc = 0xffffffff; for (const b of data) crc = crcTable[(crc ^ b) & 255] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; }
const local = [], central = []; let offset = 0;
for (const name of (await readdir('dist/extension')).sort()) {
  const contents = await readFile(resolve('dist/extension', name)), filename = Buffer.from(name), crc = crc32(contents);
  const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt32LE(crc, 14); h.writeUInt32LE(contents.length, 18); h.writeUInt32LE(contents.length, 22); h.writeUInt16LE(filename.length, 26);
  local.push(h, filename, contents);
  const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt32LE(crc, 16); c.writeUInt32LE(contents.length, 20); c.writeUInt32LE(contents.length, 24); c.writeUInt16LE(filename.length, 28); c.writeUInt32LE(offset, 42);
  central.push(c, filename); offset += h.length + filename.length + contents.length;
}
const directory = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(central.length / 2, 8); end.writeUInt16LE(central.length / 2, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
const zip = Buffer.concat([...local, directory, end]);
await writeFile('dist/typer-ai.zip', zip); await writeFile('public/typer-ai.zip', zip);
console.log('Packaged Typer.AI (' + (apiUrl ? 'cloud endpoint configured' : 'local mode') + ').');
