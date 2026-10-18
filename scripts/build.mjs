import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
let client = await read('src/plugin/client.js');
for (const name of ['core', 'motion', 'host', 'keyboard', 'view']) {
  const source = (await read(`src/plugin/${name}.js`)).replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
  client = client.replace(`/* BUILD_${name.toUpperCase()} */`, () => source);
}
const css = await read('src/plugin/switcher.css');
client = client.replace('/* BUILD_CSS */', () => `const SWITCHER_CSS = ${JSON.stringify(css)};`);
await mkdir(new URL('lib/', root), { recursive: true });
await mkdir(new URL('dist/', root), { recursive: true });
for (const [path, source] of [['lib/client.js', client], ['lib/index.js', '// Client-only plugin. No host tools or service replacements.\nexport function apply() {}\n']]) {
  const target = fileURLToPath(new URL(path, root)), temporary = `${target}.next`;
  await writeFile(temporary, source); await rename(temporary, target);
}
console.log('Built standalone DSH client plugin in lib/.');
