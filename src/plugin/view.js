import { SwitchCycle } from './core.js';
import { createFivebeatMotion } from './motion.js';
import { installSwitcherKeyboard } from './keyboard.js';

export function mountSwitcher(container, host) {
  let cycle, overlay, list, motion, timer, returnFocus, returnSelection, resize, selectedId, releasePreview = () => {};
  let composing = false, alive = true, simulated = false, refreshFrame = 0, viewportWidth = 0, scrollPosition = 0;
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
    cycle = undefined; clearTimeout(timer); cancelAnimationFrame(refreshFrame); refreshFrame = 0; releasePreview = () => {};
    resize?.disconnect(); resize = undefined; selectedId = undefined;
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
  function renderSelection() {
    if (!cycle || !list || cycle.selected === selectedId) return;
    rows.get(selectedId)?.card.setAttribute('aria-selected', 'false');
    selectedId = cycle.selected;
    const card = rows.get(selectedId).card;
    card.setAttribute('aria-selected', 'true');
    list.setAttribute('aria-activedescendant', card.id);
  }
  function refresh() {
    cancelAnimationFrame(refreshFrame); refreshFrame = 0;
    if (!cycle || !overlay) return;
    // Deletion or archiving cancels the frozen selection instead of opening a stale target.
    if (cycle.ids.some(id => !host.exists(id))) { finish(false); return; }
    const theme = host.theme(), current = host.current();
    if (overlay.dataset.theme !== theme) overlay.dataset.theme = theme;
    for (const id of cycle.ids) {
      const row = host.row(id), node = rows.get(id), old = node.value || {};
      const label = `${row.workspaceName}，${row.title}，${row.label}${id === current ? '，当前会话' : ''}`;
      const text = row.text || row.placeholder || '', shortLabel = row.shortLabel || row.label;
      if (node.label !== label) { node.card.setAttribute('aria-label', label); node.label = label; }
      if (row.workspaceName !== old.workspaceName) { node.project.textContent = row.workspaceName; node.project.title = row.workspaceName; }
      if (text !== (old.text || old.placeholder || '')) { node.excerpt.textContent = text; node.excerpt.title = text; }
      if (!node.value || !!row.text !== !!old.text) node.excerpt.dataset.empty = String(!row.text);
      if (row.title !== old.title) { node.title.textContent = row.title; node.title.title = row.title; }
      if (row.kind !== old.kind) { node.status.dataset.status = row.kind; node.icon.dataset.status = row.kind; }
      if (row.label !== old.label) { node.status.title = row.label; node.icon.title = row.label; }
      if (shortLabel !== (old.shortLabel || old.label)) node.statusLabel.textContent = shortLabel;
      if (row.kind !== old.kind || row.draft !== old.draft) node.motion.update(row.kind, row.draft);
      node.value = row;
    }
    renderSelection();
  }
  function scheduleRefresh() {
    if (refreshFrame || !alive || !cycle) return;
    refreshFrame = requestAnimationFrame(() => { refreshFrame = 0; if (alive) refresh(); });
  }
  function scrollSelected() {
    if (!cycle || !list || !viewportWidth) return;
    // Cards have a fixed 182px border box. Avoid a forced layout after each selection.
    const left = cycle.index * 182, right = left + 182;
    const next = left < scrollPosition ? left : right > scrollPosition + viewportWidth ? right - viewportWidth : scrollPosition;
    if (next !== scrollPosition) list.scrollLeft = scrollPosition = next;
  }
  function reveal() {
    if (!cycle || !overlay) return;
    overlay.dataset.revealed = 'true';
    motion = createFivebeatMotion();
    for (const id of cycle.ids) {
      const node = rows.get(id), row = node.value;
      node.motion = motion.mount(node.icon, row.kind, row.draft);
    }
    releasePreview = host.preview(cycle.ids);
    refresh(); scrollSelected(); list?.focus({ preventScroll: true });
  }
  function begin(direction = 1, demo = false) {
    if (!alive || composing) return;
    if (cycle) { cycle.step(direction); renderSelection(); scrollSelected(); return; }
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
    overlay.dataset.pointer = 'keyboard';
    overlay.dataset.theme = host.theme(); overlay.dataset.shortcutModal = 'dsh-switcher'; overlay.tabIndex = -1;
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-label', '切换会话');
    const panel = document.createElement('div'); panel.className = 'dsh-switcher-panel'; panel.style.setProperty('--sw-width', `${ids.length * 182 + 32}px`);
    list = document.createElement('div'); list.className = 'dsh-switcher-list'; list.tabIndex = -1; list.style.outline = 'none'; list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', '最近会话');
    ids.forEach((id, index) => {
      const card = document.createElement('div'); card.className = 'dsh-switcher-card'; card.id = `dsh-switcher-option-${index}`; card.setAttribute('role', 'option'); card.setAttribute('aria-selected', 'false');
      const project = document.createElement('span'); project.className = 'dsh-switcher-project';
      const title = document.createElement('span'); title.className = 'dsh-switcher-title';
      const status = document.createElement('div'); status.className = 'dsh-switcher-status';
      const icon = document.createElement('span'); icon.className = 'dsh-switcher-icon'; icon.setAttribute('aria-hidden', 'true');
      const statusLabel = document.createElement('span'); statusLabel.className = 'dsh-switcher-status-label';
      const excerpt = document.createElement('p'); excerpt.className = 'dsh-switcher-excerpt';
      status.append(icon, statusLabel); card.append(project, title, status, excerpt); list.append(card);
      rows.set(id, { card, project, title, status, statusLabel, excerpt, icon, motion: { update() {} } });
      // Pointer movement selects, without a stale hover overriding keyboard navigation.
      card.addEventListener('pointermove', event => {
        if (cycle && cycle.selected !== id && (event.movementX || event.movementY)) { cycle.select(id); renderSelection(); }
      });
      const commit = event => {
        if (!cycle) return;
        event.preventDefault(); event.stopPropagation(); cycle.select(id); finish(true);
      };
      card.addEventListener('click', commit);
      // macOS turns Control+primary-click into contextmenu, without a click event.
      card.addEventListener('contextmenu', event => { if (event.ctrlKey) commit(event); });
    });
    // Start each presentation with a quiet pointer. Enter/over events caused by
    // revealing the panel must not reveal it or take over keyboard selection.
    overlay.addEventListener('pointermove', event => {
      if (overlay.dataset.pointer === 'keyboard' && (event.movementX || event.movementY)) overlay.dataset.pointer = 'mouse';
    }, { capture: true, passive: true });
    panel.append(list); overlay.append(panel); container.append(overlay);
    const viewport = list;
    viewportWidth = viewport.clientWidth; scrollPosition = 0;
    viewport.addEventListener('scroll', () => { if (list === viewport) scrollPosition = viewport.scrollLeft; }, { passive: true });
    resize = new ResizeObserver(entries => {
      if (list !== viewport) return;
      viewportWidth = entries[0].contentRect.width; scrollSelected();
    });
    resize.observe(viewport);
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
