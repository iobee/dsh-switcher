'use strict';

// A design-only layer on the existing HTML demo. No DSH connection or storage.
(() => {
  const limit = 5;
  let cycle = null, revealTimer, noteTimer, cardStyle = 'context';
  const backdrop = document.createElement('div');
  backdrop.className = 'mru-backdrop';
  backdrop.hidden = true;
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'mru-heading');
  backdrop.setAttribute('aria-describedby', 'mru-instructions');
  backdrop.innerHTML = `<section class="mru-panel">
    <header class="mru-heading"><h2 id="mru-heading">最近会话</h2><div class="mru-heading-actions"><button id="mru-compare" aria-pressed="false">对比原缩略图</button><span class="mru-count" aria-hidden="true"></span></div></header>
    <ol class="mru-list" role="listbox" aria-orientation="horizontal" tabindex="-1" aria-label="按最近查看顺序横向排列的会话"></ol>
    <div class="mru-context" aria-live="polite" aria-atomic="true"><span class="mru-context-label">上次你说</span><p class="mru-context-copy"></p></div>
    <footer class="mru-foot" id="mru-instructions"><span>松开 <kbd>Ctrl</kbd> 切换</span><span><kbd>Tab</kbd> 下一个 <kbd>⇧ Tab</kbd> 上一个 <kbd>Esc</kbd> 取消</span></footer>
  </section>`;
  const demo = document.createElement('div');
  demo.className = 'mru-demo'; demo.hidden = true;
  demo.setAttribute('aria-label', '原型模拟控制');
  demo.innerHTML = '<small>模拟按住 Ctrl</small><button data-step="previous">上一个</button><button data-step="next">下一个</button><button data-step="commit">松开 Ctrl</button><button data-step="cancel">取消</button>';
  const note = document.createElement('div');
  note.className = 'mru-note'; note.hidden = true; note.setAttribute('role', 'status');
  backdrop.append(demo);
  document.body.append(backdrop, note);
  const list = backdrop.querySelector('.mru-list');
  const surface = backdrop.querySelector('.mru-panel');
  const detail = backdrop.querySelector('.mru-context');
  const topControls = document.createElement('div');
  topControls.style.display = 'contents';
  topControls.innerHTML = '<button id="mru-quick">快速往返 <kbd>⌃ Tab</kbd></button><button class="mru-launch" id="mru-launch">体验切换器</button>';
  document.querySelector('.lab-tools').prepend(topControls);

  function notify(message) {
    clearTimeout(noteTimer); note.textContent = message; note.hidden = false;
    noteTimer = setTimeout(() => { note.hidden = true; }, 2800);
  }
  function paint() {
    if (!cycle) return;
    surface.dataset.cardStyle = cardStyle;
    const scroll = list.scrollLeft;
    const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    list.innerHTML = cycle.ids.map((id, index) => {
      const session = sessions.find(item => item.id === id);
      const group = groups.find(item => item.id === session.group);
      const status = id === 's5' ? ['running', '运行中'] : id === 's4' ? ['waiting', '待你确认']
        : session.draft?.trim() ? ['draft', '有草稿'] : ['', ''];
      if (cardStyle === 'context') {
        return `<li class="mru-row" id="mru-${id}" role="option" aria-selected="${index === cycle.index}" data-mru-id="${id}" title="${esc(session.title)} · ${esc(group.name)}">
          <span class="mru-project-line"><span class="mru-glyph">${icon('folder')}</span><span class="mru-project">${esc(group.name)}</span></span>
          <span class="mru-title">${esc(session.title)}</span>
          <span class="mru-card-bottom"><span class="mru-status ${status[0]}">${status[1] ? '<i aria-hidden="true"></i>' : ''}${status[1]}</span>${id === cycle.origin ? '<span class="mru-current">当前</span>' : ''}</span></li>`;
      }
      const hasPreview = ['s1', 's5', 's2', 's4', 's8'].includes(id);
      const thumbnailStatus = id === cycle.origin ? ['current', '正在查看'] : status;
      return `<li class="mru-row" id="mru-${id}" role="option" aria-selected="${index === cycle.index}" data-mru-id="${id}" title="${esc(session.title)} · ${esc(group.name)}">
        <span class="mru-preview" aria-hidden="true">${hasPreview ? `<img src="previews/${id}-${theme}.png" alt="" draggable="false">` : `<span class="mru-fallback">${icon('new')}</span>`}</span>
        <span class="mru-copy"><span class="mru-title">${esc(session.title)}</span><span class="mru-project-line"><span class="mru-glyph">${icon('folder')}</span><span class="mru-project">${esc(group.name)}</span></span>
        <span class="mru-status ${thumbnailStatus[0]}">${thumbnailStatus[1] && thumbnailStatus[0] !== 'current' ? '<i aria-hidden="true"></i>' : ''}${thumbnailStatus[1]}</span></span></li>`;
    }).join('');
    list.scrollLeft = scroll;
    list.setAttribute('aria-activedescendant', 'mru-' + cycle.ids[cycle.index]);
    list.querySelector('[aria-selected="true"]')?.scrollIntoView({block: 'nearest', inline: 'nearest'});
    backdrop.querySelector('.mru-count').textContent = `${cycle.index + 1} / ${cycle.ids.length}`;
    detail.hidden = cardStyle !== 'context';
    if (cardStyle === 'context') {
      const selected = sessions.find(item => item.id === cycle.ids[cycle.index]);
      const lastPrompt = selected.extra?.at(-1) || selected.prompt;
      const draft = selected.draft?.trim();
      const label = lastPrompt ? '上次你说' : draft ? '未发送草稿' : '新会话';
      const copy = lastPrompt || draft || '还没有开始对话。';
      detail.querySelector('.mru-context-label').textContent = label;
      detail.querySelector('.mru-context-copy').textContent = copy;
      detail.querySelector('.mru-context-copy').title = copy;
    }
  }
  function reveal() {
    if (!cycle) return;
    cycle.visible = true;
    hideWhichKey(); clearRegionHint();
    backdrop.hidden = false; demo.hidden = !cycle.simulated;
    document.body.dataset.mruOpen = 'true';
    $('workspace').inert = true;
    $('status-tip').textContent = 'Tab 挑选 · 松开 Ctrl 确认 · Esc 取消';
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
    clearTimeout(revealTimer);
    const previous = cycle, chosen = previous.ids[previous.index]; cycle = null;
    backdrop.hidden = true; demo.hidden = true;
    document.body.dataset.mruOpen = 'false';
    $('workspace').inert = false; layout();
    if (commit && chosen !== previous.origin) {
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
    const row = event.target.closest('[data-mru-id]');
    if (row && cycle) { cycle.index = cycle.ids.indexOf(row.dataset.mruId); finish(true); }
    else if (event.target === backdrop) finish(false);
  });
  demo.addEventListener('pointerdown', event => event.preventDefault());
  $('mru-compare').addEventListener('click', () => {
    cardStyle = cardStyle === 'context' ? 'thumbnails' : 'context';
    $('mru-compare').textContent = cardStyle === 'context' ? '对比原缩略图' : '回到信息卡片';
    $('mru-compare').setAttribute('aria-pressed', String(cardStyle === 'thumbnails'));
    paint();
  });
  demo.addEventListener('click', event => {
    const action = event.target.closest('[data-step]')?.dataset.step;
    if (action === 'previous') step(-1);
    if (action === 'next') step(1);
    if (action === 'commit') finish(true);
    if (action === 'cancel') finish(false);
  });
  $('mru-launch').addEventListener('pointerdown', event => event.preventDefault());
  $('mru-launch').addEventListener('click', () => { if (cycle) finish(false); begin(1, true); });
  $('mru-quick').addEventListener('pointerdown', event => event.preventDefault());
  $('mru-quick').addEventListener('click', () => { if (cycle) finish(false); begin(1); finish(true); });
  document.querySelector('.lab').addEventListener('click', event => {
    if (cycle && !event.target.closest('#mru-launch, #mru-quick')) finish(false);
  }, true);
  function seed() {
    state.history = ['s1', 's5', 's2', 's4', 's8'];
    sessions.find(s => s.id === 's1').draft = '下一步我想把会话切换也接进来，先看看交互。';
    state.rightOpen = false; autoKeyHints = false;
    renderAll(); focusArea('chat', false); hideWhichKey();
    $('status-tip').textContent = 'Ctrl Tab 最近会话 · 快按往返，按住挑选';
  }
  $('reset').addEventListener('click', () => { finish(false); seed(); begin(1, true); });
  seed();
  // Open in presentation mode so the proposed surface is visible on arrival.
  begin(1, true);
})();
