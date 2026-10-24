window.__ModuleLoader__.load({id:"dsh-amber-glass-theme",factory:(require)=>{
var module={exports:{}};
const ID = 'dsh-amber-glass-theme';
const BASE = `/plugins/${ID}`;
const WORKSHOP_ID = '3808236079';
const DEFAULTS = Object.freeze({
  enabled: true,
  backgroundFile: '',
  backgroundOpacity: 1,
  backgroundBrightness: 0.95,
  scrim: 0.16,
  panelOpacity: 0.68,
  sidebarOpacity: 0.22,
  blur: 18,
  radius: 14,
  borderOpacity: 0.16
});
const READABLE = Object.freeze({
  backgroundOpacity: 0.48, backgroundBrightness: 0.7, scrim: 0.25,
  panelOpacity: 0.92, sidebarOpacity: 0.9, blur: 24,
  radius: 14, borderOpacity: 0.18
});
const ranges = {
  backgroundOpacity: [0, 1], backgroundBrightness: [0.3, 1.2],
  scrim: [0, 0.8], panelOpacity: [0.1, 1], sidebarOpacity: [0, 1],
  blur: [0, 40], radius: [0, 28], borderOpacity: [0, 0.5]
};
function sanitize(input = {}, previous = DEFAULTS) {
  const result = { ...DEFAULTS, ...previous };
  if (!input || typeof input !== 'object' || Array.isArray(input)) return result;
  if (typeof input.enabled === 'boolean') result.enabled = input.enabled;
  if (typeof input.backgroundFile === 'string' && input.backgroundFile.length <= 4096 && !input.backgroundFile.includes('\0')) {
    result.backgroundFile = input.backgroundFile.trim();
  }
  for (const [key, [min, max]] of Object.entries(ranges)) {
    const value = input[key];
    if (typeof value === 'number' && Number.isFinite(value)) result[key] = Math.min(max, Math.max(min, value));
  }
  return result;
}

function parseRange(header, size) {
  if (header === undefined) return null;
  if (typeof header !== 'string') return false;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(size) || size <= 0) return false;
  const a = match[1] ? Number(match[1]) : undefined;
  const b = match[2] ? Number(match[2]) : undefined;
  if ((a !== undefined && !Number.isSafeInteger(a)) || (b !== undefined && !Number.isSafeInteger(b))) return false;
  if (a === undefined) return b > 0 ? { start: Math.max(0, size - b), end: size - 1 } : false;
  if (a >= size || (b !== undefined && b < a)) return false;
  return { start: a, end: b === undefined ? size - 1 : Math.min(b, size - 1) };
}

const THEME_CSS="body[data-amber-glass=\"on\"] {\n  --dsw-alias-bg-base: transparent !important;\n  --dsw-alias-bg-layer-1: var(--amber-panel) !important;\n  --dsw-alias-bg-layer-2: var(--amber-panel) !important;\n  --dsw-alias-bg-layer-3: rgba(30,29,29,.84) !important;\n  --dsw-alias-bg-layer-4: rgba(38,36,35,.92) !important;\n  --dsw-alias-label-primary: #f6f5f3 !important;\n  --dsw-alias-label-secondary: #d6d1ca !important;\n  --dsw-alias-label-tertiary: #b2ada7 !important;\n  --dsw-alias-label-quaternary: #99938b !important;\n  --dsw-alias-border-primary: var(--amber-border) !important;\n  --dsw-alias-border-secondary: var(--amber-border) !important;\n  --dsw-alias-fill-primary: rgba(255,255,255,.12) !important;\n  --dsw-alias-fill-secondary: rgba(255,255,255,.08) !important;\n  background: #14110e !important;\n  color: #f6f5f3 !important;\n  isolation: isolate;\n}\nbody[data-amber-glass=\"on\"] #root { background: transparent !important; }\n.amber-backdrop {\n  position: fixed; inset: 0; z-index: -1; pointer-events: none;\n  overflow: hidden; background: radial-gradient(ellipse at 65% 15%, #78522d, #2b2118 48%, #121315);\n}\n.amber-backdrop video {\n  display: block; width: 100%; height: 100%; object-fit: cover;\n  opacity: var(--amber-background-opacity, 1);\n  filter: brightness(var(--amber-background-brightness, .95));\n}\n.amber-backdrop::after {\n  content: \"\"; position: absolute; inset: 0;\n  background: linear-gradient(90deg, rgba(0,0,0,.24), transparent 45%), rgba(0,0,0,var(--amber-scrim,.16));\n}\n/* Existing wallpaper renderer is only hidden while this theme is active. */\nbody[data-amber-glass=\"on\"] > .we-layer,\nbody[data-amber-glass=\"on\"] > .we-scrim { display: none !important; }\nbody[data-amber-glass=\"on\"] [data-dsh-sidebar-root] {\n  background: var(--amber-sidebar) !important;\n  border-right: 1px solid var(--amber-border) !important;\n  backdrop-filter: blur(var(--amber-blur)) saturate(1.1) !important;\n  color: #f6f5f3 !important;\n}\nbody[data-amber-glass=\"on\"] [data-slot=\"sidebar\"],\nbody[data-amber-glass=\"on\"] [data-slot=\"sidebar\"] > div { background-color: transparent !important; }\nbody[data-amber-glass=\"on\"] div:has(> [data-slot=\"sidebar\"]) { background-color: transparent !important; }\nbody[data-amber-glass=\"on\"] :is([role=\"dialog\"], [data-composer-card], [data-presented-file], [data-dockkit-host=\"dock\"]) {\n  background: var(--amber-panel) !important;\n  border: 1px solid var(--amber-border) !important;\n  border-radius: var(--amber-radius) !important;\n  backdrop-filter: blur(var(--amber-blur)) saturate(1.08) !important;\n  box-shadow: 0 8px 28px rgba(0,0,0,.14) !important;\n  color: #f6f5f3 !important;\n}\nbody[data-amber-glass=\"on\"] :is([class*=\"_pluginCard\"], [class*=\"_themeCard\"], [class*=\"_card\"]):not([data-composer-card]) {\n  background-color: var(--amber-panel) !important;\n  border-color: var(--amber-border) !important;\n  border-radius: var(--amber-radius) !important;\n}\nbody[data-amber-glass=\"on\"] :is(button, input, select, textarea) { border-color: var(--amber-border); }\nbody[data-amber-glass=\"on\"] :is(input, select, textarea) { color: #f6f5f3 !important; }\nbody[data-amber-glass=\"on\"] :is(input,textarea)::placeholder { color: #b2ada7 !important; }\nbody[data-amber-glass=\"on\"] [data-message-id] { text-shadow: 0 1px 4px rgba(0,0,0,.5); }\nbody[data-amber-glass=\"on\"] pre { background: rgba(12,13,16,.86) !important; color: #e7e7e7 !important; }\n.amber-settings { max-width: 680px; padding: 12px 0 24px; line-height: 1.65; color: inherit; }\n.amber-settings h2 { margin: 0 0 6px; font-size: 21px; }\n.amber-settings p { margin: 8px 0 16px; }\n.amber-settings .amber-muted { opacity: .72; font-size: 13px; }\n.amber-settings .amber-actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }\n.amber-settings button { cursor: pointer; color: inherit; background: rgba(128,128,128,.16); border: 1px solid rgba(128,128,128,.35); border-radius: 9px; padding: 7px 12px; font: inherit; }\n.amber-settings button:disabled { opacity: .45; cursor: wait; }\n.amber-settings .amber-row { display: grid; grid-template-columns: 140px 1fr 44px; gap: 14px; align-items: center; margin: 16px 0; }\n.amber-settings input[type=\"range\"] { width: 100%; accent-color: #cba66e; }\n.amber-settings input[type=\"text\"] { box-sizing: border-box; width: 100%; background: rgba(128,128,128,.1); color: inherit; border: 1px solid rgba(128,128,128,.4); border-radius: 8px; padding: 9px; font: inherit; }\n.amber-settings .amber-error { color: #e55e5e; }\n.amber-settings a { color: #cda86d; }\n@media (max-width:600px) { .amber-settings .amber-row { grid-template-columns: 115px 1fr 40px; gap: 8px; } }\n";
/* ID, BASE, DEFAULTS, READABLE, sanitize and THEME_CSS are injected by the build script. */
function createController() {
  let snapshot = { settings: { ...DEFAULTS }, media: { available: false }, error: '', ready: false };
  const listeners = new Set();
  const abort = new AbortController();
  let disposed = false, mediaAttached = false, pending = Promise.resolve();
  const style = document.createElement('style');
  style.dataset.amberTheme = ID; style.textContent = THEME_CSS; document.head.appendChild(style);
  const layer = document.createElement('div'); layer.className = 'amber-backdrop'; layer.setAttribute('aria-hidden', 'true');
  const video = document.createElement('video'); video.muted = true; video.loop = true; video.playsInline = true; video.preload = 'metadata';
  layer.appendChild(video);
  const properties = [
    '--amber-background-opacity', '--amber-background-brightness', '--amber-scrim',
    '--amber-panel', '--amber-sidebar', '--amber-blur', '--amber-radius', '--amber-border'
  ];
  const previous = new Map(properties.map(key => [key, { value: document.body.style.getPropertyValue(key), priority: document.body.style.getPropertyPriority(key) }]));
  const previousAttribute = document.body.getAttribute('data-amber-glass');

  function publish() { for (const listener of listeners) listener(); }
  function restoreStyle() {
    if (previousAttribute === null) document.body.removeAttribute('data-amber-glass');
    else document.body.setAttribute('data-amber-glass', previousAttribute);
    for (const [key, value] of previous) {
      if (value.value) document.body.style.setProperty(key, value.value, value.priority);
      else document.body.style.removeProperty(key);
    }
  }
  function paint() {
    if (disposed) return;
    const s = snapshot.settings;
    if (!snapshot.ready || !s.enabled) {
      video.pause(); layer.remove(); restoreStyle(); return;
    }
    document.body.setAttribute('data-amber-glass', 'on');
    if (!layer.isConnected) document.body.prepend(layer);
    const values = [s.backgroundOpacity, s.backgroundBrightness, s.scrim,
      `rgba(25,24,23,${s.panelOpacity})`, `rgba(18,17,16,${s.sidebarOpacity})`,
      `${s.blur}px`, `${s.radius}px`, `rgba(255,255,255,${s.borderOpacity})`];
    properties.forEach((key, index) => document.body.style.setProperty(key, String(values[index])));
    if (snapshot.media.available && !mediaAttached) {
      video.src = `${BASE}/wallpaper`; mediaAttached = true;
    } else if (!snapshot.media.available && mediaAttached) {
      video.pause(); video.removeAttribute('src'); video.load(); mediaAttached = false;
    }
    if (mediaAttached && !document.hidden && !matchMedia('(prefers-reduced-motion: reduce)').matches) video.play().catch(() => {});
    else video.pause();
  }
  async function refresh() {
    if (disposed) return;
    try {
      const response = await fetch(`${BASE}/settings`, { signal: abort.signal, cache: 'no-store' });
      if (!response.ok) throw new Error(`主题服务返回 ${response.status}`);
      const data = await response.json();
      if (disposed) return;
      snapshot = { settings: sanitize(data.settings), media: data.media, error: '', ready: true };
      paint(); publish();
    } catch (error) {
      if (disposed || error.name === 'AbortError') return;
      snapshot = { ...snapshot, error: error.message }; publish();
    }
  }
  function update(patch) {
    const job = pending.then(async () => {
      if (disposed) return;
      const response = await fetch(`${BASE}/settings`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch), signal: abort.signal
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '主题设置保存失败');
      if (disposed) return;
      snapshot = { ...snapshot, settings: sanitize(data.settings), error: '' }; paint(); publish();
      if ('backgroundFile' in patch) { mediaAttached = false; await refresh(); }
    });
    pending = job.catch(error => {
      if (!disposed && error.name !== 'AbortError') { snapshot = { ...snapshot, error: error.message }; publish(); }
    });
    return pending;
  }
  function onVisibility() { if (document.hidden) video.pause(); else { paint(); void refresh(); } }
  document.addEventListener('visibilitychange', onVisibility);
  const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 2500);
  void refresh();
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    update, refresh,
    dispose() {
      if (disposed) return; disposed = true; abort.abort(); clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      video.pause(); video.removeAttribute('src'); video.load(); layer.remove(); style.remove(); restoreStyle(); listeners.clear();
    }
  };
}

