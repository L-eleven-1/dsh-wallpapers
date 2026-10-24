export const ID = 'dsh-amber-glass-theme';
export const BASE = `/plugins/${ID}`;
export const ENGINE = '/wallpaper-engine';
export const FONTSET_ID = 'dsh-original-screenshot';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function selectFields(value, keys) {
  return Object.fromEntries(keys.filter(key => Object.hasOwn(value, key)).map(key => [key, value[key]]));
}
export function restoreFields(current, before, applied) {
  return Object.fromEntries(Object.keys(applied).filter(key => Object.hasOwn(before, key) && same(current[key], applied[key])).map(key => [key, before[key]]));
}

/** Original renderer owns every pixel. This adapter only applies its captured configuration. */
export function createPresetActions({ request, theme }) {
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
