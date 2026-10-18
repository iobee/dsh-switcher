'use strict';
(() => {
  const root=document.documentElement;
  const choices=[['original','原版'],['mist','A · 轻雾'],['focus','B · 标题在上'],['compact','C · 紧凑']];
  const picker=document.createElement('nav');
  picker.className='finish-picker';picker.setAttribute('aria-label','原型样式比较');
  const query=new URLSearchParams(location.search).get('finish');
  const initial=choices.some(([key])=>key===query)?query:'focus';
  for(const [key,label] of choices){
    const button=document.createElement('button');button.type='button';button.dataset.finish=key;button.textContent=label;
    button.addEventListener('click',()=>apply(key));picker.append(button);
  }
  picker.addEventListener('pointerdown',event=>event.preventDefault());
  document.body.append(picker);
  function apply(value){
    root.dataset.finish=value;
    picker.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.finish===value)));
    const url=new URL(location.href);url.searchParams.set('finish',value);history.replaceState(null,'',url);
  }
  apply(initial);
})();
