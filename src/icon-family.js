'use strict';

// Use the selected wall's entire 11 family, not just its running pose.
// Geometry and timing remain in the original IconWallMotion implementation.
window.SessionSignal = (() => {
  const root = document.documentElement;
  const ns = 'http://www.w3.org/2000/svg';
  let visible = true;
  const wallState = (kind, draft) => {
    if (kind === 'idle' && draft) return 'draft';
    // These three states all await the user's next action; accessible labels
    // in the switcher retain the specific approval, answer, or review request.
    if (kind === 'question' || kind === 'plan') return 'approval';
    return kind;
  };
  function syncPlayback() {
    IconWallMotion.setPaused(!visible || document.hidden || root.dataset.signalStatic === 'true');
  }
  function mount(host, kind = 'idle', draft = false) {
    const icon = IconWallMotion.mount(host, 11, wallState(kind, draft));
    const svg = host.lastElementChild;
    svg.classList.add('signal-mark');
    svg.dataset.iconFamily = '11';
    const badge = document.createElementNS(ns, 'path');
    badge.classList.add('signal-draft');
    badge.setAttribute('d', 'M24.1 26.4 L27.4 23.1');
    badge.setAttribute('stroke-width', '1.8');
    svg.append(badge);
    function update(next, hasDraft) {
      svg.dataset.runtimeState = next;
      badge.setAttribute('opacity', hasDraft && next !== 'idle' && next !== 'draft' ? '.85' : '0');
      icon.update(11, wallState(next, hasDraft));
    }
    update(kind, draft);
    syncPlayback();
    return {update, destroy: icon.destroy};
  }
  document.addEventListener('visibilitychange', syncPlayback);
  new MutationObserver(syncPlayback).observe(root, {attributes: true, attributeFilter: ['data-signal-static']});
  return {mount, setVisible(value) {visible = value; syncPlayback();}, redraw: syncPlayback};
})();
