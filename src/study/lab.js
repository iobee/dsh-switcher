import { variants, groups, getVariant, palettes } from './variants.js';
import { fixtureRows, scenes, useRealConversations } from './content.js';
import { createStudyPanel } from './render.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
// This optional snapshot is local and Git-ignored. A fresh checkout keeps the
// original invented fixtures; it never needs access to Codex to run the study.
try {
  const response = await fetch(new URL('../../demo/design-lab/private/codex-conversations.json', import.meta.url), { cache: 'no-store' });
  if (response.ok) useRealConversations((await response.json()).rows);
} catch { /* Keep the original fixture scenes if the local snapshot is absent. */ }
$('scene-real').hidden = !scenes.real;
$('scene-real').disabled = !scenes.real;
const state = {
  id: getVariant(params.get('v')).id,
  theme: params.get('theme') === 'light' ? 'light' : 'dark',
  mode: ['all', 'compare'].includes(params.get('mode')) ? params.get('mode') : 'single',
  scene: Object.hasOwn(scenes, params.get('scene')) ? params.get('scene') : scenes.real ? 'real' : 'daily',
  palette: Object.hasOwn(palettes, params.get('palette')) ? params.get('palette') : 'neutral',
  access: ['solid', 'contrast'].includes(params.get('access')) ? params.get('access') : 'normal',
  workspace: params.get('workspace') !== '0',
  group: '全部', selected: 1, custom: '', comparing: false, immersive: params.get('clean') === '1',
  pins: new Set(['25', '26', '27', '28']), closed: false,
};
let mainPanel, collections = [], noticeTimer, inputTimer;

function persistURL() {
  const next = new URL(location.href);
  for (const [key, value] of Object.entries({v: state.id, theme: state.theme, mode: state.mode, scene: state.scene, palette: state.palette, access: state.access})) next.searchParams.set(key, value);
  if (state.workspace) next.searchParams.delete('workspace'); else next.searchParams.set('workspace', '0');
  if (state.immersive) next.searchParams.set('clean', '1'); else next.searchParams.delete('clean');
  history.replaceState(null, '', next);
}

function create(tag, name, text) {
  const element = document.createElement(tag); element.className = name;
  if (text !== undefined) element.textContent = text;
  return element;
}

function announce(message) {
  clearTimeout(noticeTimer); $('notice').textContent = message; $('notice').dataset.visible = 'true';
  noticeTimer = setTimeout(() => { $('notice').dataset.visible = 'false'; }, 2200);
}

function panelFor(variant, options = {}) {
  const panel = createStudyPanel({variant, rows: fixtureRows(state.scene, state.custom), theme: state.theme, palette: state.palette, selected: state.selected, showWorkspace: state.workspace && !state.comparing, ...options});
  panel.element.dataset.access = state.access;
  return panel;
}

function choose(id) {
  state.id = id; state.mode = 'single'; state.comparing = false; state.closed = false;
  render(); persistURL();
  if (!state.immersive) $('single-view').scrollIntoView({ block: 'start', behavior: 'instant' });
}

function changeVariant(direction) {
  const candidates = variants.filter(v => v.id !== '00');
  const index = candidates.findIndex(v => v.id === state.id);
  choose(candidates[(index + direction + candidates.length) % candidates.length].id);
}

function togglePin(id) {
  if (state.pins.has(id)) state.pins.delete(id); else state.pins.add(id);
  render();
}

function renderMain() {
  mainPanel?.destroy(); mainPanel = undefined;
  const variant = getVariant(state.comparing ? '00' : state.id);
  $('variant-number').textContent = variant.id;
  $('variant-name').textContent = variant.name;
  $('verdict').textContent = variant.verdict || `${variant.group}研究`;
  $('detail').textContent = variant.detail; $('caution').textContent = variant.caution;
  $('pin').textContent = state.pins.has(state.id) ? '已加入比较' : '加入比较';
  $('pin').setAttribute('aria-pressed', String(state.pins.has(state.id)));
  $('immersive-label').textContent = `${variant.id} ${variant.name} · ${state.theme === 'dark' ? '暗色' : '亮色'}`;
  $('reopen').hidden = !state.closed;
  if (state.closed) return;
  mainPanel = panelFor(variant, {
    onSelect(index) { state.selected = index; },
    onCommit(row) { announce(`样例已切换到「${row.title}」`); if (state.immersive) { state.closed = true; renderMain(); } },
  });
  $('main-mount').append(mainPanel.element);
  mainPanel.select(state.selected, true);
}

