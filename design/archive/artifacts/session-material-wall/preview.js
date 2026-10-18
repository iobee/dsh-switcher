'use strict';
(() => {
  const root=document.documentElement, surface=document.querySelector('.signal-overlay');
  surface.classList.add('material-surface');
  const params=new URLSearchParams(location.search),likedOnly=params.get('view')==='liked';
  const dock=document.createElement('nav');dock.className='variant-dock';dock.setAttribute('aria-label','原型材质切换');
  dock.innerHTML='<button type="button" data-step="-1">上一款</button><span id="variant-name"></span><span class="variant-position"></span><button type="button" data-step="1">下一款</button>';
  dock.addEventListener('pointerdown',e=>e.preventDefault());document.body.append(dock);
  let selected=MaterialConcepts.some(v=>v[0]===params.get('material'))?params.get('material'):'01',lastIndex=0;
  const like=MaterialLikes.createButton(selected);dock.insertBefore(like,dock.lastElementChild);
  const pool=()=>likedOnly?MaterialLikes.ids():MaterialConcepts.map(item=>item[0]);
  function syncLink(){const suffix=likedOnly?'&view=liked':'';const link=document.querySelector('#material-wall-link');link.href='index.html?material='+selected+'&theme='+root.dataset.theme+suffix;link.textContent=likedOnly?'返回喜欢的方向':'24 款方向墙';}
  function fit(){surface.querySelectorAll('.signal-body').forEach(body=>{const excerpt=body.querySelector('.signal-excerpt'),style=getComputedStyle(body),line=parseFloat(getComputedStyle(excerpt).lineHeight);const available=body.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);excerpt.style.setProperty('-webkit-line-clamp',String(Math.max(1,Math.min(4,Math.floor((available+.2)/line)))));});}
  function apply(id){
    selected=id;const [,name]=MaterialConcepts.find(item=>item[0]===id),ids=pool();lastIndex=Math.max(0,ids.indexOf(id));
    surface.dataset.materialId=id;root.dataset.materialId=id;document.querySelector('#variant-name').textContent=id+' · '+name;
    dock.querySelector('.variant-position').textContent=likedOnly?(ids.length?`${lastIndex+1} / ${ids.length} 喜欢`:'暂无喜欢'):'';
    dock.querySelectorAll('[data-step]').forEach(button=>button.disabled=ids.length<2);
    MaterialLikes.refreshButton(like,id);const url=new URL(location.href);url.searchParams.set('material',id);url.searchParams.set('theme',root.dataset.theme);history.replaceState(null,'',url);syncLink();requestAnimationFrame(fit);
  }
  dock.querySelectorAll('[data-step]').forEach(button=>button.addEventListener('click',()=>{const ids=pool();if(!ids.length)return;apply(ids[(lastIndex+Number(button.dataset.step)+ids.length)%ids.length]);}));
  MaterialLikes.subscribe(()=>{const ids=pool();apply(likedOnly&&ids.length&&!ids.includes(selected)?ids[Math.min(lastIndex,ids.length-1)]:selected);});
  if(likedOnly&&pool().length&&!pool().includes(selected))selected=pool()[0];apply(selected);
  new MutationObserver(()=>apply(selected)).observe(root,{attributes:true,attributeFilter:['data-theme']});
})();
