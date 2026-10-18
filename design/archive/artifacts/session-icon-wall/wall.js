'use strict';
(() => {
  const concepts=[
    ['三段弧','三段短弧伸展、收拢，沿同一轮廓流动。'],
    ['彗尾','一个清晰的前端，带着逐渐变淡的弧线移动。'],
    ['双弧','两段留白更大的弧线，相互追随。'],
    ['内外环','内外两条轨道反向流动，密度保持轻。'],
    ['卫星','外圈安定，只有一个小点沿轨道运行。'],
    ['四刻','四个短刻度连续换位，用疏密区分前后。'],
    ['三点环','三点沿小轨道流动，整体轻微收拢。'],
    ['游点','三个点从左向右穿过，出入时自然隐去。'],
    ['点列','位置基本不动，光感从左向右传递。'],
    ['短流','一截短线沿淡淡的基线移动，循环不代表进度。'],
    ['五拍','五根细线错开起伏，控制幅度与节奏。'],
    ['交错','两条短线错开往返，保持水平与克制。'],
    ['括弧','两侧弧线稳定在位，中间的小点往返。'],
    ['取景','固定的四个角，内部细线缓缓扫描。'],
    ['四折','四段折线构成有缺口的菱形，缓慢转动。'],
    ['旋叶','三片短弧交叠，像一枚轻巧的机械结构。'],
    ['三瓣','相连的三个环缓慢游动，轮廓更有记忆点。'],
    ['回环','连续的两条曲线交汇，从同一轮廓中穿过。'],
    ['双波','两条低振幅曲线平移，起伏不扩张到标题。'],
    ['回声','短弧向外散开，始终停留在图标边界内。'],
    ['叠页','文件轮廓固定，内部两笔交替延展。'],
    ['会话','保留旧版会话轮廓，三个小点在内部接续。'],
    ['双翼','上下两道曲线轻微开合，中心点缓缓滑过。'],
    ['光标','两个括号保持稳定，中间的一笔明暗交替。']
  ];
  const root=document.documentElement,wall=document.querySelector('#icon-wall');
  const params=new URLSearchParams(location.search);
  let selected=Math.min(24,Math.max(1,Math.floor(Number(params.get('icon')))||1)),state='running',paused=false,mono=false;
  const wallIcons=[],previewIcons=[];
  concepts.forEach(([name],index)=>{
    const id=index+1,button=document.createElement('button');button.type='button';button.className='icon-choice';button.dataset.icon=String(id);button.setAttribute('aria-label',`${String(id).padStart(2,'0')} ${name}，查看会话效果`);button.setAttribute('aria-pressed',String(id===selected));
    button.innerHTML=`<span class="choice-meta"><span class="choice-number">${String(id).padStart(2,'0')}</span><span>${name}${id===1?' · 原版':''}</span></span><span class="choice-sample"><span class="wall-icon"></span><span class="sample-title">节点稳定性</span></span>`;
    wall.append(button);wallIcons.push(IconWallMotion.mount(button.querySelector('.wall-icon'),id,state));
    button.addEventListener('click',()=>select(id));
  });
  document.querySelectorAll('[data-preview-state]').forEach(card=>previewIcons.push({state:card.dataset.previewState,icon:IconWallMotion.mount(card.querySelector('.preview-icon'),selected,card.dataset.previewState)}));
  function select(id){
    selected=id;document.querySelectorAll('.icon-choice').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.icon)===id)));
    previewIcons.forEach(item=>item.icon.update(selected,item.state));
    document.querySelector('#chosen-name').textContent=`${String(id).padStart(2,'0')} · ${concepts[id-1][0]}`;
    document.querySelector('#chosen-note').textContent=concepts[id-1][1];
    const url=new URL(location.href);url.searchParams.set('icon',String(id));history.replaceState(null,'',url);
  }
  document.querySelectorAll('.state-tabs [data-state]').forEach(button=>button.addEventListener('click',()=>{
    state=button.dataset.state;document.querySelectorAll('.state-tabs [data-state]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    wallIcons.forEach((icon,index)=>icon.update(index+1,state));
  }));
  document.querySelector('#freeze').addEventListener('click',event=>{paused=!paused;IconWallMotion.setPaused(paused);event.currentTarget.setAttribute('aria-pressed',String(paused));event.currentTarget.textContent=paused?'播放':'暂停';});
  document.querySelector('#mono').addEventListener('click',event=>{mono=!mono;root.dataset.mono=String(mono);event.currentTarget.setAttribute('aria-pressed',String(mono));});
  function reflectTheme(){const light=root.dataset.theme==='light',button=document.querySelector('#theme');button.textContent=light?'深色':'浅色';button.setAttribute('aria-label',light?'切换到深色':'切换到浅色');}
  document.querySelector('#theme').addEventListener('click',()=>{root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';const url=new URL(location.href);url.searchParams.set('theme',root.dataset.theme);history.replaceState(null,'',url);reflectTheme();});
  wall.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    const target=event.target.closest('[data-icon]');if(!target)return;
    const count=getComputedStyle(wall).gridTemplateColumns.split(' ').length,delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-count,ArrowDown:count}[event.key];
    const next=Math.max(1,Math.min(24,Number(target.dataset.icon)+delta));event.preventDefault();select(next);wall.querySelector(`[data-icon="${next}"]`).focus();
  });
  select(selected);reflectTheme();
})();
