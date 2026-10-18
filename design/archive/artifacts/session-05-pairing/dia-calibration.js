'use strict';
window.SessionLayout = (() => {
  const root = document.documentElement;
  let size = new URLSearchParams(location.search).get('size') === 'compact' ? 'compact' : 'dia';
  root.dataset.layout = size;

  function syncLinks() {
    document.querySelectorAll('#light-trial, #dark-trial, #material-wall-link').forEach(link => {
      const url = new URL(link.href, location.href);
      url.searchParams.set('size', size);
      link.href = url.href;
    });
  }
  function apply(next) {
    size = next;
    root.dataset.layout = size;
    document.querySelectorAll('[data-size]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.size === size));
    });
    const url = new URL(location.href);
    url.searchParams.set('size', size);
    history.replaceState(null, '', url);
    syncLinks();
    revealCandidate();
  }
  function revealCandidate() {
    // Keep the candidate visible when changing the horizontal viewport width.
    document.querySelectorAll('.signal-list').forEach(list => {
      const card = list.querySelector('[aria-selected=true]');
      if (!card) return;
      const item = card.getBoundingClientRect(), viewport = list.getBoundingClientRect();
      if (item.left < viewport.left) list.scrollLeft += item.left - viewport.left;
      else if (item.right > viewport.right) list.scrollLeft += item.right - viewport.right;
    });
  }
  window.addEventListener('resize', revealCandidate);
  document.addEventListener('DOMContentLoaded', () => {
    const picker = document.createElement('div');
    picker.className = 'layout-picker';
    picker.setAttribute('role', 'group');
    picker.setAttribute('aria-label', '切换器尺寸比较');
    picker.innerHTML = '<button type="button" data-size="dia" title="942 × 190，来自本机 Dia 截图测量">Dia 实测尺寸</button><button type="button" data-size="compact" title="744 × 140，保留上一版">原尺寸</button>';
    const dock = document.querySelector('.pairing-dock');
    if (dock) {
      picker.addEventListener('pointerdown', event => event.preventDefault());
      dock.append(picker);
    } else document.querySelector('.page-header').after(picker);
    picker.querySelectorAll('[data-size]').forEach(button => {
      button.addEventListener('click', () => apply(button.dataset.size));
    });
    apply(size);
  });
  return {syncLinks};
})();
