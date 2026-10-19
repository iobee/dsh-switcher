import { HISTORY_KEY, readHistory, remember, candidates, latestUserInput, hasDraft, sessionPresentation, sessionWorkspaceName } from './core.js';

// Adapter for the public client services shipped in DSH 0.2.1-rc.2.
export function createHostAdapter(ctx) {
  let history = [], disposed = false, observedId, observedBinding, stopCurrent = () => {};
  const listeners = new Set(), cache = new Map(), previewOwners = new Set();
  try { history = readHistory(sessionStorage.getItem(HISTORY_KEY)); } catch { /* Memory-only history remains usable. */ }
  const current = () => ctx.sidebarRight.mounted.getSnapshot();
  const publish = () => { if (!disposed) for (const listener of listeners) listener(); };
  function watch(binding) {
    const id = binding.sessionId, session = binding.session;
    let input, eventWindow, windowHasInput = false, text = cache.get(id)?.text || '';
    try { input = ctx.conversation.input.for(binding.ctx).state; } catch { /* Some sources have no composer. */ }
    const refresh = () => {
      if (disposed) return;
      const snapshot = session.getSnapshot();
      const previous = cache.get(id);
      const nextWindow = session.eventSource.getSnapshot();
      if (nextWindow !== eventWindow) {
        // DSH exposes contiguous event-window changes. Streaming assistant chunks
        // must not materialize and scan the complete history for an unchanged user line.
        const contiguous = eventWindow && Number.isInteger(nextWindow.revision) && nextWindow.revision === eventWindow.revision + 1;
        const change = contiguous ? nextWindow.change : undefined;
        let found;
        if (change?.kind === 'append' && Array.isArray(change.entries)) found = latestUserInput(change.entries);
        else if (change?.kind === 'prepend' && Array.isArray(change.entries)) {
          // A cached fallback can predate this window's actual latest user input.
          if (!windowHasInput) found = latestUserInput(change.entries);
        } else if (change?.kind !== 'settle-assistant') {
          found = latestUserInput(nextWindow.entries); windowHasInput = !!found;
        }
        if (found) { text = found; windowHasInput = true; }
        eventWindow = nextWindow;
      }
      const draftState = input?.getSnapshot();
      const next = {
        text,
        ready: snapshot.openState === 'open',
        error: snapshot.openState === 'error',
        draft: hasDraft(draftState?.draft) || !!draftState?.attachmentIds?.length,
      };
      if (previous && next.text === previous.text && next.ready === previous.ready && next.error === previous.error && next.draft === previous.draft) return;
      cache.set(id, next);
      if (cache.size > 100) cache.delete(cache.keys().next().value);
      publish();
    };
    const stops = [session.eventSource.subscribe(refresh), session.subscribe(refresh)];
    if (input) stops.push(input.subscribe(refresh));
    refresh();
    return () => { for (const stop of stops) stop(); };
  }
  function reconcile() {
    if (disposed) return;
    const id = current();
    if (id && id !== observedId) {
      observedId = id; history = remember(history, id);
      try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { /* Storage may be unavailable. */ }
    }
    let binding;
    try { binding = id ? ctx.sessions.binding(id) : undefined; } catch { /* Mount is still resolving. */ }
    if (binding !== observedBinding) {
      stopCurrent(); observedBinding = binding;
      stopCurrent = binding ? watch(binding) : () => {};
    }
    publish();
  }
  const stops = [ctx.sessions.list.subscribe(reconcile), ctx.sidebarRight.mounted.subscribe(reconcile),
    ctx.uiSession.sessionStatus.subscribe(publish), ctx.workspaces.list.subscribe(publish), ctx.on('theme/change', publish)];
  reconcile();
  return {
    current,
    candidates: () => candidates(ctx.sessions.list.getSnapshot(), ctx.workspaces.list.getSnapshot().archivedSessionIds || [], history, current(),
      [...cache].filter(([, row]) => row.draft).map(([id]) => id)),
    exists: id => !!ctx.sessions.list.getSnapshot().byId[id] && !(ctx.workspaces.list.getSnapshot().archivedSessionIds || []).includes(id),
    theme: () => ctx.theme.getTheme().active.colorScheme === 'dark' ? 'dark' : 'light',
    row(id) {
      const summary = ctx.sessions.list.getSnapshot().byId[id], data = cache.get(id);
      return {
        id, title: summary?.displayTitle || summary?.title || '新会话',
        workspaceName: sessionWorkspaceName(ctx.workspaces.list.getSnapshot(), id, summary),
        text: data?.text || '', placeholder: data?.error ? '暂时无法读取最后输入' : data?.ready ? '还没有输入' : '正在读取最后输入…',
        ...sessionPresentation(ctx.uiSession.sessionStatus.getSnapshot().get(id), summary, data?.draft),
      };
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    preview(ids) {
      let active = true;
      const owners = [];
      const release = () => {
        if (!active) return;
        active = false; previewOwners.delete(release);
        for (const owner of owners) { owner.stop?.(); owner.reference.release(); }
      };
      previewOwners.add(release);
      for (const id of ids) {
        // The mounted conversation already has a host-owned binding and watcher.
        if (id === observedId && observedBinding) continue;
        let owner;
        try {
          const reference = ctx.sessions.retain(id, { source: 'plugin:dsh-switcher' });
          owner = { reference }; owners.push(owner);
          owner.stop = watch(reference.binding);
          reference.ready.catch(() => {
            if (active && !disposed) { cache.set(id, { ...cache.get(id), error: true }); publish(); }
          });
        } catch {
          cache.set(id, { ...cache.get(id), error: true });
        }
      }
      publish();
      return release;
    },
    open: id => ctx.uiWorkspace.openSession(id),
    destroy() {
      disposed = true; stopCurrent();
      for (const release of [...previewOwners]) release();
      for (const stop of stops) stop();
      listeners.clear(); cache.clear();
    },
  };
}
