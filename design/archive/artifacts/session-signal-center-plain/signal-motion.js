'use strict';

// An indeterminate activity signal: no track, fill, percentage or inferred phase.
window.SessionSignal = (() => {
  const ns = 'http://www.w3.org/2000/svg';
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const instances = new Set();
  let frame = 0, visible = true;
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = n => { const p = clamp(n); return p * p * (3 - 2 * p); };
  const phase = n => ((n % 1) + 1) % 1;

  function draw(item, now, still) {
    item.dots.forEach((dot, i) => {
      const p = phase(now / 2800 - i / 5);
      // A little more pace through the centre; the wrap stays outside the view.
      const x = still ? 12 + i * 8 : -8 + 72 * (p - .025 * Math.sin(p * Math.PI * 2));
      const edge = ease((x - 1) / 10) * (1 - ease((x - 45) / 10));
      const presence = .52 + .42 * Math.exp(-Math.pow((x - 28) / 18, 2));
      dot.setAttribute('cx', x.toFixed(3));
      dot.setAttribute('r', (1.02 + .15 * edge).toFixed(3));
      dot.setAttribute('opacity', (edge * presence).toFixed(3));
    });
  }
  function tick(now) {
    frame = 0;
    if (!visible || document.hidden) return;
    const still = media.matches || document.documentElement.dataset.signalStatic === 'true';
    let active = false;
    for (const item of instances) {
      if (!item.svg.isConnected) { instances.delete(item); continue; }
      if (item.kind !== 'running') continue;
      draw(item, now, still); active = true;
    }
    if (active && !still) frame = requestAnimationFrame(tick);
  }
  function wake() {
    if (!frame && visible && !document.hidden && instances.size) frame = requestAnimationFrame(tick);
  }
  function mount(host, kind = 'idle') {
    const svg = document.createElementNS(ns, 'svg');
    svg.classList.add('signal-mark');
    svg.setAttribute('viewBox', '0 0 56 14');
    svg.setAttribute('aria-hidden', 'true');
    const dots = Array.from({length: 5}, () => {
      const dot = document.createElementNS(ns, 'circle');
      dot.setAttribute('cy', '7'); svg.append(dot); return dot;
    });
    host.append(svg);
    const item = {svg, dots, kind};
    instances.add(item);
    draw(item, performance.now(), media.matches || document.documentElement.dataset.signalStatic === 'true');
    wake();
    return {
      update(next) { item.kind = next; wake(); },
      destroy() { instances.delete(item); svg.remove(); }
    };
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; }
    else wake();
  });
  media.addEventListener('change', wake);
  return {mount, redraw: wake, setVisible(value) {
    visible = value;
    if (!value && frame) { cancelAnimationFrame(frame); frame = 0; }
    wake();
  }};
})();
