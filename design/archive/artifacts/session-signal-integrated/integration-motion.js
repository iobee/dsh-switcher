'use strict';

// Three indeterminate activity treatments. None encodes percentage or task phase.
window.SessionSignal = (() => {
  const ns = 'http://www.w3.org/2000/svg';
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const instances = new Set();
  let frame = 0, visible = true, variant = 'drift';
  const clamp = n => Math.max(0, Math.min(1, n));
  const smooth = n => { const p = clamp(n); return p * p * (3 - 2 * p); };
  const phase = n => ((n % 1) + 1) % 1;
  const edge = x => smooth((x - 3) / 18) * (1 - smooth((x - 109) / 18));
  const set = (node, attrs) => Object.entries(attrs).forEach(([key,value]) => node.setAttribute(key, typeof value === 'number' ? value.toFixed(3) : value));
  const el = (tag, attrs) => { const node = document.createElementNS(ns, tag); set(node, attrs); return node; };
  function build(item) {
    item.svg.replaceChildren();
    item.nodes = [];
    if (variant === 'drift') {
      for (let i = 0; i < 5; i++) {
        const tail = [0,1,2,3].map(() => el('line', { y1: 9, y2: 9, 'stroke-width': 1 }));
        const glow = el('ellipse', { cy: 9, rx: 5, ry: 2 });
        const dot = el('circle', { cy: 9, r: 1.1 });
        item.svg.append(glow, ...tail, dot); item.nodes.push({dot, tail, glow});
      }
    } else if (variant === 'line') {
      for (let i = 0; i < 3; i++) {
        const line = el('line', { y1: 9, y2: 9, 'stroke-width': 1.3 });
        item.svg.append(line); item.nodes.push(line);
      }
    } else {
      for (let i = 0; i < 13; i++) {
        const dot = el('circle', { cx: 17 + i * 8, cy: 9, r: .8 });
        item.svg.append(dot); item.nodes.push(dot);
      }
    }
  }
  function draw(item, now, still) {
    if (variant === 'drift') {
      item.nodes.forEach(({dot, tail, glow}, i) => {
        const p = phase(now / 3600 - i / 5);
        const x = still ? 25 + i * 20 : -16 + 162 * (p - .018 * Math.sin(p * Math.PI * 2));
        const strength = edge(x) * (.6 + .38 * Math.exp(-Math.pow((x - 65) / 42, 2)));
        set(dot, { cx: x, opacity: strength, r: 1.2 });
        set(glow, { cx: x - 2, opacity: strength * .035 });
        tail.forEach((line, t) => set(line, { x1: x - 3 - t * 1.6, x2: x - 1.5 - t * 1.6, opacity: strength * (.16 - t * .035) }));
      });
    } else if (variant === 'line') {
      const lead = still ? 83 : -12 + 179 * phase(now / 3200);
      const lengths = [15, 8, 3];
      item.nodes.forEach((line, i) => {
        const x = lead - [0,22,37][i];
        set(line, { x1: x - lengths[i], x2: x, opacity: edge(x - lengths[i] / 2) * [.98,.62,.32][i] });
      });
    } else {
      const center = still ? 6 : -2 + 17 * phase(now / 3000);
      item.nodes.forEach((dot, i) => {
        const distance = Math.min(Math.abs(i - center), Math.abs(i - center + 17), Math.abs(i - center - 17));
        const strength = Math.exp(-Math.pow(distance / 2.15, 2));
        const ends = .75 + .25 * Math.sin(Math.PI * i / 12);
        set(dot, { opacity: (.16 + .8 * strength) * ends, r: .85 + .4 * strength });
      });
    }
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
    const svg = el('svg', { viewBox: '0 0 130 18', 'aria-hidden': 'true', preserveAspectRatio: 'none' });
    svg.classList.add('signal-mark'); host.append(svg);
    const item = {svg, nodes: [], kind}; instances.add(item); build(item);
    draw(item, performance.now(), media.matches || document.documentElement.dataset.signalStatic === 'true'); wake();
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
  return { mount, redraw: wake,
    setVariant(next) {
      variant = ['drift','line','relay'].includes(next) ? next : 'drift';
      document.documentElement.dataset.integration = variant;
      instances.forEach(item => { build(item); draw(item, performance.now(), media.matches || document.documentElement.dataset.signalStatic === 'true'); });
      wake();
    },
    setVisible(value) {
      visible = value;
      if (!value && frame) { cancelAnimationFrame(frame); frame = 0; }
      wake();
    }
  };
})();
