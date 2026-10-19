import { projectTabs, getProjectTab } from './project-tabs.js';
import { getRecognitionLayout } from './recognition-layouts.js';
import { createRecognitionPanel } from './recognition-view.js';
import { fixtureRows, scenes, useRealConversations } from './content.js';

const $ = id => document.getElementById(id);
try {
  const response = await fetch(new URL('../../demo/design-lab/private/codex-conversations.json', import.meta.url), { cache: 'no-store' });
  if (response.ok) useRealConversations((await response.json()).rows);
} catch { /* Local snapshots are optional and never part of the shipped plugin. */ }
$('scene-real').hidden = !scenes.real; $('scene-real').disabled = !scenes.real;
const params = new URLSearchParams(location.search);
const oneOf = (key, values, fallback) => values.includes(params.get(key)) ? params.get(key) : fallback;
const state = {
  layout: getProjectTab(params.get('layout')).id,
  theme: oneOf('theme', ['dark', 'light'], 'dark'), mode: oneOf('mode', ['single', 'compare', 'all'], 'single'),
  scene: oneOf('scene', ['daily', 'stress', 'edge', ...(scenes.real ? ['real'] : [])], scenes.real ? 'real' : 'daily'),
  material: oneOf('material', ['quiet', 'baseline', 'ink'], 'quiet'),
  background: oneOf('background', ['host', 'blue', 'sage', 'sand', 'plum'], 'host'),
  access: oneOf('access', ['normal', 'solid', 'contrast'], 'normal'),
  selected: 0, baseline: false, closed: false, immersive: params.get('clean') === '1',
};
let mainPanel, collection = [], noticeTimer;
const node = (tag, name, text) => { const el = document.createElement(tag); el.className = name; if (text !== undefined) el.textContent = text; return el; };
function rows() {
  const data = fixtureRows(state.scene === 'stress' ? 'long' : state.scene);
  if (state.scene === 'stress') {
    const projects = ['dsh-switcher-experimental-navigation', '多工作区与会话导航体验长期设计研究', 'Project without a short display name', '', 'Trice'];
    const titles = ['统一多个工作区的会话焦点与键盘导航体验', '为长标题、中英文混排和空项目名称保留稳定层级', 'Refine focus restoration across workspace boundaries', '先按这个方向继续', '这是一条没有标点而且特别长的标题需要在有限的空间里仍然能够自然换行并且保留完整的辅助描述'];
    data.forEach((row, i) => { row.workspaceName = projects[i]; row.title = titles[i]; });
  }
  return data;
}
function persistURL() {
  const url = new URL(location.href);
  for (const key of ['layout', 'theme', 'mode', 'scene', 'material', 'background', 'access']) url.searchParams.set(key, state[key]);
  if (state.immersive) url.searchParams.set('clean', '1'); else url.searchParams.delete('clean');
  history.replaceState(null, '', url);
}
function announce(text) {
  clearTimeout(noticeTimer); $('notice').textContent = text; $('notice').dataset.visible = 'true';
  noticeTimer = setTimeout(() => { $('notice').dataset.visible = 'false'; }, 2200);
}
function makePanel(variant, options = {}) {
  const panel = createRecognitionPanel({ rows: rows(), layout: getRecognitionLayout('tab'), theme: state.theme,
    material: state.baseline ? 'quiet' : state.material, selected: state.selected, ...options });
  if (!state.baseline) panel.element.dataset.tab = variant.id;
  panel.element.dataset.access = state.access;
  panel.element.querySelector('[role=listbox]').setAttribute('aria-label', state.baseline ? '原案 04 项目题签 最近会话' : `${variant.number} ${variant.name} 最近会话`);
  return panel;
}
function choose(id) {
  state.layout = id; state.mode = 'single'; state.closed = false; state.baseline = false; render(); persistURL();
  if (!state.immersive) $('single-view').scrollIntoView({ block: 'start', behavior: 'instant' });
}
function renderMain() {
  mainPanel?.destroy(); mainPanel = undefined;
  const variant = getProjectTab(state.layout);
  $('layout-number').textContent = state.baseline ? '原案 04' : variant.number;
  $('layout-name').textContent = state.baseline ? '项目题签' : variant.name;
  $('layout-summary').textContent = state.baseline ? '你选中的方向，完整保留。' : variant.summary;
  $('detail').textContent = variant.detail; $('review').textContent = variant.review;
  $('immersive-label').textContent = `${variant.number} ${variant.name}`;
  $('reopen').hidden = !state.closed;
  if (state.closed) return;
  mainPanel = makePanel(variant, {
    onSelect(index) { state.selected = index; },
    onCommit(row) { announce(`样例切换到「${row.title}」`); if (state.immersive) { state.closed = true; renderMain(); } },
  });
  $('main-mount').append(mainPanel.element); mainPanel.select(state.selected, true);
}
function choice(variant, all = false) {
  const button = node('button', 'tab-choice'); button.setAttribute('aria-pressed', String(state.layout === variant.id));
  const title = node('strong', ''); title.append(node('small', '', variant.number), document.createTextNode(variant.name));
  button.append(title, node('span', '', all ? variant.review : variant.summary));
  button.addEventListener('click', () => choose(variant.id)); return button;
}
function renderChoices() {
  $('shortlist').replaceChildren(...projectTabs.filter(item => item.recommended).map(item => choice(item)));
  $('all-choices').replaceChildren(...projectTabs.map(item => choice(item, true)));
}
function renderCollection() {
  collection.forEach(panel => panel.destroy()); collection = []; $('comparison').replaceChildren();
  $('comparison').hidden = state.mode === 'single';
  if (state.mode === 'single') return;
  const variants = state.mode === 'all' ? projectTabs : projectTabs.filter(item => item.recommended);
  for (const variant of variants) {
    const article = node('article', 'compare-card'); article.dataset.tab = variant.id;
    const header = node('div', 'variant-heading'), title = node('button', 'gallery-title');
    title.append(node('small', '', variant.number), document.createTextNode(variant.name)); title.addEventListener('click', () => choose(variant.id));
    header.append(title, node('span', 'verdict', variant.summary));
    const stage = node('div', 'stage'), backdrop = node('div', 'stage-backdrop'); backdrop.setAttribute('aria-hidden', 'true');
    const mount = node('div', 'stage-mount');
    const panel = makePanel(variant, { motion: false, onCommit(row) { announce(`样例切换到「${row.title}」`); } });
    mount.append(panel.element); collection.push(panel); stage.append(backdrop, mount);
    article.append(header, stage, node('p', 'compare-note', variant.detail), node('p', 'review-note', variant.review));
    $('comparison').append(article); panel.select(panel.selected, true);
  }
}
function render() {
  for (const key of ['theme', 'mode', 'background']) document.body.dataset[key] = state[key];
  document.body.dataset.immersive = String(state.immersive);
  for (const key of ['theme', 'mode']) document.querySelectorAll(`button[data-${key}]`).forEach(button => button.setAttribute('aria-pressed', String(button.dataset[key] === state[key])));
  $('baseline-hold').setAttribute('aria-pressed', String(state.baseline));
  for (const key of ['scene', 'material', 'background', 'access']) $(key).value = state[key];
  $('source-note').textContent = state.scene === 'real' ? '真实文案 · 演示状态' : '压力测试示例 · 非真实聊天';
  $('stage-source').textContent = state.scene === 'real' ? '真实文案 · 浏览器样例' : '示例文案 · 浏览器样例';
  document.querySelector('.immersive-bar').hidden = !state.immersive;
  renderMain(); renderChoices(); renderCollection();
}
for (const key of ['theme', 'mode']) document.querySelectorAll(`button[data-${key}]`).forEach(button => button.addEventListener('click', () => { state[key] = button.dataset[key]; state.baseline = false; render(); persistURL(); }));
for (const key of ['scene', 'material', 'background', 'access']) $(key).addEventListener('change', event => { state[key] = event.target.value; state.closed = false; render(); persistURL(); });
function step(direction) { const index = projectTabs.findIndex(item => item.id === state.layout); choose(projectTabs[(index + direction + projectTabs.length) % projectTabs.length].id); }
$('previous').addEventListener('click', () => step(-1)); $('next').addEventListener('click', () => step(1));
$('immersive').addEventListener('click', () => { state.immersive = true; state.mode = 'single'; state.closed = false; render(); persistURL(); mainPanel?.element.querySelector('[role=listbox]').focus(); });
$('exit-immersive').addEventListener('click', () => { state.immersive = false; state.closed = false; render(); persistURL(); });
$('immersive-theme').addEventListener('click', () => { state.theme = state.theme === 'light' ? 'dark' : 'light'; render(); persistURL(); });
$('reopen').addEventListener('click', () => { state.closed = false; renderMain(); mainPanel?.element.querySelector('[role=listbox]').focus(); });
function baseline(active) { if (state.baseline === active) return; state.baseline = active; $('baseline-hold').setAttribute('aria-pressed', String(active)); renderMain(); renderCollection(); }
const hold = $('baseline-hold');
hold.addEventListener('pointerdown', event => { if (event.button !== 0) return; hold.setPointerCapture(event.pointerId); baseline(true); });
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture', 'blur']) hold.addEventListener(event, () => baseline(false));
hold.addEventListener('keydown', event => { if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); baseline(true); } });
hold.addEventListener('keyup', event => { if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); baseline(false); } });
window.addEventListener('blur', () => baseline(false));
window.addEventListener('keydown', event => {
  if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey || /^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName)) return;
  if (event.key === 'Escape') { state.closed = true; baseline(false); renderMain(); }
});
window.addEventListener('pagehide', () => { mainPanel?.destroy(); collection.forEach(panel => panel.destroy()); clearTimeout(noticeTimer); }, { once: true });
render();
