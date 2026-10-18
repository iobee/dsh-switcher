import test from 'node:test';
import assert from 'node:assert/strict';
import { SwitchCycle } from '../src/plugin/core.js';
import { installSwitcherKeyboard } from '../src/plugin/keyboard.js';

function fixture() {
  const target = new EventTarget(), commits = [];
  let cycle, blocked = false, composing = false;
  const controller = {
    get active() { return !!cycle; },
    get composing() { return composing; },
    simulated: false,
    begin(direction) { if (cycle) cycle.step(direction); else cycle = new SwitchCycle(['a', 'b', 'c'], 'a', direction); },
    commit() { commits.push(cycle.selected); cycle = undefined; },
    cancel() { cycle = undefined; },
  };
  const stop = installSwitcherKeyboard(target, controller, () => blocked);
  return {
    controller, commits, stop,
    get selected() { return cycle?.selected; },
    set blocked(value) { blocked = value; },
    set composing(value) { composing = value; },
    key(type, key, flags = {}) {
      const event = new Event(type, { cancelable: true });
      Object.assign(event, { key, code: key, ctrlKey: true, ...flags });
      target.dispatchEvent(event); return event;
    },
  };
}

test('real hold/cycle/release sequence commits once, including a remapped Control code', () => {
  const f = fixture();
  f.key('keydown', 'Control', { code: 'ControlRight' });
  assert.equal(f.key('keydown', 'Tab').defaultPrevented, true);
  assert.equal(f.selected, 'b');
  f.key('keyup', 'Tab');
  f.key('keydown', 'Tab', { repeat: true });
  assert.equal(f.selected, 'b');
  f.key('keydown', 'Tab'); assert.equal(f.selected, 'c');
  f.key('keyup', 'Shift'); assert.equal(f.selected, 'c');
  f.key('keyup', 'Control', { code: 'ControlRight', ctrlKey: false });
  f.key('keyup', 'Tab', { ctrlKey: false });
  assert.deepEqual(f.commits, ['c']);
  assert.equal(f.controller.active, false);
  f.stop();
});

test('quick reverse selection and Escape cancellation do not depend on visual reveal timing', () => {
  const f = fixture();
  f.key('keydown', 'Tab', { shiftKey: true });
  f.key('keyup', 'Control', { ctrlKey: false });
  assert.deepEqual(f.commits, ['c']);
  f.key('keydown', 'Tab');
  f.key('keydown', 'Escape');
  f.key('keyup', 'Control', { ctrlKey: false });
  assert.deepEqual(f.commits, ['c']);
  f.stop();
});

test('releasing one Control while another is held does not commit', () => {
  const f = fixture();
  f.key('keydown', 'Tab');
  f.key('keyup', 'Control', { code: 'ControlLeft', ctrlKey: true });
  assert.equal(f.controller.active, true);
  f.key('keyup', 'Control', { code: 'ControlRight', ctrlKey: false });
  assert.deepEqual(f.commits, ['b']);
  f.stop();
});

test('other modals, composition, unrelated chords and disposal keep their input', () => {
  const f = fixture();
  f.blocked = true; assert.equal(f.key('keydown', 'Tab').defaultPrevented, false);
  f.blocked = false; f.composing = true;
  assert.equal(f.key('keydown', 'Tab').defaultPrevented, false);
  f.composing = false;
  for (const flags of [{ isComposing: true }, { altKey: true }, { metaKey: true }, { ctrlKey: false }]) {
    assert.equal(f.key('keydown', 'Tab', flags).defaultPrevented, false);
  }
  f.stop();
  assert.equal(f.key('keydown', 'Tab').defaultPrevented, false);
  assert.equal(f.controller.active, false);
});
