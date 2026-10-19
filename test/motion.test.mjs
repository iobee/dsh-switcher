import test from 'node:test';
import assert from 'node:assert/strict';
import { createFivebeatMotion } from '../src/plugin/motion.js';

function environment(t) {
  class Element {
    children = []; attributes = new Map(); dataset = {}; writes = 0;
    append(child) { this.children.push(child); }
    setAttribute(key, value) { this.attributes.set(key, value); this.writes++; }
  }
  const document = Object.assign(new EventTarget(), { hidden: false, createElementNS: () => new Element() });
  const media = Object.assign(new EventTarget(), { matches: false });
  const frames = new Map(); let id = 0;
  const values = { document, matchMedia: () => media, requestAnimationFrame: fn => { frames.set(++id, fn); return id; }, cancelAnimationFrame: key => frames.delete(key) };
  const previous = new Map(Object.keys(values).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(values)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  t.after(() => { for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } });
  return { document, media, frames, element: () => new Element(),
    tick(time) { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(time)); } };
}

test('static icons render immediately and repeated unchanged updates schedule no frames', t => {
  const f = environment(t), motion = createFivebeatMotion(), host = f.element();
  const icon = motion.mount(host, 'idle', false), svg = host.children[0];
  assert.equal(svg.dataset.iconFamily, '11'); assert.equal(svg.children.length, 9);
  assert.equal(svg.children[0].attributes.get('d'), 'M7.00,13.00 L7.00,19.00');
  const writes = svg.children.reduce((sum, path) => sum + path.writes, 0);
  for (let i = 0; i < 100; i++) icon.update('idle', false);
  assert.equal(f.frames.size, 0);
  assert.equal(svg.children.reduce((sum, path) => sum + path.writes, 0), writes);
  motion.destroy();
});

test('running icons follow display frames while settled neighbours remain untouched', t => {
  const f = environment(t), motion = createFivebeatMotion(), idle = f.element(), running = f.element();
  motion.mount(idle, 'draft', true); motion.mount(running, 'running', false);
  const idleWrites = idle.children[0].children.reduce((sum, path) => sum + path.writes, 0);
  const start = performance.now(), shapes = new Set();
  for (let i = 1; i <= 12; i++) { f.tick(start + i * 1000 / 120); shapes.add(running.children[0].children[0].attributes.get('d')); }
  assert.ok(shapes.size > 6, 'updates are no longer throttled to 30fps');
  assert.equal(idle.children[0].children.reduce((sum, path) => sum + path.writes, 0), idleWrites);
  f.document.hidden = true; f.document.dispatchEvent(new Event('visibilitychange')); assert.equal(f.frames.size, 0);
  f.document.hidden = false; f.document.dispatchEvent(new Event('visibilitychange')); assert.equal(f.frames.size, 1);
  motion.destroy(); assert.equal(f.frames.size, 0);
});

test('reduced motion settles shapes and preserves the coexisting draft badge', t => {
  const f = environment(t), motion = createFivebeatMotion(), host = f.element();
  const icon = motion.mount(host, 'running', true), svg = host.children[0];
  f.media.matches = true; f.media.dispatchEvent(new Event('change')); f.tick(performance.now() + 16);
  assert.equal(f.frames.size, 0); assert.equal(svg.children[8].attributes.get('opacity'), '.85');
  icon.update('draft', true); f.tick(performance.now() + 32);
  assert.equal(svg.children[0].attributes.get('d'), 'M6.00,12.00 L21.00,12.00');
  assert.equal(svg.children[8].attributes.get('opacity'), '0'); assert.equal(f.frames.size, 0);
  motion.destroy();
});
