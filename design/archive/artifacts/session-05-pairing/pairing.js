'use strict';
(() => {
  const sessions=[
    ['idle',true,'想把高频操作连起来，尽量让双手留在键盘上。','打磨键盘导航体验','有草稿'],
    ['running',false,'延迟很低但只稳定一小会儿的节点，不要急着切过去。','节点稳定性与切换策略','运行中'],
    ['idle',false,'上下移动的时候，先不要直接切换会话。','左侧栏的焦点与候选状态','空闲'],
    ['approval',false,'把插件的接入边界梳理一下。','DSH 插件接入方案','等待确认'],
    ['unread',false,'打开就能写，历史记录也要容易找到。','一念 · 快速记录交互','有新回复']
  ];
  const modes={original:['05','base','05 · 原版','原 05 暗色：细框较明显，卡面与选中底色的层次较弱。'],raised:['05','raised','05 · 轻浮','保留 05 的轮廓，借用 07 的卡面亮度，阴影收得更轻。'],reference:['07','base','07 · 参考','原 07 暗色：外侧阴影更展开，轮廓也稍圆一点。']};
  const lists=[...document.querySelectorAll('.signal-list')],icons=[];
  let candidate=1;
  function select(index){candidate=(index+sessions.length)%sessions.length;lists.forEach(list=>{[...list.children].forEach((c,i)=>c.setAttribute('aria-selected',String(i===candidate)));const card=list.children[candidate].getBoundingClientRect(),r=list.getBoundingClientRect();if(card.left<r.left)list.scrollLeft+=card.left-r.left;else if(card.right>r.right)list.scrollLeft+=card.right-r.right;});}
  lists.forEach(list=>{
    list.innerHTML=sessions.map(([kind,draft,excerpt,title,label],i)=>`<li class="signal-card" role="option" data-index="${i}" data-status="${kind}" aria-selected="${i===candidate}" aria-label="${title}，${label}"><div class="signal-body"><span class="signal-excerpt">${excerpt}</span></div><div class="signal-foot"><span class="signal-symbol"></span><span class="signal-title" title="${title}">${title}</span></div></li>`).join('');
    [...list.children].forEach((card,i)=>icons.push(SessionSignal.mount(card.querySelector('.signal-symbol'),sessions[i][0],sessions[i][1])));
    list.addEventListener('click',event=>{const card=event.target.closest('[data-index]');if(card)select(Number(card.dataset.index));});
    list.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();select(candidate+(event.key==='ArrowRight'?1:-1));}});
  });
  function setMode(mode){if(!modes[mode])mode='raised';const [id,refinement,name,note]=modes[mode],surface=document.querySelector('#dark-surface');surface.dataset.materialId=id;surface.dataset.refinement=refinement;document.querySelector('#dark-name').textContent=name;document.querySelector('#mode-note').textContent=note;document.querySelector('#dark-trial').href=`preview.html?mode=${mode}&theme=dark`;document.querySelectorAll('[data-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===mode)));const url=new URL(location.href);url.searchParams.set('mode',mode);history.replaceState(null,'',url);SessionLayout.syncLinks();}
  document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.mode)));
  document.addEventListener('visibilitychange',()=>SessionSignal.setVisible(!document.hidden));
  window.addEventListener('pagehide',event=>{if(!event.persisted)icons.forEach(icon=>icon.destroy());});
  window.addEventListener('pageshow',()=>SessionSignal.setVisible(!document.hidden));
  setMode(new URLSearchParams(location.search).get('mode'));
})();
