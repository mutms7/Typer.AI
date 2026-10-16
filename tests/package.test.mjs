import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
test('store packages isolate identity and permissions without replacing the website download', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'typer-packaging-'));
  try {
    await mkdir(join(directory, 'public'));
    await cp(join(root, 'extension'), join(directory, 'extension'), { recursive: true });
    await cp(join(root, 'LICENSE'), join(directory, 'LICENSE'));
    const run = (store, apiUrl) => execFileSync(process.execPath, [join(root, 'scripts/package.mjs'), ...store ? ['--store'] : []], {
      cwd: directory, env: { ...process.env, TYPER_API_URL: apiUrl }, stdio: 'pipe'
    });
    const json = async path => JSON.parse(await readFile(join(directory, path), 'utf8'));
    run(false, 'https://typer-ai.onrender.com');
    const download = await readFile(join(directory, 'public/typer-ai.zip'));
    const direct = await json('dist/extension/manifest.json');
    assert.ok(direct.key);
    run(true, '');
    const store = await json('dist/chrome-web-store/extension/manifest.json');
    assert.equal(store.key, undefined);
    assert.equal(store.homepage_url, 'https://mutms7.github.io/Typer.AI/');
    assert.deepEqual(store.optional_host_permissions, []);
    assert.deepEqual(await readFile(join(directory, 'public/typer-ai.zip')), download);
    assert.ok(!(await readdir(join(directory, 'dist/chrome-web-store/extension'))).includes('INSTALL.txt'));
    const zip = await readFile(join(directory, 'dist/chrome-web-store/typer-ai.zip'));
    const entries = new Map();
    let position = 0;
    while (zip.readUInt32LE(position) === 0x04034b50) {
      const size = zip.readUInt32LE(position + 18), nameLength = zip.readUInt16LE(position + 26), extraLength = zip.readUInt16LE(position + 28);
      const name = zip.subarray(position + 30, position + 30 + nameLength).toString();
      const start = position + 30 + nameLength + extraLength;
      entries.set(name, zip.subarray(start, start + size));
      position = start + size;
    }
    assert.ok(entries.has('manifest.json'));
    assert.equal(entries.has('INSTALL.txt'), false);
    assert.equal(entries.has('.env'), false);
    assert.equal(JSON.parse(entries.get('manifest.json')).key, undefined);
    assert.match(entries.get('config.js').toString(), /"apiUrl":""/);
    run(true, 'https://typer-ai.onrender.com');
    assert.deepEqual((await json('dist/chrome-web-store/extension/manifest.json')).optional_host_permissions, ['https://typer-ai.onrender.com/*']);
    assert.deepEqual(await readFile(join(directory, 'public/typer-ai.zip')), download);
  } finally {
    if (!resolve(directory).startsWith(resolve(tmpdir()) + '\\typer-packaging-') && !resolve(directory).startsWith(resolve(tmpdir()) + '/typer-packaging-')) throw new Error('Unexpected packaging test directory');
    await rm(directory, { recursive: true, force: true });
  }
});
