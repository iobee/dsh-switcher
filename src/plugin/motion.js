// The selected 11 family, with the original geometry, timing and morph easing.
// Each overlay owns its animation loop and disposes it when closed.
export function createFivebeatMotion() {
  const ns = 'http://www.w3.org/2000/svg', items = new Set();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, previous = 0, alive = true;
  const start = performance.now();
  const line = (x1, y1, x2, y2, alpha = 1, width = 1.9) => ({
    points: Array.from({ length: 24 }, (_, i) => [x1 + (x2 - x1) * i / 23, y1 + (y2 - y1) * i / 23]), alpha, width,
  });
  const dot = (x, y, alpha, width) => line(x, y, x + .001, y, alpha, width);
  function pose(state, time) {
    const t = reduced.matches ? .65 : time;
    const breath = reduced.matches ? .5 : (1 - Math.cos(t * Math.PI * 2 / 3.4)) * .5;
    let shapes;
    if (state === 'running') shapes = [0, 1, 2, 3, 4].map(i => {
      const h = 2 + 8 * Math.pow(.5 + .5 * Math.sin(t * 2.4 - i * .9), 1.7);
      return line(7 + i * 4.5, 16 - h / 2, 7 + i * 4.5, 16 + h / 2, .45 + i * .12, 2.4);
    });
    else if (state === 'approval') {
      const half = 2.7 + .55 * breath;
      shapes = [line(6, 14, 6, 18, .45, 1.8), line(26, 14, 26, 18, .45, 1.8),
        line(13.7, 16 - half, 13.7, 16 + half, .88 + .12 * breath, 2.2),
        line(18.3, 16 - half, 18.3, 16 + half, .88 + .12 * breath, 2.2)];
    } else if (state === 'unread') shapes = [dot(7, 16, .25, 2.3), line(12, 16, 19, 16, .45, 1.7), dot(25, 16, 1, 3.7)];
    else if (state === 'draft') shapes = [line(6, 12, 21, 12, .55, 1.6), line(6, 18, 15, 18, .55, 1.6), line(20, 23, 26, 17, .95, 2.1)];
    else shapes = [0, 1, 2, 3, 4].map(i => line(7 + i * 4.5, 13, 7 + i * 4.5, 19, .6, 1.8));
    return Array.from({ length: 8 }, (_, i) => shapes[i] || dot(16, 16, 0, 3));
  }
  function tick(now) {
    frame = 0;
    if (!alive || document.hidden) return;
    if (previous && now - previous < 30) { frame = requestAnimationFrame(tick); return; }
    const dt = Math.min(48, previous ? now - previous : 32); previous = now;
    let moving = false;
    for (const item of items) {
      const target = pose(item.kind, (now - start) / 1000), blend = reduced.matches ? 1 : 1 - Math.exp(-dt / 68);
      let unsettled = false;
      target.forEach((shape, i) => {
        const current = item.current[i];
        current.points.forEach((point, j) => {
          for (let k = 0; k < 2; k++) {
            const delta = shape.points[j][k] - point[k];
            if (Math.abs(delta) > .018) unsettled = true;
            point[k] += delta * blend;
          }
        });
        if (Math.abs(shape.alpha - current.alpha) > .01 || Math.abs(shape.width - current.width) > .01) unsettled = true;
        current.alpha += (shape.alpha - current.alpha) * blend;
        current.width += (shape.width - current.width) * blend;
        item.paths[i].setAttribute('d', current.points.map((p, j) => `${j ? 'L' : 'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' '));
        item.paths[i].setAttribute('opacity', current.alpha.toFixed(3));
        item.paths[i].setAttribute('stroke-width', current.width.toFixed(2));
      });
      moving ||= !reduced.matches && (unsettled || ['running', 'approval'].includes(item.kind));
    }
    if (moving) frame = requestAnimationFrame(tick);
  }
  function wake() { if (alive && !frame && !document.hidden) { previous = 0; frame = requestAnimationFrame(tick); } }
  const visibility = () => { cancelAnimationFrame(frame); frame = 0; wake(); };
  document.addEventListener('visibilitychange', visibility);
  reduced.addEventListener('change', wake);
  return {
    mount(host, kind, draft) {
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 32 32'); svg.setAttribute('aria-hidden', 'true'); svg.dataset.iconFamily = '11';
      const paths = Array.from({ length: 8 }, () => { const p = document.createElementNS(ns, 'path'); svg.append(p); return p; });
      const badge = document.createElementNS(ns, 'path');
      badge.setAttribute('d', 'M24.1 26.4 L27.4 23.1'); badge.setAttribute('stroke-width', '1.8'); svg.append(badge); host.append(svg);
      const item = { paths, kind, current: pose(kind, .65) }; items.add(item);
      const update = (next, hasDraft) => {
        item.kind = next; svg.dataset.state = next;
        badge.setAttribute('opacity', hasDraft && !['idle', 'draft'].includes(next) ? '.85' : '0'); wake();
      };
      update(kind, draft);
      return { update };
    },
    destroy() {
      alive = false; cancelAnimationFrame(frame); items.clear();
      document.removeEventListener('visibilitychange', visibility); reduced.removeEventListener('change', wake);
    },
  };
}
