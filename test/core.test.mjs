import test from 'node:test';
import assert from 'node:assert/strict';
import { readHistory, remember, candidates, SwitchCycle, latestUserInput, hasDraft, sessionPresentation, sessionWorkspaceName } from '../src/plugin/core.js';

test('MRU survives malformed storage and only contains unique ids', () => {
  assert.deepEqual(readHistory('{'), []);
  assert.deepEqual(readHistory('["b",null,"a","b",8]'), ['b', 'a']);
  assert.deepEqual(remember(['b', 'a', 'c'], 'a'), ['a', 'b', 'c']);
});
test('candidates follow visits, exclude archives/deletions and do not surface unvisited subagents', () => {
  const snapshot = { ids: ['a', 'b', 'c', 'd', 'child'], byId: {
    a: { updatedAt: 1 }, b: { updatedAt: 9 }, c: { updatedAt: 4 }, d: { updatedAt: 5 }, child: { parentId: 'a', updatedAt: 20 },
  } };
  assert.deepEqual(candidates(snapshot, ['b'], ['a', 'gone', 'c'], 'a'), ['a', 'c', 'd']);
  assert.deepEqual(candidates(snapshot, [], ['a', 'child'], 'a'), ['a', 'child', 'b', 'd', 'c']);
});
test('cycling freezes MRU, wraps both ways, and has no commit side effects', () => {
  const history = ['a', 'b', 'c'];
  const cycle = new SwitchCycle(history, 'a', 1);
  assert.equal(cycle.selected, 'b'); history.unshift('new');
  cycle.step(1); assert.equal(cycle.selected, 'c');
  cycle.step(1); assert.equal(cycle.selected, 'a');
  cycle.step(-1); assert.equal(cycle.selected, 'c');
  assert.equal(new SwitchCycle(['a', 'b', 'c'], 'a', -1).selected, 'c');
  cycle.select('gone'); assert.equal(cycle.selected, 'c');
});
test('unused blank sessions cannot displace real recent conversations', () => {
  const snapshot = { ids: ['current', 'empty', 'real'], byId: {
    current: { blank: true }, empty: { blank: true, updatedAt: 99 }, real: { blank: false, updatedAt: 1 },
  } };
  assert.deepEqual(candidates(snapshot, [], ['empty'], 'current'), ['current', 'real']);
  assert.deepEqual(candidates(snapshot, [], ['empty'], 'current', ['empty']), ['current', 'empty', 'real']);
});
test('an explicitly visited subagent remains reachable even outside the top-level ids', () => {
  const snapshot = { ids: ['a'], byId: { a: {}, child: { parentId: 'a' } } };
  assert.deepEqual(candidates(snapshot, [], ['a'], 'child'), ['child', 'a']);
  assert.deepEqual(candidates(snapshot, [], ['child'], 'a'), ['a', 'child']);
});
test('excerpt is the latest human input, never assistant text or tool output', () => {
  const user = content => ({ event: { type: 'user/message', data: { role: 'user', source: { kind: 'user' }, content } } });
  const entries = [user([{ type: 'text', text: '旧输入' }]), user([{ type: 'text', text: ' 最后\n输入 ' }]),
    { event: { type: 'assistant/message', data: { content: '不显示' } } },
    { event: { type: 'user/message', data: { source: { kind: 'subagent' }, content: '内部消息' } } }];
  assert.equal(latestUserInput(entries), '最后 输入');
  assert.equal(latestUserInput([user([{ type: 'image', source: 'private-path' }])]), '已发送附件');
  assert.equal(latestUserInput([]), '');
  assert.equal(latestUserInput([user('<script>untrusted</script>')]), '<script>untrusted</script>');
});
test('host attention wins over running; unread and draft remain distinct', () => {
  assert.equal(sessionPresentation({ running: true, pendingInteraction: { kind: 'approval' } }, {}, true).label, '等待用户确认，有草稿');
  assert.equal(sessionPresentation({ running: true, completionUnread: true }, {}).kind, 'running');
  assert.equal(sessionPresentation({ running: false }, { running: true }).kind, 'idle');
  assert.equal(sessionPresentation({ completionUnread: true }, {}, true).kind, 'unread');
  assert.equal(sessionPresentation({}, {}, true).kind, 'draft');
  assert.equal(hasDraft({ text: '  ' }), false); assert.equal(hasDraft({ text: '未发送' }), true);
});

test('compact status keeps approval, response and coexisting draft distinguishable', () => {
  assert.equal(sessionPresentation({ pendingInteraction: { kind: 'approval' } }, {}, true).shortLabel, '待确认 · 有草稿');
  assert.equal(sessionPresentation({ pendingInteraction: { kind: 'question' } }, {}).shortLabel, '待回应');
  assert.equal(sessionPresentation({ running: true }, {}, true).shortLabel, '运行中 · 有草稿');
  assert.equal(sessionPresentation({ completionUnread: true }, {}, true).shortLabel, '新结果 · 有草稿');
  assert.equal(sessionPresentation({}, {}).shortLabel, '已就绪');
});

test('workspace title follows authoritative membership and falls back to directory or ungrouped', () => {
  const snapshot = { items: [{ workspaceId: 'w', title: '自定义项目名', path: '/code/old-name', sessionIds: ['a'] }] };
  assert.equal(sessionWorkspaceName(snapshot, 'a', { cwd: '/code/old-name' }), '自定义项目名');
  assert.equal(sessionWorkspaceName(snapshot, 'b', { cwd: '/code/other-project/' }), 'other-project');
  assert.equal(sessionWorkspaceName(snapshot, 'c', { cwd: 'C:\\code\\Windows Project\\' }), 'Windows Project');
  assert.equal(sessionWorkspaceName(snapshot, 'd', {}), '未分组');
  assert.equal(sessionWorkspaceName({ items: [{ title: ' ', path: '/code/fallback/', sessionIds: ['a'] }] }, 'a'), 'fallback');
  assert.equal(sessionWorkspaceName({}, 'a'), '未分组');
});
