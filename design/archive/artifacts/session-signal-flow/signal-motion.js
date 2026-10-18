'use strict';

// A single family of paths: motion is indeterminate, never a fabricated percentage.
// Each status changes the existing paths instead of replacing unrelated icons.
window.SessionSignal = (() => {
  const ns = 'http://www.w3.org/2000/svg', count = 24;
  const instances = new Set(), media = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, last = 0, enabled = true, variant = 'pass';
  const path = (fn, alpha = 1, width = 1.9) => ({ points: Array.from({ length: count }, (_, i) => fn(i / (count - 1))), alpha, width });
  const arc = (a, b, r, alpha = 1, cx = 16, cy = 16, width = 1.9) => path(u => [cx + Math.cos(a + (b - a) * u) * r, cy + Math.sin(a + (b - a) * u) * r], alpha, width);
  const line = (x1, y1, x2, y2, alpha = 1, width = 1.9) => path(u => [x1 + (x2 - x1) * u, y1 + (y2 - y1) * u], alpha, width);
  const dot = (x, y, alpha = 1, width = 3) => line(x, y, x + .001, y, alpha, width);
  const hidden = () => dot(16, 16, 0, 1.9);
  const rad = n => n * Math.PI / 180;
  const bubble = alpha => [arc(rad(90), rad(270), 10, alpha), path(u => {
    if (u < .72) { const a = rad(-90 + 144 * u / .72); return [16 + Math.cos(a) * 10, 16 + Math.sin(a) * 10]; }
    if (u < .87) { const v = (u - .72) / .15; return [21.88 + 2.12 * v, 24.09 + 3.11 * v]; }
    const v = (u - .87) / .13; return [24 - 8 * v, 27.2 - 1.2 * v];
  }, alpha)];
  const clamp = n => Math.max(0, Math.min(1, n));
  const smooth = n => { const x = clamp(n); return x * x * (3 - 2 * x); };
  const loop = n => ((n % 1) + 1) % 1;
  function flowPose(style, seconds, still) {
    const t = still ? .75 : seconds;
    if (style === 'relay') {
      // The positions remain readable while the emphasis travels left to right.
      const head = loop(t / 2.2) * 4.8 - .9;
      return [0, 1, 2].map(i => {
        const wave = Math.exp(-Math.pow((head - i) / .56, 2));
        return dot(8 + i * 8 + .85 * wave, 16, .28 + .72 * wave, 3 + .55 * wave);
      }).concat(hidden());
    }
    if (style === 'merge') {
      // Three beads gather into a short capsule, carry on, then disappear.
      const p = loop(t / 2.65), enter = smooth(p / .12), exit = 1 - smooth((p - .78) / .13);
      const together = smooth((p - .13) / .32), leave = smooth((p - .56) / .30);
      const centre = 10 + 6 * together + 10 * leave;
      const spacing = 7 * (1 - together);
      return [0, 1, 2].map(i => dot(centre + (i - 1) * spacing, 16,
        enter * exit * [ .46, 1, .72 ][i], 3 + 1.15 * together)).concat(hidden());
    }
    // A travelling group has an invisible reset. No backward sweep at the seam.
    return [0, 1, 2].map(i => {
      const p = loop((t - i * (style === 'ribbon' ? .16 : .31)) / (style === 'ribbon' ? 2.25 : 2.05));
      const travel = clamp(p / .74);
      const alpha = smooth(travel / .13) * (1 - smooth((travel - .82) / .18));
      const x = 3 + 26 * travel;
      if (style === 'ribbon') {
        const stretch = 1 + 4.5 * Math.pow(Math.sin(travel * Math.PI), 2);
        return line(x - stretch, 16, x, 16, alpha * [1, .65, .34][i], 2.65);
      }
      return dot(x, 16, alpha * [1, .76, .48][i], 3.15);
    }).concat(hidden());
  }
  function pose(kind, seconds, age, still, style = variant) {
    const t = still ? .65 : seconds, breath = still ? 0 : (1 - Math.cos(t * Math.PI * 2 / 3.4)) * .5;
    let paths;
    if (kind === 'running') {
      paths = flowPose(style, seconds, still);
    } else if (kind === 'approval') {
      // The moving particles settle into a pause. Keep the same small footprint.
      const half = 4.1 + breath * .65;
      paths = [line(12.5, 16 - half, 12.5, 16 + half, .96, 2.25),
        line(19.5, 16 - half, 19.5, 16 + half, .96, 2.25),
        dot(6, 16, .24 + .1 * breath, 2), dot(26, 16, .24 + .1 * breath, 2)];
    } else if (kind === 'plan') {
      const shift = breath * .55, sweep = 12 * breath;
      paths = [arc(rad(111 + sweep), rad(249 - sweep), 10.3, .68, 16 - shift), arc(rad(-69 + sweep), rad(69 - sweep), 10.3, .68, 16 + shift)];
      paths.push(line(12.7, 13.8, 19.3, 13.8, .98, 1.65), line(12.7, 18.2, 16.5 + breath * 2, 18.2, .75, 1.65));
    } else if (kind === 'question') {
      // The same contour opens into a speech bubble, with a quiet paired cadence.
      paths = [...bubble(.72), dot(12.8, 16 - .3 * breath, .98, 2.7), dot(19.2, 16 + .3 * breath, .98, 2.7)];
    } else if (kind === 'unread') {
      const settle = still ? 1 : Math.min(age / .6, 1);
      const opening = rad(7 + 25 * (1 - settle));
      paths = [arc(opening, Math.PI - .04, 10.5, .78), arc(Math.PI + .04, Math.PI * 2 - opening, 10.5, .78), dot(16, 16, 1, 4.2), hidden()];
    } else if (kind === 'draft') {
      paths = [line(7, 12.5, 18.5, 12.5, .66, 1.55), line(7, 18, 14, 18, .66, 1.55), line(18, 22, 24.5, 15.5, .90, 2.1), hidden()];
    } else {
      // At title scale, a quiet conversation outline supplies the identity.
      paths = [...bubble(.56), hidden(), hidden()];
    }
    return paths;
  }
  function tick(now) {
    frame = 0;
    if (document.hidden || !instances.size) return;
    const dt = Math.min(40, last ? now - last : 16); last = now;
    const still = media.matches || document.documentElement.dataset.signalStatic === 'true';
    let needsFrame = false;
    for (const item of instances) {
      if (!item.svg.isConnected) { instances.delete(item); continue; }
      const age = (now - item.changed) / 1000;
      const kind = item.kind === 'idle' && item.draft ? 'draft' : item.kind;
      if (!enabled && !item.preview) continue;
      const goal = pose(kind, now / 1000, age, still, item.variant || variant);
      const blend = still ? 1 : 1 - Math.exp(-dt / 68);
      let unsettled = false;
      goal.forEach((target, index) => {
        const current = item.pose[index];
        // The dot's wrap happens offstage, so it never visibly flies backward.
        if (kind === 'running' && target.alpha < .008 && current.alpha < .045) {
          current.points = target.points.map(xy => [...xy]);
        }
        current.points.forEach((xy, j) => {
          const dest = target.points[j];
          for (let axis = 0; axis < 2; axis++) { xy[axis] += (dest[axis] - xy[axis]) * blend; if (Math.abs(dest[axis] - xy[axis]) > .015) unsettled = true; }
        });
        current.alpha += (target.alpha - current.alpha) * blend;
        current.width += (target.width - current.width) * blend;
        const shape = item.paths[index];
        shape.setAttribute('d', current.points.map((xy, j) => `${j ? 'L' : 'M'}${xy[0].toFixed(2)},${xy[1].toFixed(2)}`).join(' '));
        shape.setAttribute('opacity', current.alpha.toFixed(3));
        shape.setAttribute('stroke-width', current.width.toFixed(2));
      });
      // A draft is orthogonal to the runtime state, shown by one quiet diagonal stroke.
      item.draftPath.setAttribute('opacity', item.draft && item.kind !== 'idle' ? '.85' : '0');
      const active = ['running', 'approval', 'plan', 'question'].includes(item.kind);
      needsFrame ||= !still && (active || unsettled || age < .9);
    }
    if (needsFrame) frame = requestAnimationFrame(tick);
  }
  function wake() { if (!frame && !document.hidden && instances.size) { last = 0; frame = requestAnimationFrame(tick); } }
  function mount(host, kind = 'idle', draft = false, options = {}) {
    const svg = document.createElementNS(ns, 'svg'); svg.classList.add('signal-mark');
    svg.setAttribute('viewBox', '0 0 32 32'); svg.setAttribute('aria-hidden', 'true');
    const paths = Array.from({ length: 4 }, () => { const p = document.createElementNS(ns, 'path'); svg.append(p); return p; });
    const draftPath = document.createElementNS(ns, 'path');
    draftPath.classList.add('signal-draft'); draftPath.setAttribute('d', 'M24.1 26.4 L27.4 23.1'); draftPath.setAttribute('stroke-width', '1.8'); svg.append(draftPath);
    host.append(svg);
    const item = { svg, paths, draftPath, kind, draft, variant: options.variant, preview: !!options.preview,
      changed: performance.now(), pose: pose(kind === 'idle' && draft ? 'draft' : kind, .65, 1, true, options.variant || variant) };
    instances.add(item); wake();
    return { update(next, hasDraft) { if (next !== item.kind) { item.changed = performance.now(); item.kind = next; } item.draft = hasDraft; wake(); }, destroy() { instances.delete(item); svg.remove(); } };
  }
  document.addEventListener('visibilitychange', wake); media.addEventListener('change', wake);
  return { mount, setVisible(value) { enabled = value; if (!value && frame) { cancelAnimationFrame(frame); frame = 0; } wake(); },
    setVariant(value) { if (['pass','relay','ribbon','merge'].includes(value)) { variant = value; wake(); } }, redraw: wake };
})();