function matchesGroup(v) { return v.id !== '00' && (state.group === '全部' || v.group === state.group); }

function renderChoices() {
  $('filters').replaceChildren();
  for (const group of groups) {
    const button = create('button', '', group); button.setAttribute('aria-pressed', String(state.group === group));
    button.addEventListener('click', () => { state.group = group; renderChoices(); renderCollections(); });
    $('filters').append(button);
  }
  $('variant-strip').replaceChildren();
  for (const v of variants.filter(matchesGroup)) {
    const button = create('button', 'variant-choice');
    button.setAttribute('aria-pressed', String(v.id === state.id)); button.dataset.recommended = String(!!v.recommended);
    button.append(create('span', '', v.id), document.createTextNode(v.name));
    button.title = v.detail; button.addEventListener('click', () => choose(v.id));
    $('variant-strip').append(button);
  }
}

function renderCollections() {
  collections.forEach(panel => panel.destroy()); collections = [];
  $('gallery').replaceChildren(); $('comparison').replaceChildren();
  $('gallery').hidden = state.mode !== 'all'; $('comparison').hidden = state.mode !== 'compare';
  if (state.mode === 'single') return;
  const list = state.mode === 'all' ? variants.filter(matchesGroup) : variants.filter(v => state.pins.has(v.id));
  if (!list.length) {
    const empty = create('p', 'compare-note', '还没有加入比较的方案。回到单案细看，选择“加入比较”。');
    $('comparison').append(empty); return;
  }
  for (const v of list) {
    const variant = state.comparing ? getVariant('00') : v;
    const article = create('article', state.mode === 'all' ? 'gallery-card' : 'compare-card'); article.dataset.variant = v.id;
    const title = create('button', 'gallery-title'); title.append(create('small', '', v.id), document.createTextNode(v.name));
    title.addEventListener('click', () => choose(v.id));
    const pin = create('button', 'pin-mini', state.pins.has(v.id) ? '移出比较' : '加入比较');
    pin.setAttribute('aria-pressed', String(state.pins.has(v.id))); pin.setAttribute('aria-label', `${state.pins.has(v.id) ? '移出' : '加入'}比较 ${v.id} ${v.name}`);
    pin.addEventListener('click', () => togglePin(v.id));
    if (state.mode === 'all') {
      const preview = create('div', 'gallery-preview');
      preview.setAttribute('aria-hidden', 'true');
      preview.addEventListener('click', () => choose(v.id));
      const rows = fixtureRows(state.scene, state.custom);
      const panel = panelFor(variant, { rows: [rows[1], rows[4]], selected: 0, interactive: false, motion: false });
      preview.append(panel.element); collections.push(panel);
      const info = create('div', 'gallery-info'), header = create('header', ''); header.append(title, pin);
      info.append(header, create('p', '', v.detail)); article.append(preview, info); $('gallery').append(article);
    } else {
      const header = create('div', 'variant-heading'); header.append(title, pin);
      const stage = create('div', 'stage'), backdrop = create('div', 'stage-backdrop'); backdrop.setAttribute('aria-hidden', 'true');
      const mount = create('div', 'stage-mount');
      const panel = panelFor(variant, { interactive: false, motion: false }); mount.append(panel.element); collections.push(panel);
      stage.append(backdrop, mount); article.append(header, stage, create('p', 'compare-note', `${v.detail} ${v.caution}`)); $('comparison').append(article);
      panel.select(panel.selected, true);
    }
  }
}

