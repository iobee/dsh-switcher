import { variants } from '../../../src/study/variants.js';
const body = document.getElementById('variants');
for (const variant of variants.filter(v => v.id !== '00')) {
  const row = document.createElement('tr');
  const first = document.createElement('td');
  const link = document.createElement('a'); link.href = `../../../demo/design-lab/?v=${variant.id}&theme=dark`;
  link.textContent = `${variant.id} ${variant.name}`; first.append(link); row.append(first);
  for (const text of [variant.detail, variant.caution]) { const cell = document.createElement('td'); cell.textContent = text; row.append(cell); }
  body.append(row);
}
