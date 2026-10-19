// Reproducible adapter workload; no DSH profile or real session data is accessed.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const path = process.argv[2] || 'src/plugin/host.js';
const { createHostAdapter } = await import(pathToFileURL(resolve(path)));
function store(value) {
  const listeners = new Set();
  return { getSnapshot: () => value, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    set(next) { value = next; for (const fn of listeners) fn(); } };
}
const user = { event: { type: 'user/message', data: { content: '最近一条真实人类输入的模拟内容' } } };
const assistant = { event: { type: 'assistant/message', data: { content: 'stream' } } };
const history = [user, ...Array.from({ length: 5000 }, () => assistant)];
let reads = 0, updates = 0;
const snapshot = revision => ({ revision, change: { kind: revision ? 'append' : 'replace', entries: [assistant] },
  get entries() { reads++; return history; } });
const events = store(snapshot(0)), session = Object.assign(store({ openState: 'open' }), { eventSource: events });
const input = store({ draft: '' }), binding = { sessionId: 'a', session, ctx: {} };
const host = createHostAdapter({ sessions: { list: store({ ids: ['a'], byId: { a: { title: 'A' } } }), binding: () => binding },
  sidebarRight: { mounted: store('a') }, uiSession: { sessionStatus: store(new Map()) },
  workspaces: { list: store({ archivedSessionIds: [], items: [] }) }, conversation: { input: { for: () => ({ state: input }) } },
  theme: { getTheme: () => ({ active: { colorScheme: 'light' } }) }, uiWorkspace: { openSession() {} }, on: () => () => {} });
host.subscribe(() => updates++);
const start = performance.now();
for (let revision = 1; revision <= 1000; revision++) events.set(snapshot(revision));
for (let i = 0; i < 1000; i++) input.set({ draft: '正在输入草稿' + i });
console.log(JSON.stringify({ source: path, historyEntries: history.length, assistantUpdates: 1000, draftUpdates: 1000,
  ms: performance.now() - start, fullWindowReads: reads, publishedUpdates: updates, finalText: host.row('a').text }, null, 2));
host.destroy();
