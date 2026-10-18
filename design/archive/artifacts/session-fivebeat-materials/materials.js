'use strict';
(() => {
  const root = document.documentElement;
  const choices = [['porcelain', 'A · 柔白'], ['frost', 'B · 透光'], ['inset', 'C · 内嵌']];
  const picker = document.createElement('nav');
  picker.className = 'material-picker';
  picker.setAttribute('aria-label', '原型卡片材质比较');
  for (const [value, label] of choices) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.surface = value;
    button.textContent = label;
    button.addEventListener('click', () => apply(value));
    picker.append(button);
  }
  picker.addEventListener('pointerdown', event => event.preventDefault());
  document.body.append(picker);
  function apply(value) {
    root.dataset.surface = value;
    picker.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.surface === value)));
    const url = new URL(location.href);
    url.searchParams.set('surface', value);
    history.replaceState(null, '', url);
  }
  const requested = new URLSearchParams(location.search).get('surface');
  apply(choices.some(([value]) => value === requested) ? requested : 'frost');
})();
