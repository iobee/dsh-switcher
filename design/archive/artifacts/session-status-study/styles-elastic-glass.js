(function () {
  'use strict';

  const TAU = Math.PI * 2;
  const COUNT = 64;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const mix = (a, b, p) => a + (b - a) * p;
  const ease = (p) => p * p * (3 - 2 * p);

  function tone(state, p) {
    if (state === 'running') return p.accent;
    if (state === 'approval' || state === 'question') return p.warning;
    if (state === 'done') return p.success;
    if (state === 'error') return p.danger;
    return p.muted;
  }

  function frame(f) {
    return {
      ...f,
      age: Math.max(0, Number(f.age) || 0),
      t: f.reduced ? 0 : (Number(f.t) || 0),
      seed: Number(f.seed) || 0,
      transition: ease(clamp(f.transition == null ? 1 : f.transition, 0, 1))
    };
  }

  // Catmull-Rom sampling keeps one continuous strip while its folds change.
  function spline(anchors, u) {
    const n = anchors.length - 1;
    const q = u * n;
    const i = Math.min(n - 1, Math.floor(q));
    const v = q - i;
    const a = anchors[Math.max(0, i - 1)];
    const b = anchors[i];
    const c = anchors[Math.min(n, i + 1)];
    const d = anchors[Math.min(n, i + 2)];
    const v2 = v * v;
    const v3 = v2 * v;
    return [0, 1].map((axis) => 0.5 * (
      2 * b[axis] + (-a[axis] + c[axis]) * v +
      (2 * a[axis] - 5 * b[axis] + 4 * c[axis] - d[axis]) * v2 +
      (-a[axis] + 3 * b[axis] - 3 * c[axis] + d[axis]) * v3
    ));
  }

  function ribbonShape(state, f) {
    const phase = f.t * 3.4 + f.seed * 0.7;
    const breath = f.reduced ? 0 : Math.sin(f.t * 1.65 + f.seed) * 0.32;
    const settle = f.reduced || f.age > 0.9 ? 0 : Math.sin(f.age * 10) * Math.exp(-f.age * 5) * 1.2;
    let anchors;
    let width = 3.1;
    let gap = 0;
    let alpha = 1;

    if (state === 'running') {
      return {
        points: Array.from({ length: COUNT + 1 }, (_, i) => {
          const u = i / COUNT;
          const envelope = 0.65 + Math.sin(u * Math.PI) * 0.35;
          return [5 + 26 * u, 14 + Math.sin(u * TAU * 1.3 - phase) * 4.0 * envelope];
        }),
        width: 3.55, gap: 0, alpha: 1, twist: phase
      };
    }
    if (state === 'approval') {
      // A folded lock: the strip crosses its own compact rectangular cavity.
      anchors = [[6, 17], [12, 17], [12, 9], [24, 9], [24, 19], [15, 19], [15, 12], [30, 12]];
      width = 3.25 + breath * 0.24;
    } else if (state === 'question') {
      // Open ends and a clear vacant centre give waiting-for-input its shape.
      anchors = [[7 - breath, 9], [7, 15], [11, 20], [18, 21], [25, 20], [29, 15], [29 + breath, 9]];
      width = 3.05;
    } else if (state === 'done') {
      anchors = [[7, 16], [12, 16 + settle], [18, 16 - settle], [24, 16], [29, 15.4]];
      width = 2.8;
    } else if (state === 'error') {
      const jolt = f.reduced || f.age > 0.4 ? 0 : Math.sin(f.age * 53) * Math.exp(-f.age * 9) * 0.9;
      anchors = [[6, 15], [12, 15], [17, 17 + jolt], [21, 11 - jolt], [26, 13], [30, 13]];
      width = 3.15;
      gap = 0.15;
    } else if (state === 'stopped') {
      anchors = [[9, 18], [13, 18], [15, 14], [22, 14], [25, 18], [28, 18]];
      width = 2.35;
      alpha = 0.72;
    } else if (state === 'draft') {
      anchors = [[6, 17], [15, 17], [22, 12.2], [22, 17], [30, 17]];
      width = 1.15;
      alpha = 0.84;
    } else {
      anchors = [[7, 17], [15, 17], [23, 17], [29, 17]];
      width = 0;
      alpha = 0;
    }

    return {
      points: Array.from({ length: COUNT + 1 }, (_, i) => spline(anchors, i / COUNT)),
      width, gap, alpha, twist: 0
    };
  }

  function interpolateRibbon(a, b, p) {
    return {
      points: b.points.map((point, i) => [mix(a.points[i][0], point[0], p), mix(a.points[i][1], point[1], p)]),
      width: mix(a.width, b.width, p),
      gap: mix(a.gap, b.gap, p),
      alpha: mix(a.alpha, b.alpha, p),
      twist: mix(a.twist, b.twist, p)
    };
  }

  function ribbonSection(ctx, points, start, end, model, color, p, intensity) {
    const front = [];
    const back = [];
    const glint = [];
    for (let i = start; i <= end; i++) {
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(COUNT, i + 1)];
      const dx = next[0] - prev[0];
      const dy = next[1] - prev[1];
      const length = Math.max(0.001, Math.hypot(dx, dy));
      const nx = -dy / length;
      const ny = dx / length;
      const twist = 0.79 + Math.cos(i / COUNT * TAU * 1.6 - model.twist) * 0.21;
      const half = model.width * 0.5 * twist;
      front.push([points[i][0] + nx * half, points[i][1] + ny * half]);
      back.push([points[i][0] - nx * half, points[i][1] - ny * half]);
      glint.push([points[i][0] - nx * half * 0.56, points[i][1] - ny * half * 0.56]);
    }
    if (front.length < 2) return;

    ctx.save();
    ctx.globalAlpha = intensity * model.alpha;
    ctx.beginPath();
    front.forEach((v, i) => i ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]));
    back.reverse().forEach((v) => ctx.lineTo(v[0], v[1]));
    ctx.closePath();
    const material = ctx.createLinearGradient(5, 7, 29, 23);
    material.addColorStop(0, color);
    material.addColorStop(0.47, color);
    material.addColorStop(1, p.muted);
    ctx.fillStyle = material;
    ctx.shadowColor = p.edge;
    ctx.shadowBlur = 1.5;
    ctx.shadowOffsetY = 0.75;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = p.edge;
    ctx.lineWidth = 0.4;
    ctx.globalAlpha = intensity * model.alpha * 0.48;
    ctx.stroke();

    ctx.beginPath();
    glint.forEach((v, i) => i ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]));
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = Math.min(0.65, model.width * 0.2);
    ctx.globalAlpha = intensity * model.alpha * 0.31;
    ctx.stroke();
    ctx.restore();
  }

  function paintRibbon(ctx, model, color, p, intensity) {
    if (intensity <= 0.001 || model.width <= 0.01) return;
    const points = model.points;
    if (model.gap > 0.008) {
      const left = Math.floor((0.5 - model.gap * 0.5) * COUNT);
      const right = Math.ceil((0.5 + model.gap * 0.5) * COUNT);
      ribbonSection(ctx, points, 0, left, model, color, p, intensity);
      ribbonSection(ctx, points, right, COUNT, model, color, p, intensity);
    } else {
      ribbonSection(ctx, points, 0, COUNT, model, color, p, intensity);
    }
  }

  function drawRibbon(ctx, input) {
    const f = frame(input);
    if (f.state === 'idle' && (!f.fromState || f.transition === 1)) return;
    const current = ribbonShape(f.state, f);
    const previous = ribbonShape(f.fromState || f.state, f);
    const model = interpolateRibbon(previous, current, f.transition);
    ctx.save();
    ctx.scale(f.w / 36, f.h / 28);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const oldTone = tone(f.fromState || f.state, f.palette);
    const newTone = tone(f.state, f.palette);
    if (oldTone !== newTone && f.transition < 1) {
      paintRibbon(ctx, model, oldTone, f.palette, 1 - f.transition);
      paintRibbon(ctx, model, newTone, f.palette, f.transition);
    } else {
      paintRibbon(ctx, model, newTone, f.palette, 1);
    }
    ctx.restore();
  }

  function sheet(x, y, w, h, angle, alpha, light, gap) {
    return { x, y, w, h, angle: angle || 0, alpha: alpha == null ? 1 : alpha, light: light == null ? 1 : light, gap: gap || 0 };
  }

  function glassShape(state, f) {
    const phase = f.t * 1.9 + f.seed * 0.65;
    const breath = f.reduced ? 0 : Math.sin(f.t * 1.55 + f.seed) * 0.45;
    if (state === 'running') {
      return [0, 1, 2].map((i) => {
        const turn = phase - i * TAU / 3;
        return sheet(68 + Math.sin(turn) * 9, 4.5 + i * 4.1, 104 - i * 4, 2.5,
          Math.sin(turn + 0.7) * 0.005, 0.6 + i * 0.1, 0.62 + Math.cos(turn) * 0.3);
      });
    }
    if (state === 'approval') {
      // Three fronts stop at the same vertical joint, visibly under tension.
      return [sheet(66, 6, 100, 2.0, 0, 0.6), sheet(71, 8.8, 90, 2.0, 0, 0.77), sheet(76, 11.6, 80, 2.0, 0, 0.91 + breath * 0.03)];
    }
    if (state === 'question') {
      // Every layer withdraws from the centre: a broad, unmistakable vacancy.
      return [sheet(68, 5.1, 110, 2.1, 0, 0.58, 0.9, 22 + breath), sheet(68, 9, 102, 2.1, 0, 0.75, 0.9, 27 + breath), sheet(68, 12.9, 94, 2.1, 0, 0.87, 0.9, 32 + breath)];
    }
    if (state === 'done') {
      const settle = f.reduced || f.age > 0.8 ? 0 : Math.sin(f.age * 9) * Math.exp(-f.age * 5) * 0.6;
      return [sheet(68, 7.5 + settle, 112, 1.1, 0, 0.6), sheet(68, 9.8, 112, 1.1, 0, 0.75), sheet(68, 12.1, 112, 1.1, 0, 0.9)];
    }
    if (state === 'error') {
      const jolt = f.reduced || f.age > 0.4 ? 0 : Math.sin(f.age * 53) * Math.exp(-f.age * 9) * 1.0;
      return [sheet(68, 5, 104, 2.2, 0, 0.6), sheet(84 + jolt, 8.7, 72, 2.6, -0.036, 0.95), sheet(68, 13, 104, 2.2, 0, 0.72)];
    }
    if (state === 'stopped') {
      return [sheet(56, 8, 64, 0.8, 0, 0.4), sheet(56, 10.3, 64, 0.8, 0, 0.5), sheet(56, 12.6, 64, 0.8, 0, 0.6)];
    }
    if (state === 'draft') {
      return [sheet(64, 11.5, 104, 0.45, 0, 0.5), sheet(107, 9.8, 8, 0.45, -0.55, 0.68), sheet(111, 11.5, 10, 0.45, 0, 0.45)];
    }
    return [sheet(68, 9, 100, 1, 0, 0), sheet(68, 9, 100, 1, 0, 0), sheet(68, 9, 100, 1, 0, 0)];
  }

  function roundedRect(ctx, x, y, w, h, radius) {
    const r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function paintSheetPiece(ctx, s, left, right, color, p, intensity) {
    const y = -s.h / 2;
    const width = right - left;
    if (width < 0.2) return;

    // Almost empty faces; the clear front edge carries the material.
    roundedRect(ctx, left, y, width, s.h, Math.min(0.65, s.h * 0.25));
    const face = ctx.createLinearGradient(left, y, right, -y);
    face.addColorStop(0, p.surface);
    face.addColorStop(0.5, color);
    face.addColorStop(1, p.surface);
    ctx.fillStyle = face;
    ctx.globalAlpha = intensity * s.alpha * 0.065;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(left + 0.7, -y);
    ctx.lineTo(right - 0.7, -y);
    ctx.lineTo(right, -y - Math.min(0.7, s.h));
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.72;
    ctx.globalAlpha = intensity * s.alpha * (0.7 + s.light * 0.18);
    ctx.stroke();

    if (s.h > 1.3) {
      ctx.beginPath();
      ctx.moveTo(left + 0.8, y + 0.2);
      ctx.lineTo(right - 0.8, y + 0.2);
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 0.42;
      ctx.globalAlpha = intensity * s.alpha * 0.13;
      ctx.stroke();
    }
  }

  function paintSheet(ctx, s, color, p, intensity) {
    if (s.alpha * intensity <= 0.005) return;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);
    if (s.gap > 0.1) {
      paintSheetPiece(ctx, s, -s.w / 2, -s.gap / 2, color, p, intensity);
      paintSheetPiece(ctx, s, s.gap / 2, s.w / 2, color, p, intensity);
    } else paintSheetPiece(ctx, s, -s.w / 2, s.w / 2, color, p, intensity);
    ctx.restore();
  }

  function drawGlass(ctx, input) {
    const f = frame(input);
    if (f.state === 'idle' && (!f.fromState || f.transition === 1)) return;
    const current = glassShape(f.state, f);
    const previous = glassShape(f.fromState || f.state, f);
    const models = current.map((s, i) => {
      const result = {};
      Object.keys(s).forEach((key) => { result[key] = mix(previous[i][key], s[key], f.transition); });
      return result;
    });
    const oldTone = tone(f.fromState || f.state, f.palette);
    const newTone = tone(f.state, f.palette);
    ctx.save();
    ctx.scale(f.w / 136, f.h / 18);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    models.forEach((s) => {
      if (oldTone !== newTone && f.transition < 1) {
        paintSheet(ctx, s, oldTone, f.palette, 1 - f.transition);
        paintSheet(ctx, s, newTone, f.palette, f.transition);
      } else paintSheet(ctx, s, newTone, f.palette, 1);
    });

    if (f.state === 'approval') {
      const breath = f.reduced ? 0.6 : 0.58 + Math.sin(f.t * 1.65 + f.seed) * 0.16;
      ctx.globalAlpha = breath * f.transition;
      ctx.strokeStyle = newTone;
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(118, 3.8);
      ctx.lineTo(118, 14.4);
      ctx.stroke();
    }
    if (f.state === 'done' && !f.reduced && f.age < 0.85) {
      const sweep = clamp(f.age / 0.85, 0, 1);
      ctx.globalAlpha = Math.sin(sweep * Math.PI) * 0.5 * f.transition;
      ctx.strokeStyle = f.palette.ink;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(12 + sweep * 112, 6.8);
      ctx.lineTo(16 + sweep * 108, 12.8);
      ctx.stroke();
    }
    ctx.restore();
  }

  window.StatusStudy.register({
    id: 'ribbon',
    name: '弹性丝带',
    tagline: '一根折带，以流动、结扣与张口表达不同的等待。',
    draw: drawRibbon
  });

  window.StatusStudy.register({
    id: 'glass',
    name: '玻璃层片',
    tagline: '薄片错身、合拢与留空，让状态融进玻璃材质。',
    draw: drawGlass
  });
}());
