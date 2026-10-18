import { mountSwitcher } from '../../src/plugin/view.js';

// The production renderer, keyboard and complete icon family are reused.
// Only the host data and material variables below belong to this study.
const rows = [
  { id: 'a', title: '打磨键盘导航体验', text: '想把高频操作连起来，尽量让双手留在键盘上。', kind: 'draft', label: '有草稿', draft: true },
  { id: 'b', title: '节点稳定性与切换策略', text: '延迟很低但只稳定一小会儿的节点，不要急着切过去。', kind: 'running', label: '运行中' },
  { id: 'c', title: '左侧栏的焦点与候选状态', text: '上下移动的时候，先不要直接切换会话。', kind: 'idle', label: '会话已就绪' },
  { id: 'd', title: 'DSH 插件接入方案', text: '把插件的接入边界梳理一下。', kind: 'approval', label: '等待用户确认' },
  { id: 'e', title: '一念 · 快速记录交互', text: '打开就能写，历史记录也要容易找到。', kind: 'unread', label: '有新结果' },
];
const notes = {
  baseline: '保留的原版 · 05 / 05 raised（0.1.2）',
  mist: 'A 雾面 · 灰阶更收敛，卡片只高出底面一点',
  glass: 'B 轻透 · 更多背景透入，边缘和薄阴影保留层次',
  soft: 'C 柔光 · 保留清晰卡面，把硬边和下方阴影揉轻',
};
const params = new URLSearchParams(location.search);
let material = Object.hasOwn(notes, params.get('material')) ? params.get('material') : 'mist';
let theme = params.get('theme') === 'light' ? 'light' : 'dark';
let comparing = false;
const subscribers = new Set();
const host = {
  current: () => 'a', candidates: () => rows.map(row => row.id), theme: () => theme,
  exists: id => rows.some(row => row.id === id), row: id => rows.find(row => row.id === id),
  preview: () => () => {},
  subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },
  open() { /* Selection is local to this material preview. */ },
};
const compare = document.getElementById('compare');
// The comparison toolbar is outside the demonstrated modal. Keep its own
// keyboard controls usable without changing the production gesture handler.
window.addEventListener('keydown', event => {
  const button = event.target.closest?.('.controls button');
  if (!button) return;
  event.stopImmediatePropagation();
  if (!['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  if (button === compare) { comparing = true; render(); ensureOpen(); }
  else if (!event.repeat) button.click();
}, true);
window.addEventListener('keyup', event => {
  if (event.target === compare && ['Enter', ' '].includes(event.key)) {
    event.preventDefault(); event.stopImmediatePropagation(); endComparison();
  }
}, true);
const controller = mountSwitcher(document.getElementById('mount'), host);
function render() {
  document.body.dataset.theme = theme;
  document.body.dataset.material = comparing ? 'baseline' : material;
  document.querySelectorAll('button[data-material]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.material === material)));
  document.querySelectorAll('button[data-theme]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.theme === theme)));
  compare.setAttribute('aria-pressed', String(comparing));
  document.getElementById('material-note').textContent = comparing ? notes.baseline : notes[material];
  for (const fn of subscribers) fn();
}
function persistURL() {
  const next = new URL(location.href);
  next.searchParams.set('material', material); next.searchParams.set('theme', theme);
  history.replaceState(null, '', next);
}
function ensureOpen() { if (!controller.active) controller.begin(1, true); }
document.querySelectorAll('button[data-material]').forEach(button => button.addEventListener('click', () => {
  material = button.dataset.material; comparing = false; render(); ensureOpen(); persistURL();
}));
document.querySelectorAll('button[data-theme]').forEach(button => button.addEventListener('click', () => {
  theme = button.dataset.theme; render(); ensureOpen(); persistURL();
}));
document.getElementById('reopen').addEventListener('click', () => { controller.cancel(); controller.begin(1, true); });
compare.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  compare.setPointerCapture(event.pointerId); comparing = true; render(); ensureOpen();
});
function endComparison() { if (comparing) { comparing = false; render(); } }
compare.addEventListener('pointerup', endComparison);
compare.addEventListener('pointercancel', endComparison);
compare.addEventListener('lostpointercapture', endComparison);
compare.addEventListener('blur', endComparison);
window.addEventListener('blur', endComparison);
window.addEventListener('pagehide', () => controller.destroy(), { once: true });
render(); controller.begin(1, true);
