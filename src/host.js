import { readFile, writeFile, mkdir, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { userInfo } from 'node:os';
import { BASE, selectFields } from './model.js';
export const name = 'amber-original-screenshot-preset';
export const inject = ['webServer'];
function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(data));
}
function trusted(req) {
  try {
    const origin = new URL(req.headers.origin);
    return (['http:', 'https:'].includes(origin.protocol) && origin.host === req.headers.host)
      || (['dsh-desktop:', 'dsh-app:'].includes(origin.protocol) && ['app', 'local', 'localhost', 'web'].includes(origin.hostname));
  } catch { return false; }
}
export function sanitizeBackup(input, preset) {
  if (!input || typeof input !== 'object' || !input.settings || Array.isArray(input.settings)) throw new Error('Invalid snapshot');
  if (typeof input.fontSetId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(input.fontSetId)) throw new Error('Invalid fontset');
  if (!['light', 'dark', 'system'].includes(input.themePreference)) throw new Error('Unsupported theme');
  const settings = selectFields(input.settings, Object.keys(preset.settings));
  if (JSON.stringify(settings).length > 32768) throw new Error('Snapshot too large');
  return { settings, fontSetId: input.fontSetId, themePreference: input.themePreference };
}
export function createHandler({ preset, readBackup, createBackup, clearBackup }) {
  return async (req, res) => {
    const path = new URL(req.url, 'http://local').pathname;
    if (req.method === 'GET' && path === `${BASE}/preset`) return send(res, 200, preset);
    if (req.method === 'GET' && path === `${BASE}/state`) return send(res, 200, { version: '0.2.0', hasBackup: !!await readBackup(), mode: 'original-renderer' });
    if (path !== `${BASE}/backup`) return send(res, 404, { error: 'not found' });
    if (req.method === 'GET') return send(res, 200, { backup: await readBackup() });
    if (!trusted(req)) return send(res, 403, { error: '不接受其他网站发起的写入请求。' });
    if (req.method === 'DELETE') { await clearBackup(); return send(res, 200, { ok: true }); }
    if (req.method !== 'PUT') return send(res, 405, { error: 'method not allowed' });
    let input;
    try {
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 65536) throw new Error('Too large'); chunks.push(chunk); }
      input = sanitizeBackup(JSON.parse(Buffer.concat(chunks).toString('utf8')), preset);
    } catch { return send(res, 400, { error: '备份格式无效或内容过大。' }); }
    await createBackup(input); return send(res, 200, { ok: true });
  };
}
export function apply(ctx) {
  const directory = join(userInfo().homedir, '.dsh-amber-glass-theme');
  const file = join(directory, 'original-preset-backup.json');
  let queue = Promise.resolve();
  function serialize(fn) { const result = queue.then(fn); queue = result.catch(() => {}); return result; }
  async function readBackup() {
    try { return JSON.parse(await readFile(file, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }
  const ready = readFile(new URL('../presets/original-screenshot.json', import.meta.url), 'utf8').then(JSON.parse);
  ctx.effect(() => {
    const dispose = ctx.webServer.register({ kind: 'prefix', path: BASE, handler: async (req, res) => {
      try {
        const preset = await ready;
        const handler = createHandler({ preset, readBackup,
          createBackup: value => serialize(async () => {
            if (await readBackup()) return;
            await mkdir(directory, { recursive: true });
            await writeFile(file + '.tmp', JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
            await rename(file + '.tmp', file);
          }),
          clearBackup: () => serialize(() => unlink(file).catch(error => { if (error.code !== 'ENOENT') throw error; }))
        });
        await handler(req, res);
      } catch { if (!res.headersSent) send(res, 500, { error: '预设服务暂时不可用，未覆盖已有备份。' }); else res.destroy(); }
    } });
    return () => dispose();
  }, 'original screenshot: preset and rollback data');
}
