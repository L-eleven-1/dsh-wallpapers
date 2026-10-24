import { createReadStream } from 'node:fs';
import { readFile, writeFile, rename, mkdir, stat, realpath } from 'node:fs/promises';
import { join, resolve, relative, isAbsolute, extname } from 'node:path';
import { userInfo } from 'node:os';
import { DEFAULTS, BASE, WORKSHOP_ID, sanitize, parseRange } from './model.js';

export const name = 'amber-glass-theme';
export const inject = ['webServer'];
const TYPES = new Map([['.mp4', 'video/mp4'], ['.webm', 'video/webm'], ['.mov', 'video/quicktime']]);

export async function findWallpaper(settings, env = process.env) {
  if (settings.backgroundFile) {
    if (!isAbsolute(settings.backgroundFile)) return null;
    try {
      const path = await realpath(settings.backgroundFile);
      const info = await stat(path);
      return info.isFile() && TYPES.has(extname(path).toLowerCase()) ? { path, info } : null;
    } catch { return null; }
  }
  const home = userInfo().homedir;
  const steamRoots = [env.STEAM_PATH, env['ProgramFiles(x86)'] && join(env['ProgramFiles(x86)'], 'Steam'),
    env.ProgramFiles && join(env.ProgramFiles, 'Steam'), join(home, '.steam', 'steam'),
    join(home, '.local', 'share', 'Steam'), join(home, 'Library', 'Application Support', 'Steam')].filter(Boolean);
  const libraries = new Set(steamRoots);
  for (const root of steamRoots) {
    try {
      const text = await readFile(join(root, 'steamapps', 'libraryfolders.vdf'), 'utf8');
      for (const match of text.matchAll(/"path"\s*"((?:\\.|[^"\\])*)"/g)) libraries.add(match[1].replaceAll('\\\\', '\\'));
    } catch { /* A non-default library can also be selected through backgroundFile. */ }
  }
  for (const library of libraries) {
    const folder = join(library, 'steamapps', 'workshop', 'content', '431960', WORKSHOP_ID);
    try {
      const project = JSON.parse(await readFile(join(folder, 'project.json'), 'utf8'));
      if (project.type !== 'video' || typeof project.file !== 'string') continue;
      const path = await realpath(resolve(folder, project.file));
      const root = await realpath(folder);
      const rel = relative(root, path);
      if (!rel || rel.startsWith('..') || isAbsolute(rel)) continue;
      const info = await stat(path);
      if (info.isFile() && TYPES.has(extname(path).toLowerCase())) return { path, info };
    } catch { /* Unsubscribed or not fully downloaded. */ }
  }
  return null;
}

function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(value));
}

function trusted(req) {
  if (!req.headers.origin) return false;
  try {
    const origin = new URL(req.headers.origin);
    if (origin.host === req.headers.host && ['http:', 'https:'].includes(origin.protocol)) return true;
    return ['dsh-desktop:', 'dsh-app:'].includes(origin.protocol) && ['app', 'local', 'localhost', 'web'].includes(origin.hostname);
  } catch { return false; }
}

async function body(req) {
  let bytes = 0; const chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 16384) throw new Error('设置内容过大');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function createHandlers({ getSettings, saveSettings, locate = findWallpaper, streams = new Set() }) {
  return {
    async settings(req, res) {
      if (req.method === 'GET') {
        const settings = getSettings(); const media = await locate(settings);
        return json(res, 200, { settings, media: { available: !!media, title: '奶皇新', workshopId: WORKSHOP_ID } });
      }
      if (req.method !== 'PUT') return json(res, 405, { error: 'method not allowed' });
      if (!trusted(req)) return json(res, 403, { error: '不接受其他网站发起的设置请求' });
      let input;
      try { input = await body(req); } catch { return json(res, 400, { error: '设置格式错误或内容过大' }); }
      const next = sanitize(input, getSettings());
      if (next.backgroundFile && !isAbsolute(next.backgroundFile)) return json(res, 400, { error: '本地视频路径必须是绝对路径' });
      try { const saved = await saveSettings(input); return json(res, 200, { settings: saved ?? getSettings() }); }
      catch { return json(res, 500, { error: '设置保存失败，原设置保持不变' }); }
    },
    async wallpaper(req, res) {
      if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, { error: 'method not allowed' });
      const media = await locate(getSettings());
      if (!media) return json(res, 404, { error: '请先通过 Steam 下载奶皇新，或在主题设置中选择本地视频' });
      const { path, info } = media;
      const etag = `W/"${info.size}-${Math.floor(info.mtimeMs)}"`;
      if (req.headers['if-none-match'] === etag && !req.headers.range) { res.writeHead(304, { ETag: etag }); return res.end(); }
      const rangeHeader = req.headers['if-range'] && req.headers['if-range'] !== etag ? undefined : req.headers.range;
      const range = parseRange(rangeHeader, info.size);
      if (range === false) { res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }); return res.end(); }
      const start = range?.start ?? 0, end = range?.end ?? info.size - 1;
      res.writeHead(range ? 206 : 200, {
        'Content-Type': TYPES.get(extname(path).toLowerCase()), 'Content-Length': end - start + 1,
        'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=0, must-revalidate', ETag: etag,
        'X-Content-Type-Options': 'nosniff', ...(range ? { 'Content-Range': `bytes ${start}-${end}/${info.size}` } : {})
      });
      if (req.method === 'HEAD') return res.end();
      const stream = createReadStream(path, { start, end }); streams.add(stream);
      stream.on('error', () => res.destroy()); stream.on('close', () => streams.delete(stream));
      res.on('close', () => stream.destroy()); stream.pipe(res);
    }
  };
}

export function apply(ctx) {
  const directory = join(userInfo().homedir, '.dsh-amber-glass-theme');
  const file = join(directory, 'settings.json');
  let settings = { ...DEFAULTS }, closed = false;
  let queue = Promise.resolve();
  const ready = readFile(file, 'utf8').then(text => { settings = sanitize(JSON.parse(text)); }).catch(error => {
    if (error.code !== 'ENOENT') ctx.logger?.warn?.('琥珀玻璃设置不可读，本次使用默认值；原文件未覆盖。');
  });
  const streams = new Set();
  const handlers = createHandlers({
    getSettings: () => settings,
    saveSettings(patch) {
      const job = queue.then(async () => {
        if (closed) throw new Error('Theme is disabled');
        const next = sanitize(patch, settings);
        await mkdir(directory, { recursive: true });
        await writeFile(file + '.tmp', JSON.stringify(next, null, 2) + '\n', { mode: 0o600 });
        await rename(file + '.tmp', file); settings = next; return next;
      });
      queue = job.catch(() => {}); return job;
    }, streams
  });
  ctx.effect(() => {
    const disposers = Object.entries(handlers).map(([key, handler]) => ctx.webServer.register({
      kind: 'exact', path: `${BASE}/${key}`, handler: async (req, res) => {
        try { await ready; await handler(req, res); }
        catch { if (!res.headersSent) json(res, 500, { error: '主题服务暂时不可用' }); else res.destroy(); }
      }
    }));
    return () => { closed = true; for (const dispose of disposers) dispose(); for (const stream of streams) stream.destroy(); streams.clear(); };
  }, 'amber-glass-theme: local DSH routes');
}
