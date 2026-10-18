'use strict';

// A design-only layer on the existing HTML demo. No DSH connection or storage.
(() => {
  const limit = 5;
  let cycle = null, revealTimer, noteTimer, contentMode = 'excerpt';
  const signals = new Map();
  const statusById = new Map([['s5','running'], ['s4','approval'], ['s8','unread']]);
  const labels = { idle: '静置', running: '运行中', approval: '等待授权', question: '等待回答', plan: '等待方案确认', unread: '本轮结束，有新结果待查看' };
  let timeline = 0;
  const timers = new Set();
  const backdrop = document.createElement('div');
  backdrop.className = 'signal-overlay';
  backdrop.hidden = true;
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-label', '切换会话');
  backdrop.setAttribute('aria-describedby', 'signal-instructions');
  backdrop.innerHTML = `<section class="signal-panel">
    <ol class="signal-list" role="listbox" aria-orientation="horizontal" tabindex="-1" aria-label="按最近查看顺序排列的会话"></ol>
    <p class="signal-live sr" role="status" aria-live="polite" aria-atomic="true"></p>
    <p class="sr" id="signal-instructions">Tab 或方向键选择，松开 Ctrl 或按 Enter 切换，Esc 取消。</p>
  </section>`;
  const note = document.createElement('div');
  note.className = 'signal-note'; note.hidden = true; note.setAttribute('role', 'status');
  document.body.append(backdrop, note);
  const list = backdrop.querySelector('.signal-list');
  const surface = backdrop.querySelector('.signal-panel');
  const live = backdrop.querySelector('.signal-live');
  const topControls = document.createElement('div');
  topControls.style.display = 'contents';
  topControls.className = 'signal-tools';
  topControls.innerHTML = '<a href="../session-fivebeat-dia/index.html">原白卡</a><a href="../session-fivebeat-dia-soft/index.html">柔和版</a><a href="../session-icon-wall/index.html?icon=11&theme=light">图标墙 · 11</a><a href="../session-design-archive/index.html">保留版本</a><button id="signal-material" aria-pressed="true">磨砂</button><button id="signal-demo-toggle" aria-pressed="false">状态演示</button><button id="signal-quick">快速往返</button><button class="signal-launch" id="signal-launch">体验切换</button>';
  document.querySelector('.lab-tools').prepend(topControls);

  function notify(message) {
    clearTimeout(noteTimer); note.textContent = message; note.hidden = false;
    noteTimer = setTimeout(() => { note.hidden = true; }, 2800);
  }
  // Only lay out existing source text. No summaries, topic extraction or network calls.
  function sourceOf(session) {
    if (contentMode === 'title') return { kind: 'title', text: session.title, label: '会话标题' };
    const prompt = session.extra?.at(-1) || session.prompt;
    if (prompt) return { kind: 'message', text: prompt, label: '上次你说' };
    if (session.draft?.trim()) return { kind: 'draft', text: session.draft, label: '未发送草稿' };
    return { kind: 'title', text: session.title, label: '会话标题' };
  }
  function sourceMarkup(text) {
    // Keep the source verbatim. A leading code fence selects monospace presentation.
    return text.trimStart().startsWith('```')
      ? `<code class="signal-code-fragment">${esc(text)}</code>` : `<span>${esc(text)}</span>`;
  }
  function fitExcerpts() {
    list.querySelectorAll('.signal-body').forEach(body => {
      const excerpt = body.querySelector('.signal-excerpt');
      const box = getComputedStyle(body);
      const available = body.clientHeight - parseFloat(box.paddingTop) - parseFloat(box.paddingBottom);
      excerpt.style.webkitLineClamp = String(Math.min(4, Math.max(1, Math.floor(available / parseFloat(getComputedStyle(excerpt).lineHeight)))));
    });
  }
  const pageResize = new ResizeObserver(fitExcerpts);
  function selectedIntoView() {
    const selected = list.querySelector('[aria-selected="true"]');
    if (!selected) return;
    const bounds = selected.getBoundingClientRect(), viewport = list.getBoundingClientRect();
    if (bounds.left < viewport.left + 3) list.scrollLeft += bounds.left - viewport.left - 3;
    else if (bounds.right > viewport.right - 3) list.scrollLeft += bounds.right - viewport.right + 3;
  }
  function paint() {
    if (!cycle) return;
    const signature = `${contentMode}:${cycle.ids.join(',')}`;
    if (list.dataset.signature !== signature) {
      pageResize.disconnect();
      signals.forEach(signal => signal.destroy()); signals.clear();
      list.dataset.signature = signature;
      list.innerHTML = cycle.ids.map((id, index) => {
        const session = sessions.find(item => item.id === id);
        const group = groups.find(item => item.id === session.group);
        const source = sourceOf(session);
        const status = statusById.get(id) || 'idle';
        return `<li class="signal-card" id="signal-${id}" role="option" aria-selected="${index === cycle.index}" data-signal-id="${id}" data-source-kind="${source.kind}" data-origin="${id === cycle.origin}" data-status="${status}" aria-label="${esc(session.title)}，${esc(group.name)}，${labels[status]}${session.draft?.trim() ? '，有未发送草稿' : ''}${id === cycle.origin ? '，当前会话' : ''}">
          <div class="signal-body"><div class="signal-excerpt ${source.text.trimStart().startsWith('```') ? 'signal-code' : ''}" title="${esc(source.text)}">${sourceMarkup(source.text)}</div></div>
          <div class="signal-foot"><span class="signal-symbol" aria-hidden="true"></span><span class="signal-title" title="${esc(session.title)}">${esc(session.title)}</span></div>
        </li>`;
      }).join('');
      list.querySelectorAll('.signal-body').forEach(body => pageResize.observe(body));
      list.querySelectorAll('[data-signal-id]').forEach(row => {
        const session = sessions.find(s => s.id === row.dataset.signalId);
        signals.set(session.id, SessionSignal.mount(row.querySelector('.signal-symbol'), statusById.get(session.id) || 'idle', !!session.draft?.trim()));
      });
    }
    list.querySelectorAll('[data-signal-id]').forEach((row,index) => {
      const selected = index === cycle.index;
      row.setAttribute('aria-selected', String(selected));
      updateRow(row);
    });
    const selected = sessions.find(item => item.id === cycle.ids[cycle.index]);
    list.setAttribute('aria-activedescendant', 'signal-' + selected.id);
    syncControls(selected.id);
    const source = sourceOf(selected);
    live.textContent = `${selected.title}。${source.label}：${source.text}`;
    requestAnimationFrame(() => { fitExcerpts(); selectedIntoView(); });
  }
  list.addEventListener('pointermove', event => {
    if (!cycle?.visible || event.pointerType === 'touch' || (!event.movementX && !event.movementY)) return;
    const row = event.target.closest('[data-signal-id]');
    if (!row) return;
    const next = cycle.ids.indexOf(row.dataset.signalId);
    if (next < 0 || next === cycle.index) return;
    cycle.index = next;
    paint();
  });
  function reveal() {
    if (!cycle) return;
    cycle.visible = true;
    delete list.dataset.signature;
    hideWhichKey(); clearRegionHint();
    backdrop.hidden = false;
    SessionSignal.setVisible(true);
    document.body.dataset.mruOpen = 'true';
    $('workspace').inert = true;
    $('status-tip').textContent = '';
    paint(); list.focus({preventScroll: true});
  }
  function begin(delta = 1, simulated = false) {
    if (cycle) { step(delta); return; }
    if (composing || document.querySelector('dialog[open]')) return;
    const ids = [state.current, ...state.history.filter(id => id !== state.current)]
      .filter((id, i, all) => all.indexOf(id) === i && sessions.some(s => s.id === id)).slice(0, limit);
    if (ids.length < 2) { notify('还没有其他最近访问的会话'); return; }
    const active = document.activeElement;
    cycle = { ids, index: delta > 0 ? 1 : ids.length - 1, origin: state.current,
      active, area: state.area, simulated, visible: false,
      selection: active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement
        ? [active.selectionStart, active.selectionEnd, active.selectionDirection] : null };
    note.hidden = true;
    if (simulated) reveal();
    else revealTimer = setTimeout(reveal, 140);
  }
  function step(delta) {
    if (!cycle) return;
    cycle.index = (cycle.index + delta + cycle.ids.length) % cycle.ids.length;
    if (cycle.visible) paint();
  }
  function finish(commit, restore = true) {
    if (!cycle) return;
    stopTimeline();
    clearTimeout(revealTimer);
    const previous = cycle, chosen = previous.ids[previous.index]; cycle = null;
    backdrop.hidden = true;
    SessionSignal.setVisible(false);
    document.body.dataset.mruOpen = 'false';
    $('workspace').inert = false; layout();
    if (commit && chosen !== previous.origin) {
      if (statusById.get(chosen) === 'unread') statusById.delete(chosen);
      openSession(chosen);
      $('status-tip').textContent = '已切换会话 · 再按 Ctrl Tab 回到刚才';
    } else if (restore) {
      if (previous.active?.isConnected && !previous.active.closest('.lab')) {
        previous.active.focus({preventScroll: true});
        if (previous.selection && previous.active.setSelectionRange) {
          previous.active.setSelectionRange(...previous.selection);
        }
        syncArea(previous.area);
      } else focusArea(previous.area, false);
    }
  }
  document.addEventListener('keydown', event => {
    if (event.isComposing || composing || event.keyCode === 229) return;
    const chord = event.code === 'Tab' && event.ctrlKey && !event.metaKey && !event.altKey;
    if (!cycle && chord && !document.querySelector('dialog[open]')) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (!event.repeat) begin(event.shiftKey ? -1 : 1);
      return;
    }
    if (!cycle) return;
    if (event.code === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation(); finish(false); return;
    }
    if (event.code === 'Enter') {
      event.preventDefault(); event.stopImmediatePropagation(); finish(true); return;
    }
    if (chord || (cycle.simulated && event.code === 'Tab')) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (!event.repeat) step(event.shiftKey ? -1 : 1);
      return;
    }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (!event.repeat) step(['ArrowRight', 'ArrowDown'].includes(event.code) ? 1 : -1);
      return;
    }
    // Do not allow a letter or Space to trigger background navigation.
    if (!['ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight', 'AltLeft', 'AltRight'].includes(event.code)) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }, true);
  window.addEventListener('keyup', event => {
    if (cycle && !cycle.simulated && (event.key === 'Control' || !event.ctrlKey)) finish(true);
  }, true);
  window.addEventListener('blur', () => finish(false, false));
  document.addEventListener('visibilitychange', () => { if (document.hidden) finish(false, false); });
  document.addEventListener('compositionstart', () => finish(false));
  backdrop.addEventListener('pointerdown', event => event.preventDefault());
  backdrop.addEventListener('click', event => {
    const row = event.target.closest('[data-signal-id]');
    if (row && cycle) { cycle.index = cycle.ids.indexOf(row.dataset.signalId); finish(true); }
    else if (event.target === backdrop) finish(false);
  });
  $('signal-material').addEventListener('click', () => {
    const solid = backdrop.dataset.material !== 'solid';
    backdrop.dataset.material = solid ? 'solid' : 'glass';
    $('signal-material').textContent = solid ? '实底' : '磨砂';
    $('signal-material').setAttribute('aria-pressed', String(!solid));
    if (!cycle) begin(1, true);
  });
  $('signal-launch').addEventListener('pointerdown', event => event.preventDefault());
  $('signal-launch').addEventListener('click', () => { if (cycle) finish(false); begin(1, true); });
  $('signal-quick').addEventListener('pointerdown', event => event.preventDefault());
  $('signal-quick').addEventListener('click', () => { if (cycle) finish(false); begin(1); finish(true); });
  document.querySelector('.lab').addEventListener('click', event => {
    if (cycle && !event.target.closest('#signal-launch, #signal-quick, #signal-material, #signal-demo-toggle, #theme-toggle')) finish(false);
  }, true);
  const controls = document.createElement('div');
  controls.className = 'signal-control'; controls.setAttribute('aria-label', '原型状态演示工具');
  controls.hidden = true;
  controls.innerHTML = `<span>候选会话</span>${['idle','running','approval','question','plan','unread'].map(kind => `<button data-demo-status="${kind}" aria-pressed="false">${{idle:'静置',running:'运行',approval:'待授权',question:'待回答',plan:'待审阅',unread:'有新结果'}[kind]}</button>`).join('')}<i class="control-divider"></i><label><input id="signal-draft-toggle" type="checkbox">草稿</label><button id="signal-static" aria-pressed="false">静帧</button><button id="signal-play" class="control-play"><svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 1L9 5L2 9Z"/></svg>播放转换</button>`;
  document.body.append(controls);
  // At real icon size, compare the same symbols used by the cards.
  controls.querySelectorAll('[data-demo-status]').forEach(button => {
    const label = button.textContent;
    const symbol = document.createElement('span');
    symbol.className = 'demo-symbol'; symbol.setAttribute('aria-hidden','true');
    button.replaceChildren(symbol, document.createTextNode(label));
    SessionSignal.mount(symbol,button.dataset.demoStatus,false);
  });
  function selectedId() { return cycle?.ids[cycle.index] || 's5'; }
  function updateRow(row) {
    const id = row.dataset.signalId, kind = statusById.get(id) || 'idle';
    const session = sessions.find(s => s.id === id), draft = !!session.draft?.trim();
    row.dataset.status = kind;
    row.querySelector('.signal-symbol').setAttribute('aria-hidden', 'true');
    row.setAttribute('aria-label', session.title + '，' + labels[kind] + (draft ? '，有未发送草稿' : '') + (id === cycle?.origin ? '，当前会话' : ''));
    signals.get(id)?.update(kind, draft);
  }
  function syncControls(id) {
    const kind = statusById.get(id) || 'idle';
    controls.querySelectorAll('[data-demo-status]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.demoStatus === kind)));
    controls.querySelector('#signal-draft-toggle').checked = !!sessions.find(s => s.id === id)?.draft?.trim();
  }
  function stopTimeline() {
    timeline++; timers.forEach(clearTimeout); timers.clear();
    $('signal-play').innerHTML = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 1L9 5L2 9Z"/></svg>播放转换';
    $('signal-play').setAttribute('aria-pressed', 'false');
  }
  function applyStatus(kind, id = selectedId()) {
    statusById.set(id, kind);
    if (!cycle) begin(1, true);
    else paint();
    live.textContent = sessions.find(s => s.id === id).title + '，' + labels[kind];
  }
  controls.addEventListener('click', event => {
    const button = event.target.closest('[data-demo-status]');
    if (button) { stopTimeline(); applyStatus(button.dataset.demoStatus); }
  });
  controls.addEventListener('pointerdown', event => { if (!event.target.closest('input')) event.preventDefault(); });
  $('signal-draft-toggle').addEventListener('change', event => {
    const id = selectedId(), session = sessions.find(s => s.id === id);
    session.draft = event.target.checked ? '下一步先看看交互效果。' : '';
    paint();
  });
  $('signal-static').addEventListener('click', () => {
    stopTimeline();
    const on = document.documentElement.dataset.signalStatic !== 'true';
    document.documentElement.dataset.signalStatic = String(on);
    $('signal-static').setAttribute('aria-pressed', String(on));
    SessionSignal.redraw();
  });
  $('signal-demo-toggle').addEventListener('click', () => {
    controls.hidden = !controls.hidden;
    $('signal-demo-toggle').setAttribute('aria-pressed', String(!controls.hidden));
  });
  $('signal-play').addEventListener('click', () => {
    const playing = $('signal-play').getAttribute('aria-pressed') === 'true';
    stopTimeline();
    if (playing) return;
    document.documentElement.dataset.signalStatic = 'false';
    $('signal-static').setAttribute('aria-pressed', 'false');
    const id = selectedId(), run = timeline;
    $('signal-play').textContent = '停止演示'; $('signal-play').setAttribute('aria-pressed', 'true');
    const sequence = ['running', 'approval', 'running', 'question', 'running', 'unread', 'idle'];
    sequence.forEach((kind, index) => {
      const timer = setTimeout(() => { timers.delete(timer); if (run === timeline) applyStatus(kind, id); }, index * 2200);
      timers.add(timer);
    });
    const end = setTimeout(stopTimeline, sequence.length * 2200); timers.add(end);
  });
  function seed() {
    statusById.clear();
    statusById.set('s5', 'running'); statusById.set('s4', 'approval'); statusById.set('s8', 'unread');
    state.history = ['s1', 's5', 's2', 's4', 's8'];
    sessions.find(s => s.id === 's1').draft = '下一步我想把会话切换也接进来，先看看交互。';
    state.rightOpen = false; autoKeyHints = false;
    renderAll(); focusArea('chat', false); hideWhichKey();
    $('status-tip').textContent = '交互原型 · 示例会话 · 未连接 DSH';
  }
  $('reset').addEventListener('click', () => { finish(false); seed(); begin(1, true); });
  seed();
  // Open in presentation mode so the proposed surface is visible on arrival.
  begin(1, true);
})();
