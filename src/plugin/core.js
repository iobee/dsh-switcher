export const HISTORY_KEY = 'dsh-switcher.mru.v1';
export const MAX_CANDIDATES = 5;

export function readHistory(raw) {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string'))].slice(0, 100) : [];
  } catch { return []; }
}

export function remember(history, id) {
  return id ? [id, ...history.filter(other => other !== id)].slice(0, 100) : history;
}

export function candidates(snapshot, archived, history, current, draftIds = []) {
  const excluded = new Set(archived);
  const drafts = new Set(draftIds);
  // Opened subagents may live in byId without being part of the top-level ids catalog.
  const known = [...new Set([...snapshot.ids, current, ...history])];
  const available = known.filter(id => !excluded.has(id) && snapshot.byId[id] &&
    (id === current || drafts.has(id) || snapshot.byId[id].blank !== true));
  const allowed = new Set(available);
  const recent = available.filter(id => !snapshot.byId[id].parentId && snapshot.byId[id].origin !== 'subagent')
    .sort((a, b) => (snapshot.byId[b].updatedAt || 0) - (snapshot.byId[a].updatedAt || 0));
  return [...new Set([current, ...history, ...recent])].filter(id => allowed.has(id)).slice(0, MAX_CANDIDATES);
}

export class SwitchCycle {
  constructor(ids, current, direction) {
    this.ids = [...ids];
    this.index = Math.max(0, this.ids.indexOf(current));
    this.step(direction);
  }
  get selected() { return this.ids[this.index]; }
  step(direction) {
    if (this.ids.length) this.index = (this.index + direction + this.ids.length) % this.ids.length;
  }
  select(id) {
    const index = this.ids.indexOf(id);
    if (index >= 0) this.index = index;
  }
}

export function latestUserInput(entries) {
  for (let index = entries.length - 1; index >= 0; index--) {
    const event = entries[index].event;
    if (event?.type !== 'user/message') continue;
    const message = event.data;
    if (message?.source?.kind && message.source.kind !== 'user') continue;
    if (message?.role && message.role !== 'user') continue;
    const parts = Array.isArray(message?.content) ? message.content : [];
    const text = typeof message?.content === 'string' ? message.content :
      parts.filter(part => part.type === 'text' && typeof part.text === 'string').map(part => part.text).join('\n');
    if (text.trim()) return text.replace(/\s+/g, ' ').trim().slice(0, 800);
    if (parts.length) return '已发送附件';
  }
  return '';
}

export function hasDraft(value) {
  const draft = typeof value === 'string' ? value : value?.text;
  return typeof draft === 'string' && draft.trim().length > 0;
}

// Match DSH's workspace membership first; cwd is only an ungrouped fallback.
export function sessionWorkspaceName(snapshot, id, summary) {
  const workspace = snapshot.items?.find(item => item.sessionIds.includes(id));
  const basename = path => typeof path === 'string' ? path.trim().split(/[\\/]+/).filter(Boolean).at(-1) || path.trim() : '';
  return workspace?.title?.trim() || basename(workspace?.path) || basename(summary?.cwd) || '未分组';
}

export function sessionPresentation(status, summary, draft = false) {
  let kind = 'idle', label = '会话已就绪', shortLabel = '已就绪';
  if (status?.pendingInteraction) {
    kind = 'approval';
    label = status.pendingInteraction.kind === 'approval' ? '等待用户确认' : '等待用户回应';
    shortLabel = status.pendingInteraction.kind === 'approval' ? '待确认' : '待回应';
  } else if (status?.running ?? summary?.running) {
    kind = 'running'; label = shortLabel = '运行中';
  } else if (status?.completionUnread) {
    kind = 'unread'; label = '有新结果'; shortLabel = '新结果';
  } else if (draft) {
    kind = 'draft'; label = shortLabel = '有草稿';
  }
  if (draft && kind !== 'draft') { label += '，有草稿'; shortLabel += ' · 有草稿'; }
  return { kind, label, shortLabel, draft };
}
