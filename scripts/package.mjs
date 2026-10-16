import { mkdir, readdir, readFile, writeFile, cp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
const { COMMON_WORDS } = createRequire(import.meta.url)('../extension/engine.js');
const store = process.argv.includes('--store');
const outputDir = store ? 'dist/chrome-web-store' : 'dist';
const extensionDir = outputDir + '/extension';
await cp('extension/logo.svg', 'public/favicon.svg');
await writeFile('public/common-words.json', JSON.stringify({ words: Object.keys(COMMON_WORDS), note: 'Hand-curated offline vocabulary. Weights are heuristic priors, not measured word probabilities.' }, null, 2) + '\n');
const apiUrl = process.env.TYPER_API_URL || '';
if (apiUrl) { const u = new URL(apiUrl); if (u.protocol !== 'https:' && !(u.protocol === 'http:' && ['localhost','127.0.0.1'].includes(u.hostname))) throw new Error('Public API must use HTTPS'); if (u.username || u.password || u.search || u.hash || u.pathname !== '/') throw new Error('TYPER_API_URL must be an origin'); }
await mkdir(extensionDir, { recursive: true });
await cp('extension', extensionDir, { recursive: true });
const manifest = JSON.parse(await readFile('extension/manifest.json', 'utf8'));
manifest.optional_host_permissions = apiUrl ? [new URL(apiUrl).origin + '/*'] : [];
if (store) {
  delete manifest.key; // The Web Store assigns and signs its own extension identity.
  manifest.homepage_url = 'https://mutms7.github.io/Typer.AI/';
  await cp(new URL('../store/assets/icon-128.png', import.meta.url), extensionDir + '/logo-128.png');
}
await writeFile(extensionDir + '/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
await writeFile(extensionDir + '/config.js', 'globalThis.TYPER_CONFIG = ' + JSON.stringify({ apiUrl: apiUrl.replace(/\/$/, ''), store }) + ';\n');
await cp('LICENSE', extensionDir + '/LICENSE.txt');
if (!store) await writeFile(extensionDir + '/INSTALL.txt', `Typer.AI ${manifest.version}\n\n1. Unzip this entire archive into a folder you will keep.\n2. Open chrome://extensions or edge://extensions.\n3. Enable Developer mode, then choose Load unpacked.\n4. Select the folder containing manifest.json.\n5. Refresh your writing page. Type a few letters of a word in the draft.\n6. Press Tab to accept gray text, or Escape to dismiss it.\n\n${apiUrl ? 'Live background AI is available after you enable it in the popup and allow access to ' + new URL(apiUrl).origin + '. Document excerpts are then sent to the backend and its AI provider.' : 'This build runs locally. Live background AI is unavailable because no backend is connected.'}\n\nOpen the extension popup to turn suggestions off, change confidence, or pause a site.\nSupports ordinary text inputs, textareas and contenteditable editors.\nGoogle Docs and canvas editors are not supported.\nTo update, replace the files in this folder and click Reload on the Extensions page.\nUninstall through the Extensions page to remove saved settings.\n\nPrivacy: https://mutms7.github.io/Typer.AI/privacy.html\nReport issues: https://github.com/mutms7/Typer.AI/issues\n`);
for (const name of ['engine.js','editor.js','content.js']) await cp('extension/' + name, 'public/' + name);
const crcTable = Array.from({ length: 256 }, (_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
function crc32(data) { let crc = 0xffffffff; for (const b of data) crc = crcTable[(crc ^ b) & 255] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; }
const local = [], central = []; let offset = 0;
// Include only intended release files, even if the staging folder has leftovers.
const releaseFiles = [...await readdir('extension'), 'LICENSE.txt', ...store ? [] : ['INSTALL.txt']].sort();
for (const name of releaseFiles) {
  const contents = await readFile(resolve(extensionDir, name)), filename = Buffer.from(name), crc = crc32(contents);
  const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt32LE(crc, 14); h.writeUInt32LE(contents.length, 18); h.writeUInt32LE(contents.length, 22); h.writeUInt16LE(filename.length, 26);
  local.push(h, filename, contents);
  const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt32LE(crc, 16); c.writeUInt32LE(contents.length, 20); c.writeUInt32LE(contents.length, 24); c.writeUInt16LE(filename.length, 28); c.writeUInt32LE(offset, 42);
  central.push(c, filename); offset += h.length + filename.length + contents.length;
}
const directory = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(central.length / 2, 8); end.writeUInt16LE(central.length / 2, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
const zip = Buffer.concat([...local, directory, end]);
await writeFile(outputDir + '/typer-ai.zip', zip);
if (!store) await writeFile('public/typer-ai.zip', zip);
console.log('Packaged Typer.AI (' + (store ? 'Web Store, ' : '') + (apiUrl ? 'cloud endpoint configured' : 'local mode') + ').');
