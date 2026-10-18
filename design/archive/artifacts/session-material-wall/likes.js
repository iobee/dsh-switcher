'use strict';
window.MaterialLikes = (() => {
  const key = 'dsh.session-material-wall.likes.v1';
  const valid = new Set(MaterialConcepts.map(item => item[0]));
  const subscribers = new Set();
  let liked = new Set();
  const heart = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 5.8a5.2 5.2 0 0 0-7.4 0l-.8.8-.8-.8a5.2 5.2 0 0 0-7.4 7.4L12 21l8.2-7.8a5.2 5.2 0 0 0 0-7.4Z"/></svg>';

  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return new Set(Array.isArray(value) ? value.filter(id => valid.has(id)) : []);
    } catch { return liked; }
  }
  function ids() { return MaterialConcepts.map(item => item[0]).filter(id => liked.has(id)); }
  function refreshButton(button, id = button.dataset.like) {
    const concept = MaterialConcepts.find(item => item[0] === id);
    if (!concept) return;
    button.dataset.like = id;
    button.setAttribute('aria-pressed', String(liked.has(id)));
    button.setAttribute('aria-label', `${liked.has(id) ? '取消喜欢' : '喜欢'} ${id} ${concept[1]}`);
    button.title = `${liked.has(id) ? '取消喜欢' : '喜欢'} ${id} · ${concept[1]}`;
    button.innerHTML = heart + `<span>${liked.has(id) ? 'Liked' : 'Like'}</span>`;
  }
  function notify() {
    document.querySelectorAll('[data-like]').forEach(button => refreshButton(button));
    subscribers.forEach(callback => callback(ids()));
  }
  function toggle(id) {
    if (!valid.has(id)) return;
    liked = read();
    if (liked.has(id)) liked.delete(id); else liked.add(id);
    let saved = true;
    try { localStorage.setItem(key, JSON.stringify(ids())); } catch { saved = false; }
    notify();
    const feedback = document.querySelector('#like-feedback');
    if (feedback) feedback.textContent = `${liked.has(id) ? '已喜欢' : '已取消喜欢'} ${id}，共 ${liked.size} 款${saved ? '' : '；当前浏览器无法保存，暂时保留在本页'}`;
  }
  function createButton(id) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'like-button';
    refreshButton(button, id);
    button.addEventListener('click', () => toggle(button.dataset.like));
    return button;
  }
  liked = read();
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) { liked = read(); notify(); }
  });
  window.addEventListener('pageshow', () => { liked = read(); notify(); });
  return { ids, has: id => liked.has(id), toggle, createButton, refreshButton,
    subscribe(callback) { subscribers.add(callback); return () => subscribers.delete(callback); } };
})();
