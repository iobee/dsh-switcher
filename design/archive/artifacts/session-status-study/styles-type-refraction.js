'use strict';
(() => {
  const clamp = v => Math.max(0, Math.min(1, v));
  const ease = v => 1 - Math.pow(1 - clamp(v), 3);
  const alpha = (c, a) => {
    const n = c.replace('#', '');
    return `rgba(${parseInt(n.slice(0, 2), 16)},${parseInt(n.slice(2, 4), 16)},${parseInt(n.slice(4, 6), 16)},${a})`;
  };
  const stateColor = f => ['approval', 'question'].includes(f.state) ? f.palette.warning
    : f.state === 'error' ? f.palette.danger : f.state === 'done' ? f.palette.success
      : f.state === 'running' ? f.palette.accent : f.palette.muted;
  function line(ctx, x, y, width, color, opacity = 1, height = 1.4) {
    const before = ctx.globalAlpha; ctx.globalAlpha = before * opacity; ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(x, y, Math.max(.1, width), height, .6); ctx.fill(); ctx.globalAlpha = before;
  }
  function type(ctx, f) {
    if (f.state === 'idle') return;
    const c = stateColor(f), t = f.reduced ? .6 : f.t;
    if (f.state === 'draft') {
      line(ctx, 6, 19, 19, c, .5, 1);
      line(ctx, 7, 8, 1, c, .75, 8); return;
    }
    if (f.state === 'question') {
      line(ctx, 5, 7, 23, c, .68);
      line(ctx, 5, 13, 8, c, .68); line(ctx, 23, 13, 5, c, .68);
      line(ctx, 16, 11, 1.2, c, f.reduced ? .8 : .55 + Math.sin(t * 1.8) * .25, 6);
      line(ctx, 5, 20, 16, c, .42); return;
    }
    const widths = f.state === 'done' ? [23, 20, 23] : f.state === 'approval' ? [22, 22, 22]
      : f.state === 'error' ? [23, 18, 9] : [23, 18, 12];
    for (let row = 0; row < 3; row++) {
      const y = 6 + row * 7;
      const phase = ((t * 1.6 - row * .32) % 1 + 1) % 1;
      const length = f.state === 'running' ? 9 + phase * widths[row] * .6 : widths[row];
      const settle = f.state === 'done' && !f.reduced ? ease(f.age / .55) : 1;
      const fragments = [4, 6, 3, 5, 3]; let x = 5;
      for (let j = 0; j < fragments.length; j++) {
        const rest = length * settle - (x - 5); if (rest <= 0) break;
        line(ctx, x, y, Math.min(fragments[j], rest), c, f.state === 'stopped' ? .42 : .7);
        x += fragments[j] + 1.5;
      }
    }
    if (f.state === 'approval') line(ctx, 29, 4, 1.2, c, .6, 20);
    if (f.state === 'error') { line(ctx, 18, 20, 1, c, .9, 3); line(ctx, 24, 20, 5, c, .35); }
    if (f.state === 'stopped') { line(ctx, 29, 7, 1, c, .5, 12); }
  }
  function lens(ctx, x, y, rx, ry, angle, c, opacity, surface) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    const grad = ctx.createLinearGradient(-rx, -ry, rx, ry);
    grad.addColorStop(0, alpha(c, opacity)); grad.addColorStop(.47, alpha(surface, opacity * .15));
    grad.addColorStop(1, alpha(c, opacity * .65));
    ctx.fillStyle = grad; ctx.strokeStyle = alpha(c, opacity * .65); ctx.lineWidth = .65;
    ctx.beginPath(); ctx.moveTo(-rx, 0); ctx.bezierCurveTo(-rx * .45, -ry, rx * .45, -ry, rx, 0);
    ctx.bezierCurveTo(rx * .5, ry, -rx * .5, ry, -rx, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function refraction(ctx, f) {
    if (f.state === 'idle') return;
    const p = f.palette, c = stateColor(f), t = f.reduced ? .35 : f.t;
    if (f.state === 'running') {
      lens(ctx, 15 + Math.sin(t * 1.3) * 2, 12, 12, 6, -.55 + Math.sin(t) * .14, c, .76, p.surface);
      lens(ctx, 21 - Math.sin(t * 1.3) * 2, 16, 10, 5, .7 + Math.cos(t * .9) * .15, c, .52, p.surface);
    } else if (f.state === 'approval') {
      const breath = f.reduced ? .8 : .72 + Math.sin(t * 1.5) * .1;
      ctx.strokeStyle = alpha(c, .6); ctx.lineWidth = .7;
      const grad = ctx.createLinearGradient(12, 6, 24, 22);
      grad.addColorStop(0, alpha(c, breath)); grad.addColorStop(.6, alpha(c, .1)); grad.addColorStop(1, alpha(c, .5));
      ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(18, 4); ctx.lineTo(28, 13); ctx.lineTo(20, 24);
      ctx.lineTo(9, 17); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(18, 4); ctx.lineTo(16, 16); ctx.lineTo(28, 13); ctx.stroke();
    } else if (f.state === 'question') {
      const open = f.reduced ? 1.5 : 1.5 + Math.sin(t * 1.2) * .6;
      lens(ctx, 10 - open, 14, 5.5, 11, -.12, c, .62, p.surface);
      lens(ctx, 26 + open, 14, 5.5, 11, .12, c, .62, p.surface);
    } else if (f.state === 'done') {
      const settle = f.reduced ? 1 : ease(f.age / .7);
      lens(ctx, 18, 14, 12, 6 - settle * 4.8, 0, c, .7, p.surface);
    } else if (f.state === 'error') {
      const jolt = f.reduced || f.age > .45 ? 0 : Math.sin(f.age * 36) * (1 - f.age / .45);
      lens(ctx, 11 + jolt, 11, 8, 5, -.6, c, .66, p.surface);
      lens(ctx, 25 - jolt, 18, 7, 4, -.6, c, .45, p.surface);
    } else if (f.state === 'stopped') {
      lens(ctx, 18, 14, 11, 4, 0, c, .44, p.surface);
      line(ctx, 18, 9, 1, c, .55, 10);
    } else if (f.state === 'draft') {
      ctx.strokeStyle = alpha(c, .6); ctx.lineWidth = .8;
      ctx.beginPath(); ctx.moveTo(10, 8); ctx.lineTo(10, 20); ctx.lineTo(25, 20); ctx.stroke();
      lens(ctx, 21, 17, 5, 3, -.5, c, .38, p.surface);
    }
  }
  StatusStudy.register({id: 'type', name: '活字排印', tagline: '续写、止挡、待填与落版，把状态藏进文字的秩序。', draw: type});
  StatusStudy.register({id: 'refraction', name: '局部折射', tagline: '让剪切、凝聚与开合进入卡片表面，用局部材质变化表达状态。', draw(ctx, f) {
    if (f.w <= 40) { refraction(ctx, f); return; }
    ctx.save(); ctx.translate(f.w * .70, f.h * .68); ctx.scale(3.3, 2.4); ctx.translate(-18, -14); ctx.globalAlpha = .34;
    refraction(ctx, {...f, w: 36, h: 28}); ctx.restore();
  }});
})();
