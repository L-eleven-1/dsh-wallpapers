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
