import { readFile, writeFile, mkdir } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const [model, client] = await Promise.all(['src/model.js','src/client.js'].map(path => readFile(new URL(path, root), 'utf8')));
const content = `window.__ModuleLoader__.load({id:"dsh-amber-glass-theme",factory:(require)=>{\nvar module={exports:{}};\n${model.replace(/^export /gm, '')}\n${client}\nreturn module.exports;\n}});\n`;
await mkdir(new URL('lib/', root), { recursive: true });
await writeFile(new URL('lib/client.js', root), content);
console.log('Built lib/client.js');
