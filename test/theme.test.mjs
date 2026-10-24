import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { DEFAULTS, sanitize, parseRange } from '../src/model.js';
import { createHandlers, findWallpaper, apply } from '../src/host.js';

test('ranges support seeking and reject invalid or multiple byte ranges', () => {
  assert.deepEqual(parseRange('bytes=2-5', 10), { start: 2, end: 5 });
  assert.deepEqual(parseRange('bytes=7-', 10), { start: 7, end: 9 });
  assert.deepEqual(parseRange('bytes=-3', 10), { start: 7, end: 9 });
  assert.deepEqual(parseRange('bytes=0-999', 10), { start: 0, end: 9 });
  for (const header of ['bytes=-0', 'bytes=10-', 'bytes=4-2', 'bytes=0-1,4-5', 'bytes=9007199254740992-', 'nonsense']) assert.equal(parseRange(header, 10), false);
});

test('settings clamp values, reject unknown fields and preserve omitted preferences', () => {
  const result = sanitize({ backgroundOpacity: 999, panelOpacity: -2, radius: NaN, backgroundFile: 'a\0b', arbitrarySecret: 'ignored' }, { ...DEFAULTS, blur: 29 });
  assert.equal(result.backgroundOpacity, 1); assert.equal(result.panelOpacity, .1);
  assert.equal(result.radius, DEFAULTS.radius); assert.equal(result.blur, 29);
  assert.equal(result.backgroundFile, ''); assert.equal('arbitrarySecret' in result, false);
});

test('media is discovered from Steam libraries and rejects paths outside its workshop directory', async t => {
  const parent = resolve('test-results'); await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(join(parent, 'discovery-'));
  t.after(async () => { assert.ok(directory.startsWith(parent + sep)); await rm(directory, { recursive: true, force: true }); });
  const folder = join(directory, 'steamapps/workshop/content/431960/3808236079');
  await mkdir(folder, { recursive: true });
  await writeFile(join(folder, 'project.json'), JSON.stringify({ type: 'video', file: 'clip.mp4' }));
  await writeFile(join(folder, 'clip.mp4'), Buffer.from('0123456789'));
  const media = await findWallpaper({ backgroundFile: '' }, { STEAM_PATH: directory });
  assert.equal(media.path, join(folder, 'clip.mp4'));
  await writeFile(join(directory, 'outside.mp4'), 'secret');
  await writeFile(join(folder, 'project.json'), JSON.stringify({ type: 'video', file: '../../../../../../outside.mp4' }));
  assert.equal(await findWallpaper({ backgroundFile: '' }, { STEAM_PATH: directory }), null);
});

test('HTTP routes serve seeking, HEAD and missing files; untrusted writes are refused', async t => {
  const parent = resolve('test-results'); await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(join(parent, 'http-'));
  t.after(async () => { assert.ok(directory.startsWith(parent + sep)); await rm(directory, { recursive: true, force: true }); });
  const file = join(directory, 'clip.mp4'); await writeFile(file, '0123456789');
  const { stat } = await import('node:fs/promises'); const info = await stat(file);
  let settings = { ...DEFAULTS }, missing = false;
  const handlers = createHandlers({ getSettings: () => settings,
    saveSettings: async patch => settings = sanitize(patch, settings),
    locate: async () => missing ? null : { path: file, info } });
  const server = createServer((req, res) => {
    const key = req.url.split('/').at(-1); void handlers[key]?.(req, res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const partial = await fetch(origin + '/wallpaper', { headers: { Range: 'bytes=2-5' } });
  assert.equal(partial.status, 206); assert.equal(await partial.text(), '2345');
  const head = await fetch(origin + '/wallpaper', { method: 'HEAD' });
  assert.equal(head.headers.get('content-length'), '10'); assert.equal(await head.text(), '');
  assert.equal((await fetch(origin + '/wallpaper', { headers: { Range: 'bytes=90-' } })).status, 416);
  const blocked = await fetch(origin + '/settings', { method: 'PUT', headers: { Origin: 'https://untrusted.invalid' }, body: '{"enabled":false}' });
  assert.equal(blocked.status, 403); assert.equal(settings.enabled, true);
  const saved = await fetch(origin + '/settings', { method: 'PUT', headers: { Origin: origin }, body: '{"enabled":false}' });
  assert.equal(saved.status, 200); assert.equal(settings.enabled, false);
  const relativePath = await fetch(origin + '/settings', { method: 'PUT', headers: { Origin: origin }, body: '{"backgroundFile":"relative.mp4"}' });
  assert.equal(relativePath.status, 400);
  missing = true; assert.equal((await fetch(origin + '/wallpaper')).status, 404);
});

test('host unload unregisters both routes without changing desktop or wallpaper-engine settings', () => {
  const paths = [], removed = []; let cleanup;
  apply({ logger: { warn() {} }, webServer: { register(spec) { paths.push(spec.path); return () => removed.push(spec.path); } }, effect(setup) { cleanup = setup(); } });
  assert.deepEqual(paths, ['/plugins/dsh-amber-glass-theme/settings', '/plugins/dsh-amber-glass-theme/wallpaper']);
  cleanup(); assert.deepEqual(removed, paths);
});
