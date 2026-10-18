'use strict';
(() => {
  const root=document.documentElement,surface=document.querySelector('.signal-overlay');surface.classList.add('material-surface');
  const modes={original:['05','base'],raised:['05','raised'],reference:['07','base']};
  let mode=new URLSearchParams(location.search).get('mode');if(!modes[mode])mode='raised';
  const dock=document.createElement('nav');dock.className='pairing-dock';dock.setAttribute('aria-label','材质方案比较');
  dock.innerHTML='<button type="button" data-mode="original">05 原版</button><button type="button" data-mode="raised">05 轻浮</button><button type="button" data-mode="reference">07 参考</button>';
  dock.addEventListener('pointerdown',event=>event.preventDefault());document.body.append(dock);
  function apply(next){mode=next;const [id,refinement]=modes[mode];surface.dataset.materialId=id;surface.dataset.refinement=refinement;dock.querySelectorAll('[data-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===mode)));const link=document.querySelector('#material-wall-link');link.textContent='05 明暗搭配';link.href='index.html?mode='+mode;const url=new URL(location.href);url.searchParams.set('mode',mode);url.searchParams.set('theme',root.dataset.theme);url.searchParams.delete('material');history.replaceState(null,'',url);SessionLayout.syncLinks();}
  dock.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>apply(button.dataset.mode)));
  new MutationObserver(()=>apply(mode)).observe(root,{attributes:true,attributeFilter:['data-theme']});
  apply(mode);
})();
