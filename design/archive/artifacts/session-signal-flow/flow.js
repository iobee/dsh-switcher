'use strict';

// Four real-size motion alternatives, on the same accepted layout.
(() => {
  const variants = [
    { id: 'pass', label: 'A · 掠过', description: '三颗点依次从左向右掠过，轻轻淡出。' },
    { id: 'relay', label: 'B · 接力', description: '三颗点留在原位，亮度从左向右接力。' },
    { id: 'ribbon', label: 'C · 流线', description: '点在移动中拉成短线，再收回成点。' },
    { id: 'merge', label: 'D · 汇合', description: '三颗点向中间汇合，合成一颗再向右离开。' }
  ];
  const picker = document.createElement('aside');
  picker.className = 'flow-picker';
  picker.setAttribute('aria-label', '动效方案对比，仅用于设计演示');
  picker.innerHTML = `<div class="flow-options" role="group" aria-label="选择动效方案">${variants.map(v => `<button class="flow-choice" data-flow-variant="${v.id}" aria-pressed="false"><span class="flow-icon" aria-hidden="true"></span><span class="flow-label">${v.label}</span></button>`).join('')}</div><p class="flow-description" aria-live="polite"></p>`;
  document.body.append(picker);
  document.querySelector('.lab-title').textContent = '会话切换 · 动效探索';
  const choices = picker.querySelectorAll('[data-flow-variant]');
  choices.forEach(button => SessionSignal.mount(button.querySelector('.flow-icon'), 'running', false, { variant: button.dataset.flowVariant, preview: true }));
  function select(id) {
    const variant = variants.find(v => v.id === id) || variants[0];
    SessionSignal.setVariant(variant.id);
    document.documentElement.dataset.flowVariant = variant.id;
    choices.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.flowVariant === variant.id)));
    picker.querySelector('.flow-description').textContent = variant.description;
    const nextURL = new URL(location.href);
    nextURL.searchParams.set('motion', variant.id);
    history.replaceState(null, '', nextURL);
    if (document.querySelector('.signal-overlay').hidden) document.querySelector('#signal-launch').click();
  }
  picker.addEventListener('pointerdown', event => event.preventDefault());
  picker.addEventListener('click', event => {
    const button = event.target.closest('[data-flow-variant]');
    if (button) select(button.dataset.flowVariant);
  });
  select(new URLSearchParams(location.search).get('motion') || 'pass');
})();
