import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { runInNewContext } from 'node:vm';
import { createPresetActions, restoreFields, BASE, ENGINE, FONTSET_ID } from '../src/model.js';
import { createHandler, sanitizeBackup } from '../src/host.js';
const preset = JSON.parse(await readFile(new URL('../presets/original-screenshot.json', import.meta.url), 'utf8'));

function fixture({ missing = false, failOnce = false } = {}) {
  let settings = { ...preset.settings, id: 'previous', blur: 7, glassAlpha: 62, otherSetting: 'keep' };
  let active = 'default', preference = 'light', backup = null;
  const calls = []; const fonts = new Map([['default', { name: '用户字体', values: { globalFamily: 'Keep Me' } }]]);
  const theme = { getTheme: () => ({ preference }), setTheme(value) { preference = value; } };
  async function request(path, method = 'GET', data) {
    calls.push({ path, method, data: structuredClone(data) });
    if (path === `${BASE}/preset`) return structuredClone(preset);
    if (path === `${BASE}/state`) return { hasBackup: !!backup };
    if (path === `${BASE}/backup`) {
      if (method === 'PUT') { backup ??= structuredClone(data); return { ok: true }; }
      if (method === 'DELETE') { backup = null; return { ok: true }; }
      return { backup: structuredClone(backup) };
    }
    if (path === `${ENGINE}/inventory`) return { wallpapers: missing ? [] : [{ id: preset.workshopId }] };
    if (path === `${ENGINE}/settings`) {
      if (method === 'PUT') {
        if (failOnce) { failOnce = false; throw new Error('Simulated write failure'); }
        settings = { ...settings, ...structuredClone(data) };
      }
      return { settings: structuredClone(settings) };
    }
    if (path === `${ENGINE}/fontsets`) return { active };
    if (path.endsWith('/activate')) { active = path.split('/').at(-2); return { ok: true }; }
    if (method === 'PUT' && path.includes('/fontsets/')) { fonts.set(path.split('/').at(-1), structuredClone(data)); return { ok: true }; }
    throw new Error('Unexpected request ' + path);
  }
  return { actions: createPresetActions({ request, theme }), calls, fonts,
    read: () => ({ settings, active, preference, backup }), set(field, value) { settings[field] = value; } };
}

test('applies exact captured settings through original APIs and preserves user font document', async () => {
  const f = fixture(); const oldFont = structuredClone(f.fonts.get('default'));
  const result = await f.actions.apply();
  assert.equal(result.needsRefresh, true);
  const write = f.calls.find(c => c.path === ENGINE + '/settings' && c.method === 'PUT');
  assert.deepEqual(write.data, preset.settings);
  assert.deepEqual(f.fonts.get('default'), oldFont);
  assert.equal(f.read().active, FONTSET_ID); assert.equal(f.read().preference, 'dark');
  assert.equal(f.read().settings.otherSetting, 'keep');
  const firstBackup = structuredClone(f.read().backup);
  await f.actions.apply(); assert.deepEqual(f.read().backup, firstBackup);
});

test('missing wallpaper causes no settings writes', async () => {
  const f = fixture({ missing: true }); await assert.rejects(f.actions.apply(), /尚未下载/);
  assert.equal(f.calls.filter(c => c.method !== 'GET').length, 0);
});

test('failed apply rolls settings, font selection and theme back', async () => {
  const f = fixture({ failOnce: true }); const before = structuredClone(f.read());
  await assert.rejects(f.actions.apply(), /已恢复/);
  assert.deepEqual(f.read().settings, before.settings);
  assert.equal(f.read().active, before.active); assert.equal(f.read().preference, before.preference);
  assert.ok(f.read().backup);
});

test('restore returns baseline while preserving later manual changes', async () => {
  const f = fixture(); await f.actions.apply(); f.set('blur', 38);
  await f.actions.restore();
  assert.equal(f.read().settings.blur, 38); assert.equal(f.read().settings.glassAlpha, 62);
  assert.equal(f.read().settings.id, 'previous'); assert.equal(f.read().active, 'default');
  assert.equal(f.read().preference, 'light'); assert.equal(f.read().backup, null);
  assert.deepEqual(restoreFields({ a: 9, b: 2 }, { a: 0, b: 0 }, { a: 1, b: 2 }), { b: 0 });
});

test('backup keeps only theme fields, validates identifiers, and rejects cross-site writes', async t => {
  const value = { settings: { id: 'before', password: 'do not keep' }, fontSetId: 'default', themePreference: 'system' };
  assert.equal('password' in sanitizeBackup(value, preset).settings, false);
  assert.throws(() => sanitizeBackup({ ...value, fontSetId: '../escape' }, preset));
  let backup = null;
  const handler = createHandler({ preset, readBackup: async () => backup, createBackup: async data => { backup ??= data; }, clearBackup: async () => { backup = null; } });
  const server = createServer((req, res) => void handler(req, res));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(origin + BASE + '/backup', { method: 'PUT', headers: { Origin: 'https://other.invalid' }, body: JSON.stringify(value) })).status, 403);
  const saved = await fetch(origin + BASE + '/backup', { method: 'PUT', headers: { Origin: origin }, body: JSON.stringify(value) });
  assert.equal(saved.status, 200); assert.equal(backup.settings.id, 'before');
});

test('client mounts only a native settings section and cleans up the approximated v0.1 theme', async () => {
  const client = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8');
  let exports, removed = false; const sections = [];
  const window = { [Symbol.for('dsh-amber-glass-theme:controller')]: { dispose() { removed = true; } },
    __ModuleLoader__: { load(spec) { exports = spec.factory(() => ({})); } } };
  runInNewContext(client, { window, Symbol, fetch() { throw new Error('No implicit requests'); } });
  exports.apply({ get: () => ({}), slots: { inject(slot, fn) { fn(); }, register(spec) { sections.push(spec); } } });
  assert.equal(removed, true); assert.equal(sections.length, 1); assert.equal(sections[0].name, 'settings.section');
  assert.equal(window[Symbol.for('dsh-amber-glass-theme:controller')], undefined);
});
