window.__ModuleLoader__.load({id:"dsh-amber-glass-theme",factory:(require)=>{
var module={exports:{}};
const ID = 'dsh-amber-glass-theme';
const BASE = `/plugins/${ID}`;
const ENGINE = '/wallpaper-engine';
const FONTSET_ID = 'dsh-original-screenshot';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function selectFields(value, keys) {
  return Object.fromEntries(keys.filter(key => Object.hasOwn(value, key)).map(key => [key, value[key]]));
}
function restoreFields(current, before, applied) {
  return Object.fromEntries(Object.keys(applied).filter(key => Object.hasOwn(before, key) && same(current[key], applied[key])).map(key => [key, before[key]]));
}

/** Original renderer owns every pixel. This adapter only applies its captured configuration. */
function createPresetActions({ request, theme }) {
  let busy = false;
  async function guarded(fn) {
    if (busy) throw new Error('正在处理上一次操作，请稍后再试。');
    busy = true; try { return await fn(); } finally { busy = false; }
  }
  const activate = id => request(`${ENGINE}/fontsets/${encodeURIComponent(id)}/activate`, 'POST', {});
  return {
    async status() {
      const [state, preset] = await Promise.all([request(`${BASE}/state`), request(`${BASE}/preset`)]);
      return { ...state, preset };
    },
    apply() { return guarded(async () => {
      const preset = await request(`${BASE}/preset`);
      let inventory, saved, fonts;
      try { [inventory, saved, fonts] = await Promise.all([request(`${ENGINE}/inventory`), request(`${ENGINE}/settings`), request(`${ENGINE}/fontsets`)]); }
      catch { throw new Error('请先安装并启用 dsh-plugin-wallpaper-engine 1.4.0；本插件使用它还原原图，不另画一套界面。'); }
      if (!inventory.wallpapers?.some(w => w.id === preset.workshopId)) throw new Error('本机尚未下载“奶皇新”。请先取得本地视频，再应用原图。');
      if (saved.settings?.settingsVersion !== preset.settings.settingsVersion) throw new Error('原壁纸插件的配置版本不同，已停止应用，避免改变原有设置。');
      if (typeof theme?.setTheme !== 'function' || typeof theme?.getTheme !== 'function') throw new Error('当前宿主没有兼容的主题服务，未改动任何设置。');
      const before = { settings: selectFields(saved.settings, Object.keys(preset.settings)), fontSetId: fonts.active,
        themePreference: theme.getTheme().preference };
      await request(`${BASE}/backup`, 'PUT', before);
      try {
        await request(`${ENGINE}/fontsets/${FONTSET_ID}`, 'PUT', { name: preset.fontset.name, values: preset.fontset.values });
        await activate(FONTSET_ID);
        await request(`${ENGINE}/settings`, 'PUT', preset.settings);
        theme.setTheme(preset.themePreference);
      } catch (error) {
        const failures = [];
        for (const undo of [() => request(`${ENGINE}/settings`, 'PUT', before.settings), () => activate(before.fontSetId), () => theme.setTheme(before.themePreference)]) {
          try { await undo(); } catch { failures.push(true); }
        }
        throw new Error(failures.length ? '应用未完成，部分恢复失败。备份仍保留，可使用“恢复应用前设置”。' : `应用未完成，已恢复本次操作前的设置：${error.message}`);
      }
      return { needsRefresh: true, message: '已保存原图参数。点击“刷新当前页”后，由原壁纸插件原样渲染。' };
    }); },
    restore() { return guarded(async () => {
      const { backup } = await request(`${BASE}/backup`);
      if (!backup) throw new Error('没有本插件保存的应用前备份。');
      const [preset, current, fonts] = await Promise.all([request(`${BASE}/preset`), request(`${ENGINE}/settings`), request(`${ENGINE}/fontsets`)]);
      const patch = restoreFields(current.settings || {}, backup.settings, preset.settings);
      if (Object.keys(patch).length) await request(`${ENGINE}/settings`, 'PUT', patch);
      if (fonts.active === FONTSET_ID) await activate(backup.fontSetId);
      if (theme.getTheme().preference === preset.themePreference) theme.setTheme(backup.themePreference);
      await request(`${BASE}/backup`, 'DELETE');
      return { needsRefresh: true, message: '已恢复应用前设置；应用后你手动修改过的参数会保留。点击“刷新当前页”生效。' };
    }); }
  };
}

/* Native DSH and dsh-plugin-wallpaper-engine render the page. No global CSS or backdrop is added here. */
function apply(ctx) {
  // Dispose the previous approximated theme when hot-upgrading from v0.1.0.
  const old = Symbol.for(ID + ':controller');
  window[old]?.dispose(); delete window[old];
  const React = require('react'); const h = React.createElement;
  const theme = ctx.get('theme');
  async function request(path, method = 'GET', data) {
    const response = await fetch(path, { method, cache: 'no-store',
      ...(data === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }) });
    let result;
    try { result = await response.json(); } catch { throw new Error(`接口不可用 (${response.status})`); }
    if (!response.ok) throw new Error(result.error || `接口返回 ${response.status}`);
    return result;
  }
  const actions = createPresetActions({ request, theme });
  function SettingsPage() {
    const [status, setStatus] = React.useState(null);
    const [message, setMessage] = React.useState('');
    const [busy, setBusy] = React.useState(false);
    const [refresh, setRefresh] = React.useState(false);
    React.useEffect(() => {
      let active = true;
      actions.status().then(value => { if (active) setStatus(value); }).catch(error => { if (active) setMessage(error.message); });
      return () => { active = false; };
    }, []);
    async function run(action) {
      setBusy(true); setMessage('');
      try { const result = await actions[action](); setMessage(result.message); setRefresh(result.needsRefresh); setStatus(await actions.status()); }
      catch (error) { setMessage(error.message); }
      finally { setBusy(false); }
    }
    const button = (label, onClick, disabled) => h('button', { type: 'button', disabled, onClick,
      style: { padding: '8px 14px', borderRadius: 8, border: '1px solid currentColor', background: 'transparent', color: 'inherit', cursor: disabled ? 'wait' : 'pointer' } }, label);
    return h('section', { style: { maxWidth: 640, padding: '12px 0', lineHeight: 1.7 } },
      h('h2', null, '原图主题 · 奶皇新'),
      h('p', null, '使用你原来那套壁纸插件的渲染与参数。首页、聊天、插件页继续使用 DSH 原生布局，不重画侧栏、输入框或卡片。'),
      h('p', null, '需要 dsh-plugin-wallpaper-engine 1.4.0，以及本机已下载的“奶皇新”。'),
      h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap', margin: '20px 0' } },
        button('应用原图效果', () => void run('apply'), busy || !status),
        button('恢复应用前设置', () => void run('restore'), busy || !status?.hasBackup),
        refresh && button('刷新当前页', () => location.reload(), busy)),
      message && h('p', { role: 'status' }, message),
      h('p', null, '参数包括：奶皇新背景、25% 暗化、16px 模糊、原生玻璃面板、边框和挂件设置。'),
      h('p', null, '应用前自动保存备份。刷新仅重新加载当前页面，不重启软件。'),
      h('p', null, h('a', { href: 'https://steamcommunity.com/sharedfiles/filedetails/?id=3808236079', target: '_blank', rel: 'noreferrer' }, '奶皇新创意工坊页面')),
      h('p', null, '本插件不启动 Wallpaper Engine 桌面程序，不修改系统桌面壁纸。'));
  }
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'amber-glass-theme', order: 510, label: () => '原图主题'
  }, SettingsPage));
}
module.exports = { apply, inject: ['slots', 'theme'] };

return module.exports;
}});
