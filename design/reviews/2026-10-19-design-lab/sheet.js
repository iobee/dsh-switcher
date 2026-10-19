import { variants } from '../../../src/study/variants.js';
const params = new URLSearchParams(location.search);
const theme = params.get('theme') === 'light' ? 'light' : 'dark';
const from = Number(params.get('from') || 1), to = Number(params.get('to') || 7);
document.body.className = theme;
document.getElementById('heading').textContent = `DSH Switcher · ${theme === 'dark' ? '暗色' : '亮色'} · ${from}—${to} · 原尺寸校样`;
for (const v of variants.filter(v => Number(v.id) >= from && Number(v.id) <= to)) {
  const figure = document.createElement('figure'), caption = document.createElement('figcaption'), image = document.createElement('img');
  caption.textContent = `${v.id} ${v.name}`;
  const family = document.createElement('span'); family.textContent = v.group; caption.append(family);
  image.src = `screens/${v.id}-${theme}.png`; image.alt = `${v.name} ${theme}`;
  figure.append(caption, image); document.getElementById('sheets').append(figure);
}
