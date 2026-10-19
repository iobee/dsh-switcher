import { createFivebeatMotion } from '../plugin/motion.js';
import { splitExcerpt, textKind } from './content.js';
import { palettes } from './variants.js';

let sequence = 0;
const node = (tag, name, text) => {
  const el = document.createElement(tag); el.className = name;
  if (text !== undefined) el.textContent = text;
  return el;
};

// A local study renderer. Reuses production CSS and the exact family 11 motion.
// Does not register production shortcuts or connect to any host service.
export function createStudyPanel({ variant, rows, theme = 'dark', palette = 'neutral', selected = 1, interactive = true, motion = true, showWorkspace = false, onCommit = () => {}, onSelect = () => {} }) {
  const id = `study-${++sequence}`;
  const root = node('div', 'dsh-switcher study-switcher');
  root.dataset.theme = theme; root.dataset.revealed = 'true'; root.dataset.variant = variant.id;
  root.dataset.material = variant.material; root.dataset.type = variant.type; root.dataset.treatment = variant.treatment || '';
  root.dataset.context = String(showWorkspace);
  const colors = palettes[palette] || palettes.neutral;
  root.style.setProperty('--host-surface', colors[theme]); root.style.setProperty('--host-accent', colors.accent);
  const panel = node('div', 'dsh-switcher-panel'); panel.style.setProperty('--sw-width', `${rows.length * 182 + 32}px`);
  const list = node('div', 'dsh-switcher-list'); list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', `${variant.id} ${variant.name} 最近会话`);
  list.tabIndex = interactive ? 0 : -1;
  const animator = createFivebeatMotion();
  const cards = rows.map((row, index) => {
    const card = node('div', 'dsh-switcher-card'); card.id = `${id}-${index}`; card.setAttribute('role', 'option');
    const workspaceName = row.workspaceName || '未指定 workspace';
    card.setAttribute('aria-label', `${row.title}${showWorkspace ? `，所属项目或 Workspace：${workspaceName}` : ''}，${row.label}。${row.text || row.placeholder}`);
    const body = node('div', 'dsh-switcher-body');
    const mark = node('span', 'study-mark', variant.type === 'caption' ? '最后输入' : variant.type === 'quote' ? '“' : '');
    mark.setAttribute('aria-hidden', 'true');
    const excerpt = node('p', 'dsh-switcher-excerpt'); excerpt.dataset.empty = String(!row.text);
    excerpt.dataset.kind = textKind(row.text); excerpt.dataset.short = String(Array.from(row.text).length <= 18);
    const [first, rest] = splitExcerpt(row.text || row.placeholder);
    excerpt.dataset.split = String(Boolean(rest));
    excerpt.append(node('span', 'study-lead', first), node('span', 'study-rest', rest));
    body.append(mark, excerpt);
    const foot = node('div', 'dsh-switcher-foot');
    const icon = node('span', 'dsh-switcher-icon'); icon.dataset.status = row.kind; icon.title = row.label;
    const title = node('span', 'dsh-switcher-title', row.title); title.title = row.title;
    if (showWorkspace) {
      const identity = node('span', 'study-identity');
      const workspace = node('span', 'study-workspace', workspaceName);
      workspace.title = `项目 / Workspace：${workspaceName}`;
      identity.append(title, workspace); foot.append(icon, identity);
    } else foot.append(icon, title);
    card.append(body, foot); list.append(card);
    animator.mount(icon, row.kind, row.draft);
    if (interactive) {
      card.addEventListener('pointermove', e => { if (e.movementX || e.movementY) select(index); });
      card.addEventListener('click', () => { select(index); onCommit(row); });
    }
    return card;
  });
  panel.append(list); root.append(panel);
  let disposed = false;
  function select(index, scroll = false) {
    selected = (index + rows.length) % rows.length;
    cards.forEach((card, i) => card.setAttribute('aria-selected', String(i === selected)));
    list.setAttribute('aria-activedescendant', cards[selected].id);
    if (scroll) {
      const left = cards[selected].offsetLeft - list.offsetLeft;
      if (left < list.scrollLeft) list.scrollLeft = left;
      else if (left + 182 > list.scrollLeft + list.clientWidth) list.scrollLeft = left + 182 - list.clientWidth;
    }
    onSelect(selected);
  }
  select(selected);
  list.addEventListener('keydown', event => {
    if (!interactive || event.isComposing) return;
    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End', 'Enter'].includes(event.key)) {
      event.preventDefault(); event.stopPropagation();
      if (event.key === 'Enter') onCommit(rows[selected]);
      else if (event.key === 'Home') select(0, true);
      else if (event.key === 'End') select(rows.length - 1, true);
      else select(selected + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1), true);
    }
  });
  // Gallery samples settle to the actual icon geometry then release the loop.
  let freeze;
  if (!motion) freeze = requestAnimationFrame(() => { freeze = requestAnimationFrame(() => animator.destroy()); });
  return { element: root, select, get selected() { return selected; }, destroy() {
    if (disposed) return; disposed = true; cancelAnimationFrame(freeze); animator.destroy(); root.remove();
  } };
}
