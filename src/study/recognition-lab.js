import { recognitionLayouts, getRecognitionLayout } from './recognition-layouts.js';
import { createRecognitionPanel } from './recognition-view.js';
import { createStudyPanel } from './render.js';
import { getVariant } from './variants.js';
import { fixtureRows, scenes, useRealConversations } from './content.js';

const $ = id => document.getElementById(id);
try {
  const response = await fetch(new URL('../../demo/design-lab/private/codex-conversations.json', import.meta.url), { cache: 'no-store' });
  if (response.ok) useRealConversations((await response.json()).rows);
} catch { /* The original fixtures remain usable without the local snapshot. */ }
$('scene-real').hidden = !scenes.real; $('scene-real').disabled = !scenes.real;
const params = new URLSearchParams(location.search);
const state = {
  layout: getRecognitionLayout(params.get('layout')).id,
  theme: params.get('theme') === 'light' ? 'light' : 'dark',
  mode: params.get('mode') === 'compare' ? 'compare' : 'single',
  scene: ['daily', 'stress', 'edge', ...(scenes.real ? ['real'] : [])].includes(params.get('scene')) ? params.get('scene') : scenes.real ? 'real' : 'daily',
  material: ['quiet', 'ink', 'vellum', 'baseline'].includes(params.get('material')) ? params.get('material') : 'quiet',
  access: ['solid', 'contrast'].includes(params.get('access')) ? params.get('access') : 'normal',
  selected: 1, baseline: false, closed: false, immersive: params.get('clean') === '1',
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
  for (const field of ['layout', 'theme', 'mode', 'scene', 'material', 'access']) url.searchParams.set(field, state[field]);
  if (state.immersive) url.searchParams.set('clean', '1'); else url.searchParams.delete('clean');
  history.replaceState(null, '', url);
}
function announce(text) {
  clearTimeout(noticeTimer); $('notice').textContent = text; $('notice').dataset.visible = 'true';
  noticeTimer = setTimeout(() => { $('notice').dataset.visible = 'false'; }, 2200);
}
function makePanel(layout, options = {}) {
  const shared = { rows: rows(), theme: state.theme, selected: state.selected, ...options };
  const panel = state.baseline
    ? createStudyPanel({ ...shared, variant: getVariant('25'), showWorkspace: false })
    : createRecognitionPanel({ ...shared, layout, material: state.material });
  panel.element.dataset.access = state.access;
  return panel;
}
function choose(id) {
  state.layout = id; state.mode = 'single'; state.closed = false; state.baseline = false; render(); persistURL();
  if (!state.immersive) $('single-view').scrollIntoView({ block: 'start', behavior: 'instant' });
}
function renderMain() {
  mainPanel?.destroy(); mainPanel = undefined;
  const layout = getRecognitionLayout(state.layout);
  $('layout-number').textContent = state.baseline ? '旧版' : layout.number;
  $('layout-name').textContent = state.baseline ? '原话优先' : layout.name;
  $('layout-summary').textContent = layout.summary;
  $('detail').textContent = layout.detail; $('tradeoff').textContent = layout.tradeoff;
  $('immersive-label').textContent = `${layout.number} ${layout.name}`;
  $('reopen').hidden = !state.closed;
  if (state.closed) return;
  mainPanel = makePanel(layout, {
    onSelect(index) { state.selected = index; },
    onCommit(row) { announce(`样例切换到「${row.title}」`); if (state.immersive) { state.closed = true; renderMain(); } },
  });
  $('main-mount').append(mainPanel.element); mainPanel.select(state.selected, true);
}
function renderChoices() {
  $('layout-choices').replaceChildren();
  for (const layout of recognitionLayouts) {
    const button = node('button', 'recognition-choice'); button.dataset.recommended = String(!!layout.recommended);
    button.setAttribute('aria-pressed', String(state.layout === layout.id));
    const title = node('strong', ''); title.append(node('small', '', layout.number), document.createTextNode(layout.name));
    button.append(title, node('span', '', layout.summary)); button.addEventListener('click', () => choose(layout.id)); $('layout-choices').append(button);
  }
}
function renderCollection() {
  collection.forEach(panel => panel.destroy()); collection = []; $('comparison').replaceChildren();
  $('comparison').hidden = state.mode !== 'compare';
  if (state.mode !== 'compare') return;
  for (const layout of recognitionLayouts) {
    const article = node('article', 'compare-card'); article.dataset.layout = layout.id;
    const header = node('div', 'variant-heading'), title = node('button', 'gallery-title');
    title.append(node('small', '', layout.number), document.createTextNode(layout.name));
    title.addEventListener('click', () => choose(layout.id)); header.append(title, node('span', 'verdict', layout.summary));
    const stage = node('div', 'stage'), backdrop = node('div', 'stage-backdrop'); backdrop.setAttribute('aria-hidden', 'true');
    const mount = node('div', 'stage-mount');
    const panel = makePanel(layout, { selected: state.selected, interactive: true, motion: false, onCommit(row) { announce(`样例切换到「${row.title}」`); } });
    mount.append(panel.element); collection.push(panel);
    stage.append(backdrop, mount); article.append(header, stage, node('p', 'compare-note', `${layout.detail} ${layout.tradeoff}`)); $('comparison').append(article);
    panel.select(panel.selected, true);
  }
}
function render() {
  document.body.dataset.theme = state.theme; document.body.dataset.mode = state.mode; document.body.dataset.immersive = String(state.immersive);
  document.querySelectorAll('button[data-theme]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.theme === state.theme)));
  document.querySelectorAll('button[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode)));
  $('baseline-hold').setAttribute('aria-pressed', String(state.baseline));
  for (const field of ['scene', 'material', 'access']) $(field).value = state[field];
  $('source-note').textContent = state.scene === 'real' ? '项目与原话来自 Codex · 状态为演示' : '压力测试示例 · 非真实聊天';
  $('stage-source').textContent = state.scene === 'real' ? '真实文案 · 浏览器样例' : '示例文案 · 浏览器样例';
  document.querySelector('.immersive-bar').hidden = !state.immersive;
  renderMain(); renderChoices(); renderCollection();
}
document.querySelectorAll('button[data-theme]').forEach(button => button.addEventListener('click', () => { state.theme = button.dataset.theme; render(); persistURL(); }));
document.querySelectorAll('button[data-mode]').forEach(button => button.addEventListener('click', () => { state.mode = button.dataset.mode; state.baseline = false; render(); persistURL(); }));
for (const field of ['scene', 'material', 'access']) $(field).addEventListener('change', event => { state[field] = event.target.value; state.closed = false; render(); persistURL(); });
function step(direction) { const index = recognitionLayouts.findIndex(layout => layout.id === state.layout); choose(recognitionLayouts[(index + direction + recognitionLayouts.length) % recognitionLayouts.length].id); }
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
