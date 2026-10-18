'use strict';

// A design-only layer on the existing HTML demo. No DSH connection or storage.
(() => {
  const limit = 5;
  let cycle = null, revealTimer, noteTimer, contentMode = 'excerpt';
  const backdrop = document.createElement('div');
  backdrop.className = 'mru-backdrop';
  backdrop.hidden = true;
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-label', '切换会话');
  backdrop.setAttribute('aria-describedby', 'mru-instructions');
  backdrop.innerHTML = `<section class="mru-panel">
    <ol class="mru-list" role="listbox" aria-orientation="horizontal" tabindex="-1" aria-label="按最近查看顺序排列的会话摘页"></ol>
    <p class="mru-live sr" role="status" aria-live="polite" aria-atomic="true"></p>
    <p class="sr" id="mru-instructions">Tab 或方向键选择，松开 Ctrl 或按 Enter 切换，Esc 取消。</p>
  </section>`;
  const note = document.createElement('div');
  note.className = 'mru-note'; note.hidden = true; note.setAttribute('role', 'status');
  document.body.append(backdrop, note);
  const list = backdrop.querySelector('.mru-list');
  const surface = backdrop.querySelector('.mru-panel');
  const live = backdrop.querySelector('.mru-live');
  const topControls = document.createElement('div');
  topControls.style.display = 'contents';
  topControls.innerHTML = '<a class="mru-baseline" href="../session-switcher/index.html">保留版</a><button id="mru-material" aria-pressed="true" title="对比磨砂玻璃与不透明底色">磨砂</button><button id="mru-content" aria-pressed="false">试试仅有标题</button><button id="mru-quick">快速往返 <kbd>⌃ Tab</kbd></button><button class="mru-launch" id="mru-launch">体验切换</button>';
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
      ? `<code class="mru-code-fragment">${esc(text)}</code>` : `<span>${esc(text)}</span>`;
  }
  function fitExcerpts() {
    list.querySelectorAll('.mru-page-body').forEach(body => {
      const excerpt = body.querySelector('.mru-excerpt');
      const label = body.querySelector('.mru-source-label');
      const bodyStyle = getComputedStyle(body), labelStyle = getComputedStyle(label);
      const available = body.clientHeight - parseFloat(bodyStyle.paddingTop) - parseFloat(bodyStyle.paddingBottom)
        - label.getBoundingClientRect().height - (parseFloat(labelStyle.marginBottom) || 0);
      const lineHeight = parseFloat(getComputedStyle(excerpt).lineHeight);
      excerpt.style.webkitLineClamp = String(Math.max(1, Math.floor(available / lineHeight)));
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
      list.dataset.signature = signature;
      list.innerHTML = cycle.ids.map((id, index) => {
        const session = sessions.find(item => item.id === id);
        const group = groups.find(item => item.id === session.group);
        const source = sourceOf(session);
        const status = id === 's5' ? ['running', '运行中'] : id === 's4' ? ['waiting', '待你确认']
          : session.draft?.trim() ? ['draft', '有草稿'] : ['', ''];
        return `<li class="mru-row" id="mru-${id}" role="option" aria-selected="${index === cycle.index}" data-mru-id="${id}" data-source-kind="${source.kind}" aria-label="${esc(session.title)}，${esc(group.name)}${status[1] ? '，' + status[1] : ''}${id === cycle.origin ? '，当前会话' : ''}">
          <div class="mru-page-top"><span class="mru-status ${status[0]}">${status[1] ? '<i aria-hidden="true"></i>' : ''}${status[1]}</span>${id === cycle.origin ? '<span class="mru-current">当前</span>' : ''}</div>
          <div class="mru-page-body"><span class="mru-source-label">${source.label}</span><div class="mru-excerpt ${source.text.trimStart().startsWith('```') ? 'mru-code' : ''}" title="${esc(source.text)}">${sourceMarkup(source.text)}</div></div>
          <div class="mru-page-bottom"><span class="mru-title" title="${esc(session.title)}">${esc(session.title)}</span></div>
        </li>`;
      }).join('');
      list.querySelectorAll('.mru-page-body').forEach(body => pageResize.observe(body));
    }
    list.querySelectorAll('[data-mru-id]').forEach((row,index) => {
      const selected = index === cycle.index;
      row.setAttribute('aria-selected', String(selected));
    });
    const selected = sessions.find(item => item.id === cycle.ids[cycle.index]);
    list.setAttribute('aria-activedescendant', 'mru-' + selected.id);
    const source = sourceOf(selected);
    live.textContent = `${selected.title}。${source.label}：${source.text}`;
    requestAnimationFrame(() => { fitExcerpts(); selectedIntoView(); });
  }
  list.addEventListener('transitionend', event => {
    if (event.propertyName === 'border-color' && event.target.getAttribute('aria-selected') === 'true') selectedIntoView();
  });
  function reveal() {
    if (!cycle) return;
    cycle.visible = true;
    delete list.dataset.signature;
    hideWhichKey(); clearRegionHint();
    backdrop.hidden = false;
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
    clearTimeout(revealTimer);
    const previous = cycle, chosen = previous.ids[previous.index]; cycle = null;
    backdrop.hidden = true;
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
  $('mru-material').addEventListener('click', () => {
    const solid = backdrop.dataset.material !== 'solid';
    backdrop.dataset.material = solid ? 'solid' : 'glass';
    $('mru-material').textContent = solid ? '实底' : '磨砂';
    $('mru-material').setAttribute('aria-pressed', String(!solid));
    if (!cycle) begin(1, true);
  });
  $('mru-content').addEventListener('click', () => {
    contentMode = contentMode === 'excerpt' ? 'title' : 'excerpt';
    $('mru-content').textContent = contentMode === 'excerpt' ? '试试仅有标题' : '恢复原文摘页';
    $('mru-content').setAttribute('aria-pressed', String(contentMode === 'title'));
    if (!cycle) begin(1, true);
    else paint();
  });
  $('mru-launch').addEventListener('pointerdown', event => event.preventDefault());
  $('mru-launch').addEventListener('click', () => { if (cycle) finish(false); begin(1, true); });
  $('mru-quick').addEventListener('pointerdown', event => event.preventDefault());
  $('mru-quick').addEventListener('click', () => { if (cycle) finish(false); begin(1); finish(true); });
  document.querySelector('.lab').addEventListener('click', event => {
    if (cycle && !event.target.closest('#mru-launch, #mru-quick, #mru-content, #mru-material')) finish(false);
  }, true);
  function seed() {
    state.history = ['s1', 's5', 's2', 's4', 's8'];
    sessions.find(s => s.id === 's1').draft = '下一步我想把会话切换也接进来，先看看交互。';
    state.rightOpen = false; autoKeyHints = false;
    renderAll(); focusArea('chat', false); hideWhichKey();
    $('status-tip').textContent = '排版实验 · 现有示例会话原文 · 未连接 DSH';
  }
  $('reset').addEventListener('click', () => { finish(false); seed(); begin(1, true); });
  seed();
  // Open in presentation mode so the proposed surface is visible on arrival.
  begin(1, true);
})();
