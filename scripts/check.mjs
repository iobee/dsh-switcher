import { execFileSync } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ['node_modules', 'dist', 'review'].includes(entry.name)) continue;
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (entry.isFile()) files.push(file);
  }
}
await walk(root);
let scripts = 0, links = 0;
const failures = [];
async function checkLink(file, reference) {
  if (!reference || /^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(reference) || reference.includes('${')) return;
  const clean = reference.split(/[?#]/)[0];
  if (!clean) return;
  const destination = resolve(reference.startsWith('/') ? root : dirname(file), '.' + (reference.startsWith('/') ? clean : '/' + clean));
  // Relative links resolve from the document, with normal ../ semantics.
  const target = reference.startsWith('/') ? destination : resolve(dirname(file), clean);
  links++;
  if (target !== root && !target.startsWith(root + sep)) { failures.push(`${relative(root, file)}: outside repository: ${reference}`); return; }
  try { await stat(target); } catch { failures.push(`${relative(root, file)}: missing ${reference}`); }
}
for (const file of files) {
  const extension = extname(file);
  if (['.js', '.mjs'].includes(extension)) {
    try { execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' }); scripts++; }
    catch (error) { failures.push(`${relative(root, file)}: ${error.stderr}`); }
  }
  if (extension === '.html') {
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
      try { new vm.Script(match[1], { filename: relative(root, file) }); scripts++; }
      catch (error) { failures.push(error.message); }
    }
    // Check actual resource/link elements, not href/src text inside inline scripts.
    const markup = source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, match => match.slice(0, match.indexOf('>') + 1));
    for (const match of markup.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/g)) await checkLink(file, match[1]);
  }
  if (extension === '.css') {
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) await checkLink(file, match[1].trim());
  }
}
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(`Checked ${scripts} scripts and ${links} local references. All files resolve inside this repository.`);
