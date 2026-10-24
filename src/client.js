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
