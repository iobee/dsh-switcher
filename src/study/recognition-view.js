import { createFivebeatMotion } from '../plugin/motion.js';

const statusNames = { draft: '有草稿', running: '运行中', idle: '已就绪', approval: '待确认', unread: '新结果' };
let sequence = 0;
const node = (tag, className, text) => {
  const element = document.createElement(tag); element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

// Prototype only: no host calls or production shortcut registration.
export function createRecognitionPanel({ rows, layout, theme = 'dark', material = 'quiet', selected = 1, interactive = true, motion = true, onSelect = () => {}, onCommit = () => {} }) {
  const id = `recognition-${++sequence}`;
  const root = node('div', 'dsh-switcher study-switcher recognition-switcher');
  Object.assign(root.dataset, { theme, material, revealed: 'true', layout: layout.id });
  const panel = node('div', 'dsh-switcher-panel');
  panel.style.setProperty('--sw-width', `${rows.length * 182 + 32}px`);
  const list = node('div', 'dsh-switcher-list recognition-list');
  list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', `${layout.number} ${layout.name} 最近会话`);
  list.setAttribute('aria-orientation', layout.id === 'rows' ? 'vertical' : 'horizontal');
  list.tabIndex = interactive ? 0 : -1;
  const animator = createFivebeatMotion();
  const cards = rows.map((row, index) => {
    const projectName = row.workspaceName || '未指定 workspace';
    const label = statusNames[row.kind] || row.label;
    const card = node('div', 'dsh-switcher-card recognition-card'); card.id = `${id}-${index}`;
    card.setAttribute('role', 'option');
    card.setAttribute('aria-label', `${projectName}，${row.title}，${label}`);
    const project = node('div', 'recognition-project', projectName); project.title = `项目 / Workspace：${projectName}`;
    const title = node('div', 'recognition-title', row.title); title.title = row.title;
    const status = node('div', 'recognition-status'); status.dataset.status = row.kind;
    const icon = node('span', 'dsh-switcher-icon'); icon.dataset.status = row.kind; icon.setAttribute('aria-hidden', 'true');
    status.append(icon, node('span', 'recognition-status-label', label));
    const note = node('div', 'recognition-note', row.text || row.placeholder); note.title = row.text || row.placeholder;
    note.dataset.empty = String(!row.text);
    card.append(project, title, status, note); list.append(card);
    animator.mount(icon, row.kind, row.draft);
    if (interactive) {
      card.addEventListener('pointermove', event => { if (event.movementX || event.movementY) select(index); });
      card.addEventListener('click', () => { select(index); onCommit(row); });
    }
    return card;
  });
  const shared = node('div', 'recognition-shared');
  const sharedText = node('span', 'recognition-shared-text');
  shared.append(node('span', 'recognition-shared-label', '最后输入'), sharedText);
  shared.hidden = layout.id !== 'shared';
  panel.append(list, shared); root.append(panel);
  let disposed = false;
  function select(index, scroll = false) {
    selected = (index + rows.length) % rows.length;
    cards.forEach((card, i) => card.setAttribute('aria-selected', String(i === selected)));
    list.setAttribute('aria-activedescendant', cards[selected].id);
    sharedText.textContent = rows[selected].text || rows[selected].placeholder;
    sharedText.title = sharedText.textContent;
    if (scroll && layout.id !== 'rows') {
      const card = cards[selected].getBoundingClientRect(), viewport = list.getBoundingClientRect();
      if (card.left < viewport.left) list.scrollLeft -= viewport.left - card.left;
      else if (card.right > viewport.right) list.scrollLeft += card.right - viewport.right;
    }
    onSelect(selected);
  }
  select(selected);
  list.addEventListener('keydown', event => {
    if (!interactive || event.isComposing || !['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End', 'Enter'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    if (event.key === 'Enter') onCommit(rows[selected]);
    else if (event.key === 'Home') select(0, true);
    else if (event.key === 'End') select(rows.length - 1, true);
    else select(selected + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1), true);
  });
  let freeze;
  if (!motion) freeze = requestAnimationFrame(() => { freeze = requestAnimationFrame(() => animator.destroy()); });
  return { element: root, select, get selected() { return selected; }, destroy() {
    if (disposed) return; disposed = true; cancelAnimationFrame(freeze); animator.destroy(); root.remove();
  } };
}
