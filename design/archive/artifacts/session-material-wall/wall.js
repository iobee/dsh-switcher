'use strict';
(() => {
  const root=document.documentElement,params=new URLSearchParams(location.search);
  const choices=MaterialConcepts,near=document.querySelector('#near-wall'),far=document.querySelector('#far-wall');
  const context=document.querySelector('#context-surface'),list=document.querySelector('#context-list');
  const sessions=[
    ['idle',true,'想把高频操作连起来，尽量让双手留在键盘上。','打磨键盘导航体验','有草稿'],
    ['running',false,'延迟很低但只稳定一小会儿的节点，不要急着切过去。','节点稳定性与切换策略','运行中'],
    ['idle',false,'上下移动的时候，先不要直接切换会话。','左侧栏的焦点与候选状态','空闲'],
    ['approval',false,'把插件的接入边界梳理一下。','DSH 插件接入方案','等待确认'],
    ['unread',false,'打开就能写，历史记录也要容易找到。','一念 · 快速记录交互','有新回复']
  ];
  const mounted=new Map();let selected=choices.some(v=>v[0]===params.get('material'))?params.get('material'):'01',candidate=1,paused=false,view=params.get('view')==='liked'?'liked':'all';
  const likedSection=document.querySelector('#liked-section'),likedList=document.querySelector('#liked-list');
  const currentLike=MaterialLikes.createButton(selected);document.querySelector('#current-like').append(currentLike);
  function cardMarkup(session,index,tag='li'){
    const [kind,draft,excerpt,title,label]=session;
    return `<${tag} class="signal-card" data-status="${kind}" data-session-index="${index}" ${tag==='li'?`role="option" aria-selected="${index===candidate}" aria-label="${title}，${label}"`:'aria-hidden="true"'}><span class="signal-body"><span class="signal-excerpt">${excerpt}</span></span><span class="signal-foot"><span class="signal-symbol" data-motion="${kind}" data-draft="${draft}"></span><span class="signal-title" title="${title}">${title}</span></span></${tag}>`;
  }
  list.innerHTML=sessions.map((s,i)=>cardMarkup(s,i)).join('');
  function mount(host){if(!mounted.has(host))mounted.set(host,SessionSignal.mount(host,host.dataset.motion,host.dataset.draft==='true'));}
  list.querySelectorAll('[data-motion]').forEach(mount);
  choices.forEach(([id,name,note],index)=>{
    const tile=document.createElement('article');tile.className='material-tile';
    const button=document.createElement('button');button.type='button';button.className='material-choice';button.dataset.choice=id;button.setAttribute('aria-label',`${id} ${name}，${note}`);button.setAttribute('aria-pressed','false');
    button.innerHTML=`<span class="choice-meta"><span class="choice-number">${id}</span><span>${name}${id==='01'?' · A':''}</span></span><span class="choice-canvas"><span class="signal-overlay material-surface sample-host" data-material-id="${id}"><span class="signal-panel"><span class="signal-list">${cardMarkup(sessions[1],1,'span')}</span></span></span></span><span class="choice-caption">${note}</span>`;
    tile.append(button,MaterialLikes.createButton(id));(index<10?near:far).append(tile);button.addEventListener('click',()=>select(id));
  });
  function unmount(host){if(mounted.has(host)){mounted.get(host).destroy();mounted.delete(host);}}
  const visibility=new IntersectionObserver(entries=>{entries.forEach(({target,isIntersecting})=>{target.querySelectorAll('[data-motion]').forEach(host=>isIntersecting?mount(host):unmount(host));});},{rootMargin:'60px'});
  document.querySelectorAll('.material-choice').forEach(b=>visibility.observe(b));
  function previewURL(id,liked=false){return `preview.html?material=${id}&theme=${root.dataset.theme}${liked?'&view=liked':''}`;}
  function syncURL(){const url=new URL(location.href);url.searchParams.set('material',selected);url.searchParams.set('theme',root.dataset.theme);if(view==='liked')url.searchParams.set('view','liked');else url.searchParams.delete('view');history.replaceState(null,'',url);document.querySelector('#full-preview').href=previewURL(selected);document.querySelectorAll('[data-compare-link]').forEach(link=>link.href=previewURL(link.dataset.compareLink,true));}
  function select(id){selected=id;const [,,note]=choices.find(v=>v[0]===id);context.dataset.materialId=id;document.querySelectorAll('[data-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.choice===id)));document.querySelector('#chosen-name').textContent=id+' · '+choices.find(v=>v[0]===id)[1];document.querySelector('#chosen-note').textContent=note;MaterialLikes.refreshButton(currentLike,id);syncURL();fitExcerpts();}
  function selectCandidate(index){
    candidate=(index+sessions.length)%sessions.length;
    [list,...likedList.querySelectorAll('.comparison-list')].forEach(target=>{
      target.querySelectorAll('.signal-card').forEach((c,i)=>c.setAttribute('aria-selected',String(i===candidate)));
      const card=target.children[candidate],r=card.getBoundingClientRect(),bounds=target.getBoundingClientRect();
      if(r.left<bounds.left)target.scrollLeft+=r.left-bounds.left;
      else if(r.right>bounds.right)target.scrollLeft+=r.right-bounds.right;
    });
  }
  function bindList(target){target.addEventListener('click',e=>{const card=e.target.closest('[data-session-index]');if(card)selectCandidate(Number(card.dataset.sessionIndex));});target.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();selectCandidate(candidate+(e.key==='ArrowRight'?1:-1));}});}
  bindList(list);
  function fitExcerpts(){document.querySelectorAll('.signal-body').forEach(body=>{if(!body.clientHeight)return;const excerpt=body.querySelector('.signal-excerpt'),style=getComputedStyle(body),line=parseFloat(getComputedStyle(excerpt).lineHeight);const available=body.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);excerpt.style.webkitLineClamp=String(Math.max(1,Math.min(4,Math.floor((available+.2)/line))));});}
  function clearComparison(){likedList.querySelectorAll('.comparison-item').forEach(item=>{visibility.unobserve(item);item.querySelectorAll('[data-motion]').forEach(unmount);resize.unobserve(item.querySelector('.comparison-list'));});likedList.replaceChildren();}
  function renderComparison(){
    const focused=likedSection.contains(document.activeElement)?document.activeElement.dataset.like:null;
    const oldIndex=Array.from(likedList.children).findIndex(item=>item.dataset.comparison===focused);
    clearComparison();const ids=MaterialLikes.ids();document.querySelector('#likes-empty').hidden=ids.length>0;
    ids.forEach(id=>{
      const [,name,note]=choices.find(item=>item[0]===id),item=document.createElement('article');item.className='comparison-item';item.dataset.comparison=id;
      item.innerHTML=`<div class="comparison-heading"><div class="comparison-description"><h3>${id} · ${name}</h3><p>${note}</p></div><div class="comparison-actions"><a data-compare-link="${id}" href="${previewURL(id,true)}">试用喜欢的款式 ↗</a></div></div><div class="comparison-stage"><div class="signal-overlay material-surface comparison-surface" data-material-id="${id}"><div class="signal-panel"><ul class="signal-list comparison-list" role="listbox" tabindex="0" aria-label="${id} ${name}的会话预览">${sessions.map((s,i)=>cardMarkup(s,i)).join('')}</ul></div></div></div>`;
      item.querySelector('.comparison-actions').prepend(MaterialLikes.createButton(id));likedList.append(item);visibility.observe(item);const target=item.querySelector('.comparison-list');bindList(target);resize.observe(target);
    });
    requestAnimationFrame(()=>{fitExcerpts();selectCandidate(candidate);});
    if(focused){const next=ids[Math.max(0,Math.min(oldIndex,ids.length-1))];const button=next?likedList.querySelector(`[data-like="${next}"]`):document.querySelector('[data-show-all]');button.focus({preventScroll:true});}
  }
  function updateCounts(){document.querySelectorAll('[data-like-count]').forEach(node=>node.textContent=String(MaterialLikes.ids().length));}
  function setView(next,scroll=true){
    view=next;root.dataset.view=view;document.querySelector('.context').hidden=view==='liked';document.querySelectorAll('.concept-group,.group-jumps,#selection').forEach(node=>node.hidden=view==='liked');likedSection.hidden=view!=='liked';document.querySelector('#view-all').setAttribute('aria-pressed',String(view==='all'));document.querySelector('#view-liked').setAttribute('aria-pressed',String(view==='liked'));
    list.querySelectorAll('[data-motion]').forEach(host=>view==='liked'?unmount(host):mount(host));
    if(view==='liked')renderComparison();else{clearComparison();requestAnimationFrame(fitExcerpts);}
    syncURL();if(scroll)document.querySelector('.wall-header').scrollIntoView({block:'start'});
  }
  document.querySelector('#view-all').addEventListener('click',()=>setView('all'));
  document.querySelector('#view-liked').addEventListener('click',()=>setView('liked'));
  document.querySelectorAll('[data-show-liked]').forEach(button=>button.addEventListener('click',()=>setView('liked')));
  document.querySelectorAll('[data-show-all]').forEach(button=>button.addEventListener('click',()=>setView('all')));
  MaterialLikes.subscribe(()=>{updateCounts();if(view==='liked')renderComparison();});
  document.querySelector('#selection').addEventListener('click',e=>{const show=e.currentTarget.getAttribute('aria-pressed')!=='true';e.currentTarget.setAttribute('aria-pressed',String(show));e.currentTarget.textContent=show?'展示普通态':'展示选中态';document.querySelectorAll('.sample-host .signal-card').forEach(c=>c.setAttribute('aria-selected',String(show)));});
  document.querySelector('#freeze').addEventListener('click',e=>{paused=!paused;root.dataset.signalStatic=String(paused);e.currentTarget.setAttribute('aria-pressed',String(paused));e.currentTarget.textContent=paused?'播放动效':'暂停动效';SessionSignal.redraw();});
  function themeLabel(){const b=document.querySelector('#theme');b.textContent=root.dataset.theme==='light'?'深色':'浅色';b.setAttribute('aria-label',`切换到${b.textContent}`);}
  document.querySelector('#theme').addEventListener('click',()=>{root.dataset.theme=root.dataset.theme==='light'?'dark':'light';themeLabel();syncURL();});
  [near,far].forEach(grid=>grid.addEventListener('keydown',e=>{const b=e.target.closest('[data-choice]');if(!b||!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'].includes(e.key))return;const cols=getComputedStyle(grid).gridTemplateColumns.split(' ').length,delta={ArrowRight:1,ArrowLeft:-1,ArrowDown:cols,ArrowUp:-cols}[e.key],index=choices.findIndex(v=>v[0]===b.dataset.choice),next=choices[Math.max(0,Math.min(choices.length-1,index+delta))][0];e.preventDefault();select(next);document.querySelector(`[data-choice="${next}"]`).focus({preventScroll:true});document.querySelector(`[data-choice="${next}"]`).scrollIntoView({block:'nearest'});}));
  const resize=new ResizeObserver(fitExcerpts);resize.observe(list);
  document.addEventListener('visibilitychange',()=>SessionSignal.setVisible(!document.hidden));
  window.addEventListener('pagehide',event=>{if(event.persisted)return;visibility.disconnect();mounted.forEach(icon=>icon.destroy());mounted.clear();});
  window.addEventListener('pageshow',()=>SessionSignal.setVisible(!document.hidden));
  updateCounts();select(selected);themeLabel();setView(view,false);
})();
