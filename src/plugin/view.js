import { SwitchCycle } from './core.js';
import { createFivebeatMotion } from './motion.js';
import { installSwitcherKeyboard } from './keyboard.js';

export function mountSwitcher(container, host) {
  let cycle, overlay, list, motion, timer, returnFocus, returnSelection, releasePreview = () => {};
  let composing = false, alive = true, queued = false, simulated = false;
  const rows = new Map(), stops = [];
  function listen(target, name, listener, options) {
    target.addEventListener(name, listener, options);
    stops.push(() => target.removeEventListener(name, listener, options));
  }
  function restoreFocus() {
    if (!returnFocus?.isConnected) return;
    returnFocus.focus({ preventScroll: true });
    try {
      if (returnSelection?.range) {
        const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(returnSelection.range);
      } else if (returnSelection) returnFocus.setSelectionRange(returnSelection.start, returnSelection.end, returnSelection.direction);
    } catch { /* Host may have replaced the composer while we were open. */ }
  }
  function finish(commit, restore = true) {
    if (!cycle) return;
    const selected = cycle.selected, original = host.current();
    const release = releasePreview;
    cycle = undefined; clearTimeout(timer); releasePreview = () => {};
    motion?.destroy(); motion = undefined; overlay?.remove(); overlay = undefined; list = undefined; rows.clear();
    try {
      if (commit && selected !== original && host.exists(selected)) {
        try { host.open(selected); } catch (error) { console.error('[DSH Switcher] Could not open session', error); if (restore) restoreFocus(); }
      } else if (restore) restoreFocus();
    } finally {
      // Hand off to the destination before dropping its preview reference.
      try { release(); } finally { returnFocus = undefined; returnSelection = undefined; }
    }
  }
  function refresh() {
    if (!cycle || !overlay) return;
    // Deletion or archiving cancels the frozen selection instead of opening a stale target.
    if (cycle.ids.some(id => !host.exists(id))) { finish(false); return; }
    overlay.dataset.theme = host.theme();
    for (const id of cycle.ids) {
      const row = host.row(id), node = rows.get(id);
      node.card.setAttribute('aria-selected', String(cycle.selected === id));
      node.card.setAttribute('aria-label', `${row.workspaceName}，${row.title}，${row.label}${id === host.current() ? '，当前会话' : ''}`);
      node.project.textContent = row.workspaceName; node.project.title = row.workspaceName;
      node.excerpt.textContent = row.text || row.placeholder;
      node.excerpt.title = row.text || row.placeholder || '';
      node.excerpt.dataset.empty = String(!row.text);
      node.title.textContent = row.title; node.title.title = row.title;
      node.status.dataset.status = row.kind; node.status.title = row.label;
      node.statusLabel.textContent = row.shortLabel || row.label;
      node.icon.dataset.status = row.kind; node.icon.title = row.label;
      node.motion.update(row.kind, row.draft);
    }
    list.setAttribute('aria-activedescendant', rows.get(cycle.selected).card.id);
  }
  function scheduleRefresh() {
    if (queued || !alive) return;
    queued = true; queueMicrotask(() => { queued = false; if (alive) refresh(); });
  }
  function scrollSelected() {
    const card = rows.get(cycle?.selected)?.card;
    if (!card || !list) return;
    const left = card.offsetLeft - list.offsetLeft;
    if (left < list.scrollLeft) list.scrollLeft = left;
    else if (left + card.offsetWidth > list.scrollLeft + list.clientWidth) list.scrollLeft = left + card.offsetWidth - list.clientWidth;
  }
  function reveal() {
    if (!cycle || !overlay) return;
    overlay.dataset.revealed = 'true';
    motion = createFivebeatMotion();
    for (const id of cycle.ids) {
      const row = host.row(id), node = rows.get(id);
      node.motion = motion.mount(node.icon, row.kind, row.draft);
    }
    releasePreview = host.preview(cycle.ids);
    refresh(); scrollSelected(); list?.focus({ preventScroll: true });
  }
  function begin(direction = 1, demo = false) {
    if (!alive || composing) return;
    if (cycle) { cycle.step(direction); refresh(); scrollSelected(); return; }
    const ids = host.candidates();
    if (ids.length < 2) return;
    simulated = demo;
    returnFocus = document.activeElement;
    const selection = window.getSelection();
    if (returnFocus instanceof HTMLInputElement || returnFocus instanceof HTMLTextAreaElement) {
      returnSelection = { start: returnFocus.selectionStart, end: returnFocus.selectionEnd, direction: returnFocus.selectionDirection };
    } else if (selection?.rangeCount && returnFocus?.contains(selection.anchorNode)) returnSelection = { range: selection.getRangeAt(0).cloneRange() };
    cycle = new SwitchCycle(ids, host.current(), direction);
    overlay = document.createElement('div'); overlay.className = 'dsh-switcher'; overlay.dataset.revealed = 'false';
    overlay.dataset.theme = host.theme(); overlay.dataset.shortcutModal = 'dsh-switcher'; overlay.tabIndex = -1;
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-label', '切换会话');
    const panel = document.createElement('div'); panel.className = 'dsh-switcher-panel'; panel.style.setProperty('--sw-width', `${ids.length * 182 + 32}px`);
    list = document.createElement('div'); list.className = 'dsh-switcher-list'; list.tabIndex = -1; list.style.outline = 'none'; list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', '最近会话');
    ids.forEach((id, index) => {
      const card = document.createElement('div'); card.className = 'dsh-switcher-card'; card.id = `dsh-switcher-option-${index}`; card.setAttribute('role', 'option');
      const project = document.createElement('span'); project.className = 'dsh-switcher-project';
      const title = document.createElement('span'); title.className = 'dsh-switcher-title';
      const status = document.createElement('div'); status.className = 'dsh-switcher-status';
      const icon = document.createElement('span'); icon.className = 'dsh-switcher-icon'; icon.setAttribute('aria-hidden', 'true');
      const statusLabel = document.createElement('span'); statusLabel.className = 'dsh-switcher-status-label';
      const excerpt = document.createElement('p'); excerpt.className = 'dsh-switcher-excerpt';
      status.append(icon, statusLabel); card.append(project, title, status, excerpt); list.append(card);
      rows.set(id, { card, project, title, status, statusLabel, excerpt, icon, motion: { update() {} } });
      // Pointer movement selects, without a stale hover overriding keyboard navigation.
      card.addEventListener('pointermove', event => { if (cycle && (event.movementX || event.movementY)) { cycle.select(id); refresh(); } });
      card.addEventListener('click', () => { if (cycle) { cycle.select(id); finish(true); } });
    });
    panel.append(list); overlay.append(panel); container.append(overlay);
    overlay.addEventListener('pointerdown', event => { if (event.target === overlay) { event.preventDefault(); finish(false); } });
    refresh();
    // Own the full keyboard gesture before the delayed visual reveal.
    overlay?.focus({ preventScroll: true });
    if (cycle) timer = setTimeout(reveal, demo ? 0 : 140);
  }
  listen(window, 'blur', () => finish(false, false));
  listen(document, 'visibilitychange', () => { if (document.hidden) finish(false, false); });
  listen(document, 'compositionstart', () => { composing = true; finish(false); }, true);
  listen(document, 'compositionend', () => { composing = false; }, true);
  stops.push(host.subscribe(scheduleRefresh));
  const controller = {
    begin,
    get active() { return !!cycle; },
    get composing() { return composing; },
    get simulated() { return simulated; },
    commit: () => finish(true),
    cancel: () => finish(false),
    destroy() { alive = false; finish(false); stops.forEach(stop => stop()); },
  };
  stops.push(installSwitcherKeyboard(window, controller, () =>
    !!document.querySelector('[data-shortcut-modal], [aria-modal="true"]')));
  return controller;
}
