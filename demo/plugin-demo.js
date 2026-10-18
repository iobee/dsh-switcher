import { mountSwitcher } from '../src/plugin/view.js';
import { remember } from '../src/plugin/core.js';
const data = [
  { id: 'a', title: '打磨键盘导航体验', text: '想把高频操作连起来，尽量让双手留在键盘上。', kind: 'draft', label: '有草稿', draft: true },
  { id: 'b', title: '节点稳定性与切换策略', text: '延迟很低但只稳定一小会儿的节点，不要急着切过去。', kind: 'running', label: '运行中' },
  { id: 'c', title: '左侧栏的焦点与候选状态', text: '上下移动的时候，先不要直接切换会话。', kind: 'idle', label: '会话已就绪' },
  { id: 'd', title: 'DSH 插件接入方案', text: '把插件的接入边界梳理一下。', kind: 'approval', label: '等待用户确认' },
  { id: 'e', title: '一念 · 快速记录交互', text: '打开就能写，历史记录也要容易找到。', kind: 'unread', label: '有新结果' },
];
let current = 'a', history = data.map(row => row.id), theme = new URLSearchParams(location.search).get('theme') || 'light';
const listeners = new Set();
const publish = () => { document.body.dataset.theme = theme; for (const fn of listeners) fn(); };
const host = {
  current: () => current, candidates: () => history, theme: () => theme, exists: id => data.some(row => row.id === id),
  row: id => data.find(row => row.id === id), preview: () => () => {},
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  open(id) { current = id; history = remember(history, id); document.getElementById('current').textContent = `当前：${host.row(id).title}`; publish(); },
};
const controller = mountSwitcher(document.getElementById('mount'), host);
document.getElementById('show').onclick = () => controller.begin(1, true);
for (const value of ['light', 'dark']) document.getElementById(value).onclick = () => { theme = value; publish(); };
document.getElementById('state').onclick = () => { data[1].kind = data[1].kind === 'running' ? 'approval' : 'running'; data[1].label = data[1].kind === 'running' ? '运行中' : '等待用户确认'; publish(); };
document.getElementById('dispose').onclick = () => controller.destroy();
// Native-key semantics can be exercised through an alternate test chord in the browser.
window.addEventListener('keydown', event => {
  if (event.ctrlKey && event.code === 'KeyK' && !controller.active) { event.preventDefault(); controller.begin(event.shiftKey ? -1 : 1); }
});
publish(); controller.begin(1, true);
