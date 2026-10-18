import test from 'node:test';
import assert from 'node:assert/strict';
import { createHostAdapter } from '../src/plugin/host.js';

function store(value) {
  const listeners = new Set();
  return { getSnapshot: () => value, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    set(next) { value = next; for (const fn of [...listeners]) fn(); }, get size() { return listeners.size; } };
}
test('host observes real sources, retains only preview candidates, and releases on close/unload', async () => {
  const storage = new Map(); globalThis.sessionStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) };
  const events = store({ entries: [{ event: { type: 'user/message', data: { content: [{ type: 'text', text: '实际输入' }] } } }] });
  const session = Object.assign(store({ openState: 'open' }), { eventSource: events });
  const input = store({ draft: { text: '未发送' } });
  const binding = { sessionId: 'a', ctx: {}, session };
  let retains = 0, releases = 0, reject, opened;
  const list = store({ ids: ['a', 'b'], byId: { a: { displayTitle: '真实标题' }, b: { displayTitle: '另一会话' } } });
  const mounted = store('a'), status = store(new Map([['a', { running: true }]]));
  const workspaces = store({ archivedSessionIds: [] });
  const ctx = {
    sessions: { list, binding: id => id === 'a' ? binding : undefined, retain(id) { retains++; return {
      binding: { ...binding, sessionId: id }, ready: new Promise((_, no) => { reject = no; }), release() { releases++; },
    }; } },
    sidebarRight: { mounted }, uiSession: { sessionStatus: status }, workspaces: { list: workspaces },
    conversation: { input: { for: () => ({ state: input }) } }, theme: { getTheme: () => ({ active: { colorScheme: 'dark' } }) },
    uiWorkspace: { openSession: id => { opened = id; } }, on: () => () => {},
  };
  const host = createHostAdapter(ctx);
  assert.equal(retains, 0); assert.equal(host.row('a').text, '实际输入'); assert.equal(host.row('a').kind, 'running');
  assert.equal(host.row('a').draft, true); assert.equal(host.theme(), 'dark');
  const stop = host.preview(['b']); assert.equal(retains, 1);
  stop(); stop(); assert.equal(releases, 1);
  reject(new Error('late cancellation')); await Promise.resolve();
  assert.equal(host.row('b').placeholder, '还没有输入');
  host.open('b'); assert.equal(opened, 'b');
  mounted.set('b'); assert.deepEqual(host.candidates(), ['b', 'a']);
  assert.equal([...storage.values()].some(value => value.includes('实际输入')), false);
  host.destroy(); assert.equal(events.size, 0); assert.equal(input.size, 0); assert.equal(list.size, 0); assert.equal(status.size, 0);
  delete globalThis.sessionStorage;
});
