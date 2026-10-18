'use strict';
(() => {
  const order = ['ribbon', 'glass', 'shutters', 'lattice', 'type', 'refraction'];
  const labels = {running: '运行中', approval: '等待审批 / 计划待审', question: '等你回答', done: '新结果待查看', error: '异常（结果来源待接入）', stopped: '已停止（结果来源待接入）', idle: '静默', draft: '静默 · 有草稿'};
  const initialIds = ['s1', 's5', 's2', 's4', 's8'];
  const reducedMedia = matchMedia('(prefers-reduced-motion: reduce)');
  const started = performance.now();
  const now = () => (performance.now() - started) / 1000;
  let activeStyle = 'ribbon', selectedId = 's5', ids = [...initialIds], origin = 's1';
  let compare = false, staticMode = false, returning = null, revealTimer, demoTimer, demoIndex = 0;
  let records = [], palette, lastFrame = -1, layerOpen = false;
  const samples = new Map();
  const overlay = document.createElement('section');
  overlay.className = 'study-overlay'; overlay.hidden = true;
  overlay.setAttribute('role', 'region'); overlay.setAttribute('aria-label', '会话切换动效探索');
  overlay.innerHTML = '<div class="study-focus"><div class="study-strip" id="study-main"></div><div class="study-legend" id="study-main-legend" aria-hidden="true"></div></div><div class="study-comparison"><div class="study-compare" id="study-comparison"></div></div><p class="sr" id="study-live" role="status" aria-live="polite" aria-atomic="true"></p>';
  const controller = document.createElement('aside');
  controller.className = 'study-controller'; controller.setAttribute('aria-label', '动效比较工具');
  controller.innerHTML = `<div class="study-style-tabs" aria-label="动态风格">${order.map((id, i) => `<button data-style="${id}" aria-pressed="${id === activeStyle}">${String(i + 1).padStart(2, '0')} ${StatusStudy.styles.get(id).name}</button>`).join('')}</div>
    <p class="study-tagline" id="study-tagline"></p>
    <div class="study-options"><label>选中会话 <select id="study-state" aria-label="选中会话的示例状态">${Object.entries(labels).filter(([k]) => k !== 'draft').map(([key, text]) => `<option value="${key}">${text}</option>`).join('')}</select></label>
    <label><input type="checkbox" id="study-draft">有草稿</label><button id="study-cycle">演示一轮</button><button id="study-static" aria-pressed="false">静态比较</button><label><input type="checkbox" id="study-labels">状态说明</label><span class="study-example">示例状态 · 点击卡片选取 · Enter 模拟进入</span></div>`;
  document.body.append(overlay, controller);
  const extraTools = document.createElement('span'); extraTools.style.display = 'contents';
  extraTools.innerHTML = '<a href="../session-switcher-text/index.html">上一版</a><button id="study-compare" aria-pressed="false">并排比较</button>';
  document.querySelector('.lab-tools').prepend(extraTools);
  const main = document.getElementById('study-main'), comparison = document.getElementById('study-comparison');
  const stateControl = document.getElementById('study-state'), draftControl = document.getElementById('study-draft');
  const live = document.getElementById('study-live');
  function seedSamples() {
    const defaults = {s1: 'idle', s5: 'running', s2: 'approval', s4: 'question', s8: 'done'};
    samples.clear(); initialIds.forEach((id, i) => samples.set(id, {state: defaults[id], fromState: defaults[id], changedAt: now() - 3, draft: i === 0, seed: i * .31}));
    sessions.find(s => s.id === 's1').draft = '下一步我想把会话切换也接进来，先看看交互。';
    state.history = [...initialIds]; state.rightOpen = false; autoKeyHints = false;
    renderAll(); hideWhichKey(); clearRegionHint();
  }
  function effective(sample) { return sample.state === 'idle' && sample.draft ? 'draft' : sample.state; }
  function sourceOf(session) { return session.extra?.at(-1) || session.prompt || session.draft || session.title; }
  function sampleLabel(id) { const s = samples.get(id); return labels[effective(s)]; }
  function cardsHTML(cardIds, styleId, prefix) {
    return `<ol class="study-cards" tabindex="-1" role="listbox" aria-orientation="horizontal" aria-label="${esc(StatusStudy.styles.get(styleId).name)}会话候选">${cardIds.map(id => {
      const s = sessions.find(item => item.id === id), group = groups.find(item => item.id === s.group);
      return `<li class="study-card" id="${prefix}-${id}" role="option" aria-selected="${id === selectedId}" aria-current="${id === origin}" data-session="${id}" data-draft="${samples.get(id).draft}" title="${esc(sampleLabel(id))}" aria-label="${esc(s.title)}，${esc(group.name)}，${esc(sampleLabel(id))}${id === origin ? '，当前会话' : ''}"><div class="study-quote" title="${esc(sourceOf(s))}">${esc(sourceOf(s))}</div><div class="study-foot"><span class="study-title">${esc(s.title)}</span><canvas class="study-glyph" data-style="${styleId}" data-session="${id}" aria-hidden="true"></canvas></div></li>`;
    }).join('')}</ol>`;
  }
  function readPalette() {
    const css = getComputedStyle(overlay), pick = key => css.getPropertyValue('--study-' + key).trim();
    palette = {ink: pick('ink'), muted: pick('muted'), accent: pick('accent'), warning: pick('warning'), success: pick('accent'), danger: pick('danger'), surface: pick('surface'), edge: pick('muted')};
  }
  function collectCanvases() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    records = [...overlay.querySelectorAll('canvas')].map(canvas => {
      const ctx = canvas.getContext('2d');
      const record = {canvas, ctx, id: canvas.dataset.session, style: canvas.dataset.style, comparison: !!canvas.closest('.study-comparison'), dpr};
      configureCanvas(record); return record;
    });
  }
  function configureCanvas(record) {
    record.w = record.style === 'glass' ? 136 : record.style === 'refraction' ? 160 : 36;
    record.h = record.style === 'glass' ? 18 : record.style === 'refraction' ? 152 : 28;
    record.canvas.width = Math.round(record.w * record.dpr); record.canvas.height = Math.round(record.h * record.dpr);
    record.ctx.setTransform(record.dpr, 0, 0, record.dpr, 0, 0);
    record.canvas.closest('.study-card').dataset.motionStyle = record.style;
  }
  function build() {
    main.innerHTML = cardsHTML(ids, activeStyle, 'study-focus');
    comparison.innerHTML = order.map((id, i) => `<section class="study-tile" data-tile="${id}"><button class="study-tile-title" data-pick-style="${id}">${String(i + 1).padStart(2, '0')} ${StatusStudy.styles.get(id).name}<small>单独查看</small></button><div class="study-strip">${cardsHTML(['s5', 's2', 's4'], id, 'study-' + id)}</div><div class="study-legend" data-legend="${id}" aria-hidden="true"></div></section>`).join('');
    collectCanvases(); readPalette(); update();
  }
  function update() {
    overlay.querySelectorAll('.study-card').forEach(row => {
      const id = row.dataset.session, session = sessions.find(s => s.id === id), group = groups.find(g => g.id === session.group), sample = samples.get(id);
      row.setAttribute('aria-selected', String(id === selectedId)); row.setAttribute('aria-current', String(id === origin));
      row.dataset.draft = String(sample.draft && sample.state !== 'idle');
      row.title = sampleLabel(id); row.querySelector('.study-quote').title = sampleLabel(id) + ' · ' + sourceOf(session);
      row.setAttribute('aria-label', `${session.title}，${group.name}，${sampleLabel(id)}${sample.draft && sample.state !== 'idle' ? '，有草稿' : ''}${id === origin ? '，当前会话' : ''}`);
    });
    document.getElementById('study-main-legend').innerHTML = ids.map(id => `<span>${sampleLabel(id)}</span>`).join('');
    overlay.querySelectorAll('[data-legend]').forEach(legend => { legend.innerHTML = ['s5', 's2', 's4'].map(id => `<span>${sampleLabel(id)}</span>`).join(''); });
    const sample = samples.get(selectedId); stateControl.value = sample.state; draftControl.checked = sample.draft;
    document.getElementById('study-tagline').textContent = StatusStudy.styles.get(activeStyle).tagline;
    controller.querySelectorAll('[data-style]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.style === activeStyle)));
    const selected = sessions.find(s => s.id === selectedId);
    live.textContent = `${selected.title}，${sampleLabel(selectedId)}。${sourceOf(selected)}`;
    overlay.dataset.view = compare ? 'compare' : 'focus';
    document.getElementById('study-compare').setAttribute('aria-pressed', String(compare));
    document.getElementById('study-compare').textContent = compare ? '单独查看' : '并排比较';
    const list = main.querySelector('.study-cards'); list.setAttribute('aria-activedescendant', 'study-focus-' + selectedId);
    list.setAttribute('aria-label', StatusStudy.styles.get(activeStyle).name + '会话候选');
    requestAnimationFrame(() => {
      const card = list.querySelector('[aria-selected=true]'), a = card.getBoundingClientRect(), b = list.getBoundingClientRect();
      if (a.left < b.left) list.scrollLeft += a.left - b.left - 2;
      else if (a.right > b.right) list.scrollLeft += a.right - b.right + 2;
    });
  }
  function stopDemo() { clearInterval(demoTimer); demoTimer = null; document.getElementById('study-cycle').textContent = '演示一轮'; }
  function setSampleState(id, next) {
    const sample = samples.get(id); sample.fromState = effective(sample); sample.state = next; sample.changedAt = now(); update();
  }
  function pickStyle(id) {
    activeStyle = id;
    main.querySelectorAll('canvas').forEach(c => { c.dataset.style = id; });
    records.forEach(r => { if (!r.comparison) { r.style = id; configureCanvas(r); } });
    if (!layerOpen) openLayer(); update();
  }
  function openLayer(delta = 1, simulated = true) {
    clearTimeout(revealTimer);
    if (!layerOpen) {
      returning = {element: document.activeElement, area: state.area}; origin = state.current;
      ids = [origin, ...state.history, ...initialIds].filter((id, i, all) => all.indexOf(id) === i && samples.has(id)).slice(0, 5);
      selectedId = ids[delta > 0 ? 1 : ids.length - 1];
      build();
    }
    layerOpen = true; overlay.hidden = false; overlay.dataset.simulated = String(simulated);
    document.body.dataset.mruOpen = 'true'; $('workspace').inert = true;
    hideWhichKey(); clearRegionHint(); $('status-tip').textContent = '';
    main.querySelector('.study-cards').focus({preventScroll: true}); update();
  }
  function closeLayer(commit = false) {
    clearTimeout(revealTimer); if (!layerOpen) return;
    stopDemo(); layerOpen = false; overlay.hidden = true; $('workspace').inert = false;
    document.body.dataset.mruOpen = 'false'; layout();
    if (commit && selectedId !== origin) openSession(selectedId);
    else if (returning?.element?.isConnected && !returning.element.closest('.lab, .study-controller')) returning.element.focus({preventScroll: true});
    else focusArea(returning?.area || 'chat', false);
  }
  function step(delta) { stopDemo(); selectedId = ids[(ids.indexOf(selectedId) + delta + ids.length) % ids.length]; update(); }
  controller.addEventListener('click', event => {
    const style = event.target.closest('[data-style]'); if (style) pickStyle(style.dataset.style);
  });
  stateControl.addEventListener('change', () => { const next = stateControl.value; stopDemo(); if (!layerOpen) openLayer(); setSampleState(selectedId, next); });
  draftControl.addEventListener('change', () => { const sample = samples.get(selectedId); sample.draft = draftControl.checked; sample.changedAt = now(); update(); });
  document.getElementById('study-static').addEventListener('click', event => { staticMode = !staticMode; event.currentTarget.setAttribute('aria-pressed', String(staticMode)); });
  document.getElementById('study-labels').addEventListener('change', event => { overlay.dataset.labels = String(event.target.checked); });
  document.getElementById('study-cycle').addEventListener('click', () => {
    if (demoTimer) { stopDemo(); return; }
    if (!layerOpen) openLayer();
    const target = selectedId, sequence = ['running', 'approval', 'question', 'done', 'idle']; demoIndex = 0;
    document.getElementById('study-cycle').textContent = '停止演示'; setSampleState(target, sequence[0]);
    demoTimer = setInterval(() => { demoIndex++; if (demoIndex >= sequence.length) { stopDemo(); return; } setSampleState(target, sequence[demoIndex]); }, 2100);
  });
  document.getElementById('study-compare').addEventListener('click', () => { if (!layerOpen) openLayer(); compare = !compare; update(); });
  comparison.addEventListener('click', event => {
    const style = event.target.closest('[data-pick-style]'), row = event.target.closest('.study-card');
    if (!style && !row) return;
    const id = style?.dataset.pickStyle || row.closest('[data-tile]').dataset.tile;
    if (row) selectedId = row.dataset.session;
    compare = false; pickStyle(id); main.querySelector('.study-cards').focus({preventScroll: true});
  });
  main.addEventListener('click', event => { const row = event.target.closest('[data-session]'); if (row) { stopDemo(); selectedId = row.dataset.session; update(); main.querySelector('.study-cards').focus({preventScroll: true}); } });
  $('theme-toggle').addEventListener('click', () => { requestAnimationFrame(readPalette); });
  $('reset').addEventListener('click', () => { stopDemo(); seedSamples(); layerOpen = false; openLayer(); });
  document.addEventListener('keydown', event => {
    if (event.isComposing || composing) return;
    const chord = event.code === 'Tab' && event.ctrlKey && !event.metaKey && !event.altKey;
    if (chord) { event.preventDefault(); event.stopImmediatePropagation(); if (!event.repeat) { if (!layerOpen) openLayer(event.shiftKey ? -1 : 1, false); else step(event.shiftKey ? -1 : 1); } return; }
    if (!layerOpen) return;
    if (event.code === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); closeLayer(); return; }
    if (event.target.closest('.lab, .study-controller')) { event.stopImmediatePropagation(); return; }
    if (event.code === 'Enter') { event.preventDefault(); event.stopImmediatePropagation(); closeLayer(true); return; }
    if (['Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) { event.preventDefault(); event.stopImmediatePropagation(); if (!event.repeat) step(event.code === 'Tab' ? event.shiftKey ? -1 : 1 : ['ArrowLeft', 'ArrowUp'].includes(event.code) ? -1 : 1); return; }
    event.preventDefault(); event.stopImmediatePropagation();
  }, true);
  window.addEventListener('keyup', event => { if (layerOpen && overlay.dataset.simulated === 'false' && event.key === 'Control') closeLayer(true); }, true);
  window.addEventListener('blur', () => closeLayer());
  document.addEventListener('visibilitychange', () => { if (document.hidden) closeLayer(); });
  reducedMedia.addEventListener('change', () => { lastFrame = -1; });
  new MutationObserver(readPalette).observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});
  function animate(timestamp) {
    requestAnimationFrame(animate);
    if (!layerOpen || document.hidden || timestamp - lastFrame < 32) return;
    lastFrame = timestamp;
    const t = now(), reduced = staticMode || reducedMedia.matches;
    records.forEach(record => {
      if (record.comparison !== compare) return;
      if (record.comparison) { const r = record.canvas.getBoundingClientRect(); if (r.bottom < 44 || r.top > innerHeight - 180) return; }
      const sample = samples.get(record.id), age = t - sample.changedAt;
      const f = {w: record.w, h: record.h, t: reduced ? 0 : t, age: reduced ? 3 : age, state: effective(sample), fromState: sample.fromState, transition: reduced ? 1 : Math.min(1, Math.max(0, age / .32)), reduced, seed: sample.seed, palette};
      const ctx = record.ctx; ctx.save(); ctx.clearRect(0, 0, record.w, record.h); StatusStudy.styles.get(record.style).draw(ctx, f); ctx.restore();
    });
  }
  seedSamples(); readPalette(); openLayer(); requestAnimationFrame(animate);
})();
