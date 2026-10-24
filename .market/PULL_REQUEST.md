## Add L-eleven-1/dsh-wallpapers to Themes & Appearance

Adds one entry: `data/plugins/L-eleven-1__dsh-wallpapers.yml`.

This preset extension uses dsh-plugin-wallpaper-engine 1.4.0 to apply a captured appearance to native DSH pages. It adds a settings section, records settings before application, attempts rollback on apply failures, and supports restoring prior settings while preserving later manual changes. It does not supply a replacement layout or control the system desktop wallpaper.

- Plugin repository: https://github.com/L-eleven-1/dsh-wallpapers
- Package: dsh-amber-glass-theme 0.2.0
- Category: theme
- Runtime dependency: dsh-plugin-wallpaper-engine 1.4.0 (peer dependency)
- `dsh.bundle` and `cordis.patch.yml` are included.
- Six Node.js tests pass; isolated browser verification leaves native sidebar/composer geometry, style count and video count unchanged.
- The plugin repository declares a freshly captured native DSH Web preview in `screenshots.json`; personal session rows were hidden in the temporary capture page.
- No third-party wallpaper video or renderer code is redistributed.

Only this plugin's YAML entry is added. Generated READMEs and other entries are unchanged.
