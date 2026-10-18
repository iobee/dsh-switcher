(() => {
  'use strict';

  const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const settle = (v) => { const t = clamp(v); return t * t * (3 - 2 * t); };
  const fract = (v) => v - Math.floor(v);

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  function fold(ctx, p) {
    ctx.strokeStyle = p.muted;
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(13, 20);
    ctx.lineTo(13, 8);
    ctx.lineTo(20, 8);
    ctx.lineTo(24, 12);
    ctx.lineTo(24, 20);
    ctx.lineTo(13, 20);
    ctx.moveTo(20, 8);
    ctx.lineTo(20, 12);
    ctx.lineTo(24, 12);
    ctx.stroke();
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.moveTo(16, 16);
    ctx.lineTo(21, 16);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function shutterLayout(state, f) {
    const p = f.palette;
    const xs = [8, 13.5, 19, 24.5];
    const bars = xs.map(x => ({ x, y: 8, h: 12, alpha: 0.65, color: p.muted }));
    if (state === 'running') {
      const clock = f.reduced ? 0.24 : f.t * 1.55 + ((f.seed || 0) % 7) * 0.11;
      const slot = Math.floor(clock) % 4;
      const local = fract(clock);
      // A driven stroke, a brief hold, then a return. Only one shutter moves.
      const stroke = local < 0.24 ? settle(local / 0.24)
        : local < 0.60 ? 1 : 1 - settle((local - 0.60) / 0.40);
      bars[slot].y -= f.reduced ? 3 : stroke * 3;
      bars[slot].color = p.accent;
      bars[slot].alpha = 1;
      bars[(slot + 3) % 4].alpha = 0.85;
    } else if (state === 'approval') {
      bars.forEach((b, i) => {
        b.x = [10.2, 14.4, 18.6, 22.8][i];
        b.y = 9;
        b.h = 10;
        b.alpha = i === 1 || i === 2 ? 0.95 : 0.65;
        b.color = p.warning;
      });
    } else if (state === 'question') {
      bars.forEach((b, i) => {
        b.x = [6.2, 10.4, 23.2, 27.4][i];
        b.y = 9;
        b.h = 10;
        b.alpha = 0.85;
        b.color = p.accent;
      });
    } else if (state === 'done') {
      const k = f.reduced ? 1 : settle(f.age / 0.55);
      bars.forEach((b, i) => {
        b.y = lerp(8 - (3 - i) * 1.5, 10, k);
        b.h = lerp(12, 8, k);
        b.alpha = 0.7;
        b.color = p.success;
      });
    } else if (state === 'error') {
      bars.forEach((b, i) => {
        b.y = i === 2 ? 5.5 : 10;
        b.h = 10;
        b.alpha = i === 2 ? 1 : 0.38;
        b.color = i === 2 ? p.danger : p.muted;
      });
    } else if (state === 'stopped') {
      bars.forEach((b, i) => {
        b.x = [8, 12.2, 21.8, 26][i];
        b.y = 10;
        b.h = 8;
        b.alpha = 0.5;
      });
    }
    return bars;
  }

  window.StatusStudy.register({
    id: 'shutters',
    name: '机械闸片',
    tagline: '四片微型闸门，借传递、合拢与停顿显露状态。',
    draw(ctx, f) {
      if (f.state === 'idle') return;
      ctx.save();
      ctx.scale(f.w / 36, f.h / 28);
      if (f.state === 'draft') {
        fold(ctx, f.palette);
        ctx.restore();
        return;
      }
      const p = f.palette;
      const bars = shutterLayout(f.state, f);
      const previous = shutterLayout(f.fromState || f.state, { ...f, age: 1 });
      const tr = f.reduced ? 1 : settle(f.transition == null ? 1 : f.transition);

      ctx.lineWidth = 0.75;
      ctx.strokeStyle = p.edge;
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.moveTo(6, 22.5);
      ctx.lineTo(30, 22.5);
      ctx.stroke();
      bars.forEach((b, i) => {
        const old = previous[i];
        ctx.globalAlpha = lerp(old.alpha, b.alpha, tr);
        ctx.fillStyle = b.color;
        roundRect(ctx, lerp(old.x, b.x, tr), lerp(old.y, b.y, tr), 3.4, lerp(old.h, b.h, tr), 0.65);
        ctx.fill();
      });

      if (f.state === 'approval') {
        // The two short stops make the closed gate legible even when still.
        ctx.globalAlpha = 0.65 * tr;
        ctx.strokeStyle = p.warning;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(17.8, 5.5);
        ctx.lineTo(17.8, 7.3);
        ctx.moveTo(17.8, 20.8);
        ctx.lineTo(17.8, 22.5);
        ctx.stroke();
      } else if (f.state === 'error') {
        ctx.globalAlpha = 0.7 * tr;
        ctx.fillStyle = p.danger;
        roundRect(ctx, 19.3, 19, 2.8, 1.2, 0.5);
        ctx.fill();
      }
      ctx.restore();
    }
  });

  const grid = () => Array.from({ length: 9 }, (_, i) => ({
    x: 10 + (i % 3) * 8, y: 6 + Math.floor(i / 3) * 8,
    r: 1.35, alpha: 0.55, hollow: false, role: 'muted'
  }));

  function latticeLayout(state, f) {
    const dots = grid();
    if (state === 'running') {
      const clock = f.reduced ? 0.36 : f.t * 1.15 + ((f.seed || 0) % 5) * 0.17;
      const beat = Math.floor(clock);
      const step = ((beat % 6) + 6) % 6;
      const progress = f.reduced ? 0.42 : settle(clamp(fract(clock) / 0.72));
      const vertical = step >= 3;
      const line = step % 3;
      const first = vertical ? line : line * 3;
      const second = vertical ? line + 3 : line * 3 + 1;
      const a = dots[first];
      const b = dots[second];
      const ax = a.x; const ay = a.y; const bx = b.x; const by = b.y;
      // Two neighbors trade places by separate short channels; the grid holds.
      const detour = Math.sin(progress * Math.PI) * 2;
      a.x = lerp(ax, bx, progress) + (vertical ? detour : 0);
      a.y = lerp(ay, by, progress) + (vertical ? 0 : -detour);
      b.x = lerp(bx, ax, progress) + (vertical ? -detour : 0);
      b.y = lerp(by, ay, progress) + (vertical ? 0 : detour);
      a.role = 'accent'; a.alpha = 1; a.r = 1.65;
      b.role = 'accent'; b.alpha = 0.75;
    } else if (state === 'approval') {
      dots.forEach((d, i) => {
        d.x = 12 + (i % 3) * 6;
        d.y = 8 + Math.floor(i / 3) * 6;
        d.role = 'warning';
        d.alpha = i === 4 ? 1 : 0.7;
        d.r = i === 4 ? 1.8 : 1.4;
      });
    } else if (state === 'question') {
      dots.forEach((d, i) => {
        d.hollow = true;
        d.role = 'accent';
        d.alpha = i === 4 ? 0 : 0.8;
        d.r = 1.6;
      });
    } else if (state === 'done') {
      const k = f.reduced ? 1 : settle(f.age / 0.65);
      dots.forEach((d, i) => {
        d.x = lerp(d.x, 6 + i * 3, k);
        d.y = lerp(d.y, 14, k);
        d.role = 'success';
        d.r = lerp(1.35, i === 4 ? 1.5 : 1.05, k);
        d.alpha = i === 4 ? 0.95 : 0.6;
      });
    } else if (state === 'error') {
      dots.forEach((d, i) => {
        const col = i % 3;
        d.x = [8, 14.5, 27][col];
        d.y += col === 2 ? -2 : col === 1 ? 1.5 : 0;
        d.role = col === 2 ? 'danger' : 'muted';
        d.alpha = col === 2 ? 0.95 : 0.42;
      });
    } else if (state === 'stopped') {
      dots.forEach((d, i) => {
        d.x = [11, 18, 25][i % 3];
        d.y = 9 + Math.floor(i / 3) * 5;
        d.hollow = i % 3 === 1;
        d.alpha = i % 3 === 1 ? 0.2 : 0.55;
        d.r = 1.15;
      });
    }
    return dots;
  }

  window.StatusStudy.register({
    id: 'lattice',
    name: '粒阵相位',
    tagline: '九颗微粒换位、凝聚、留空，把状态藏进秩序。',
    draw(ctx, f) {
      if (f.state === 'idle') return;
      ctx.save();
      ctx.scale(f.w / 36, f.h / 28);
      if (f.state === 'draft') {
        fold(ctx, f.palette);
        ctx.restore();
        return;
      }
      const dots = latticeLayout(f.state, f);
      const previous = latticeLayout(f.fromState || f.state, { ...f, age: 1 });
      const tr = f.reduced ? 1 : settle(f.transition == null ? 1 : f.transition);
      dots.forEach((d, i) => {
        const old = previous[i];
        ctx.globalAlpha = lerp(old.alpha, d.alpha, tr);
        ctx.fillStyle = f.palette[d.role];
        ctx.strokeStyle = f.palette[d.role];
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.arc(lerp(old.x, d.x, tr), lerp(old.y, d.y, tr), lerp(old.r, d.r, tr), 0, Math.PI * 2);
        if (d.hollow) ctx.stroke();
        else ctx.fill();
      });
      ctx.restore();
    }
  });
})();