function render() {
  document.body.dataset.theme = state.theme; document.body.dataset.mode = state.mode; document.body.dataset.immersive = String(state.immersive);
  const colors = palettes[state.palette];
  document.body.style.setProperty('--host-surface', colors[state.theme]);
  document.body.style.setProperty('--palette-opacity', state.palette === 'neutral' ? '0' : '.58');
  document.querySelectorAll('button[data-theme]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.theme === state.theme)));
  document.querySelectorAll('button[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode)));
  $('baseline-hold').setAttribute('aria-pressed', String(state.comparing));
  $('compare-count').textContent = state.pins.size;
  $('scene').value = state.scene; $('palette').value = state.palette; $('access').value = state.access;
  $('workspace-toggle').setAttribute('aria-pressed', String(state.workspace));
  $('content-source').textContent = state.scene === 'real'
    ? 'Codex 真实文案 · 状态为演示'
    : '原文保留 · 五拍图标保留 · 942 × 190';
  $('scene-description').textContent = state.scene === 'real'
    ? '标题、原话与 Workspace 取自本机 5 个 Codex 聊天。聊天引用显示为名称，状态图标为演示，非实时连接。'
    : '当前使用虚构文案。原生快捷键与宿主接入仍以正式版验证为准。';
  document.querySelector('.immersive-bar').hidden = !state.immersive;
  renderMain(); renderChoices(); renderCollections();
}

document.querySelectorAll('button[data-mode]').forEach(button => button.addEventListener('click', () => { state.mode = button.dataset.mode; state.comparing = false; render(); persistURL(); }));
document.querySelectorAll('button[data-theme]').forEach(button => button.addEventListener('click', () => { state.theme = button.dataset.theme; render(); persistURL(); }));
for (const field of ['scene', 'palette', 'access']) $(field).addEventListener('change', event => { state[field] = event.target.value; state.closed = false; render(); persistURL(); });
$('workspace-toggle').addEventListener('click', () => { state.workspace = !state.workspace; render(); persistURL(); });
$('previous').addEventListener('click', () => changeVariant(-1)); $('next').addEventListener('click', () => changeVariant(1));
$('pin').addEventListener('click', () => togglePin(state.id));
$('immersive').addEventListener('click', () => { state.immersive = true; state.mode = 'single'; state.closed = false; render(); persistURL(); mainPanel?.element.querySelector('[role=listbox]').focus(); });
$('exit-immersive').addEventListener('click', () => { state.immersive = false; state.closed = false; render(); persistURL(); });
$('immersive-theme').addEventListener('click', () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; render(); persistURL(); });
$('reopen').addEventListener('click', () => { state.closed = false; renderMain(); mainPanel?.element.querySelector('[role=listbox]').focus(); });

function setComparison(active) {
  if (state.comparing === active) return;
  state.comparing = active; $('baseline-hold').setAttribute('aria-pressed', String(active)); renderMain(); renderCollections();
}
const hold = $('baseline-hold');
hold.addEventListener('pointerdown', event => { if (event.button !== 0) return; hold.setPointerCapture(event.pointerId); setComparison(true); });
for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture', 'blur']) hold.addEventListener(eventName, () => setComparison(false));
hold.addEventListener('keydown', event => { if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); setComparison(true); } });
hold.addEventListener('keyup', event => { if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); setComparison(false); } });
window.addEventListener('blur', () => setComparison(false));

$('custom-text').addEventListener('input', event => {
  clearTimeout(inputTimer); state.custom = event.target.value;
  inputTimer = setTimeout(() => { state.closed = false; renderMain(); renderCollections(); }, 120);
});
$('reset-text').addEventListener('click', () => { clearTimeout(inputTimer); state.custom = ''; $('custom-text').value = ''; renderMain(); renderCollections(); });
window.addEventListener('keydown', event => {
  if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
  if (event.key === 'Escape') { state.closed = true; setComparison(false); renderMain(); }
  if (state.closed && event.key === ' ' && event.target === document.body) { event.preventDefault(); state.closed = false; renderMain(); }
  if (event.target.closest('button, [role=listbox]')) return;
  if (event.key === 'j') changeVariant(1);
  if (event.key === 'k') changeVariant(-1);
});
window.addEventListener('pagehide', () => { mainPanel?.destroy(); collections.forEach(panel => panel.destroy()); clearTimeout(inputTimer); clearTimeout(noticeTimer); }, { once: true });

render();