function apply(ctx) {
  const key = Symbol.for(ID + ':controller');
  window[key]?.dispose();
  const controller = createController(); window[key] = controller;
  ctx.effect(() => () => { controller.dispose(); if (window[key] === controller) delete window[key]; }, 'amber-glass-theme: reversible page appearance');
  if (!ctx.slots?.inject) return;
  const React = require('react');
  const h = React.createElement;
  function SettingsPage() {
    const state = React.useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
    const s = state.settings;
    const [path, setPath] = React.useState(s.backgroundFile);
    React.useEffect(() => setPath(s.backgroundFile), [s.backgroundFile]);
    const slider = (label, field, max, scale = 100) => h('label', { className: 'amber-row', key: field },
      h('span', null, label), h('input', { type: 'range', min: 0, max, step: 1,
        value: Math.round(s[field] * scale), onChange: event => void controller.update({ [field]: Number(event.target.value) / scale }) }),
      h('output', null, Math.round(s[field] * scale) + (scale === 100 ? '%' : '')));
    return h('section', { className: 'amber-settings' },
      h('h2', null, '琥珀玻璃'),
      h('p', { className: 'amber-muted' }, '动态背景、半透明面板与细边框，只作用于当前 DSH 页面。'),
      h('label', null, h('input', { type: 'checkbox', checked: s.enabled, onChange: event => void controller.update({ enabled: event.target.checked }) }), ' 启用这套主题'),
      h('div', { className: 'amber-actions' },
        h('button', { onClick: () => void controller.update({ ...DEFAULTS, backgroundFile: s.backgroundFile }) }, '应用截图风格'),
        h('button', { onClick: () => void controller.update(READABLE) }, '清晰阅读'),
        h('button', { onClick: () => void controller.update({ enabled: false }) }, '恢复原界面')),
      state.error && h('p', { className: 'amber-error', role: 'alert' }, state.error),
      h('p', { role: 'status' }, state.media.available ? '奶皇新 · 本地视频已就绪' : '尚未找到本地视频，暂时显示琥珀渐变背景。'),
      !state.media.available && h('p', null, h('a', { href: 'https://steamcommunity.com/sharedfiles/filedetails/?id=3808236079', target: '_blank', rel: 'noreferrer' }, '打开奶皇新创意工坊页面'), '，下载后点击刷新。'),
      slider('背景可见度', 'backgroundOpacity', 100),
      slider('背景亮度', 'backgroundBrightness', 120),
      slider('背景暗化', 'scrim', 80),
      slider('面板不透明度', 'panelOpacity', 100),
      slider('侧栏不透明度', 'sidebarOpacity', 100),
      slider('玻璃模糊', 'blur', 40, 1),
      slider('圆角', 'radius', 28, 1),
      slider('边框强度', 'borderOpacity', 50),
      h('label', null, '本地视频路径（留空自动查找 Steam）', h('input', { type: 'text', value: path, placeholder: '选择本机 MP4 或 WebM 的完整路径', onChange: event => setPath(event.target.value) })),
      h('div', { className: 'amber-actions' },
        h('button', { onClick: () => void controller.update({ backgroundFile: path }) }, '保存视频路径'),
        h('button', { onClick: () => void controller.refresh() }, '刷新')),
      h('p', { className: 'amber-muted' }, '视频保留在本机，不上传到 GitHub；不会打开或控制 Wallpaper Engine 桌面程序。'));
  }
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'amber-glass-theme', order: 510, label: () => '琥珀玻璃'
  }, SettingsPage));
}
module.exports = { apply, inject: ['slots'] };

return module.exports;
}});
