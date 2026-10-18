'use strict';

(() => {
  const variants = [
    { id: 'drift', label: 'A · 游点', description: '去掉边界，点与短尾迹沿着文字栏流动。' },
    { id: 'line', label: 'B · 细流', description: '把内容间的细分隔，变成流动的状态。' },
    { id: 'relay', label: 'C · 点列', description: '点留在原位，一束亮度从左向右经过。' }
  ];
  const picker = document.createElement('aside');
  picker.className = 'integration-picker';
  picker.setAttribute('aria-label', '运行状态设计对比，仅用于原型');
  picker.innerHTML = `<div class="integration-options" role="group" aria-label="选择融入方式">${variants.map(v => `<button class="integration-choice" data-integration-choice="${v.id}" aria-pressed="false">${v.label}</button>`).join('')}</div><p class="integration-description" aria-live="polite"></p>`;
  picker.hidden = true; document.body.append(picker);
  document.querySelector('.lab-title').textContent = '会话切换 · 点列保留版';
  function select(id) {
    const variant = variants.find(v => v.id === id) || variants[1];
    SessionSignal.setVariant(variant.id);
    picker.querySelectorAll('[data-integration-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.integrationChoice === variant.id));
    });
    picker.querySelector('.integration-description').textContent = variant.description;
    const url = new URL(location.href);
    url.searchParams.set('integration', variant.id);
    history.replaceState(null, '', url);
    if (document.querySelector('.signal-overlay').hidden) document.querySelector('#signal-launch').click();
  }
  picker.addEventListener('pointerdown', event => event.preventDefault());
  picker.addEventListener('click', event => {
    const button = event.target.closest('[data-integration-choice]');
    if (button) select(button.dataset.integrationChoice);
  });
  select('relay');
})();
