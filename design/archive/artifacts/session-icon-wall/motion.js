'use strict';

// Extends the preserved session-signal path family. 01 keeps its original running pose.
// These are indeterminate activity studies, never progress estimates or task phases.
window.IconWallMotion = (() => {
  const NS = 'http://www.w3.org/2000/svg', N = 24, SLOT_COUNT = 8, TAU = Math.PI * 2;
  const items = new Set(), reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, previous = 0, paused = false, pauseAt = 0, skipped = 0;
  const start = performance.now();
  const rad = n => n * Math.PI / 180;
  const path = (fn, alpha = 1, width = 1.9) => ({ points: Array.from({ length: N }, (_, i) => fn(i / (N - 1))), alpha, width });
  const arc = (a,b,r,alpha=1,cx=16,cy=16,width=1.9) => path(u => [cx + Math.cos(a+(b-a)*u)*r,cy+Math.sin(a+(b-a)*u)*r],alpha,width);
  const line = (x1,y1,x2,y2,alpha=1,width=1.9) => path(u => [x1+(x2-x1)*u,y1+(y2-y1)*u],alpha,width);
  const dot = (x,y,alpha=1,width=3) => line(x,y,x+.001,y,alpha,width);
  const hidden = () => dot(16,16,0);
  const poly = (vertices,alpha=1,width=1.9) => {
    const lengths=vertices.slice(1).map((v,i)=>Math.hypot(v[0]-vertices[i][0],v[1]-vertices[i][1]));
    const total=lengths.reduce((a,b)=>a+b,0);
    return path(u=>{let remaining=u*total,index=0;while(index<lengths.length-1&&remaining>lengths[index])remaining-=lengths[index++];const k=remaining/lengths[index];return vertices[index].map((v,axis)=>v+(vertices[index+1][axis]-v)*k);},alpha,width);
  };
  const ellipse = (rx,ry,angle=0,alpha=1,cx=16,cy=16) => path(u=>{const a=u*TAU,x=Math.cos(a)*rx,y=Math.sin(a)*ry;return[cx+x*Math.cos(angle)-y*Math.sin(angle),cy+x*Math.sin(angle)+y*Math.cos(angle)];},alpha);
  const box = (x,y,w,h,alpha=.65) => path(u=>{const a=u*TAU,xx=Math.cos(a),yy=Math.sin(a);return[x+w/2+Math.sign(xx)*Math.pow(Math.abs(xx),.36)*w/2,y+h/2+Math.sign(yy)*Math.pow(Math.abs(yy),.36)*h/2];},alpha,1.65);
  const rotate = (shapes,a) => shapes.map(s=>({...s,points:s.points.map(([x,y])=>[16+(x-16)*Math.cos(a)-(y-16)*Math.sin(a),16+(x-16)*Math.sin(a)+(y-16)*Math.cos(a)])}));
  const fill = shapes => Array.from({length:SLOT_COUNT},(_,i)=>shapes[i]||hidden());
  const bubble = alpha => [arc(rad(90),rad(270),10,alpha),path(u=>{if(u<.72){const a=rad(-90+144*u/.72);return[16+Math.cos(a)*10,16+Math.sin(a)*10];}if(u<.87){const v=(u-.72)/.15;return[21.88+2.12*v,24.09+3.11*v];}const v=(u-.87)/.13;return[24-8*v,27.2-1.2*v];},alpha)];
  const flank = (breath=0) => [arc(rad(112+10*breath),rad(248-10*breath),10.3,.65,16-.4*breath),arc(rad(-68+10*breath),rad(68-10*breath),10.3,.65,16+.4*breath)];
  const corners = (offset=0) => [poly([[7,12],[7,8],[12,8]],.6),poly([[20,8],[25,8],[25,12]],.6),poly([[25,20],[25,24],[20,24]],.6),poly([[12,24],[7,24],[7,20]],.6)].map(s=>({...s,points:s.points.map(([x,y])=>[x+(x<16?-offset:offset),y+(y<16?-offset:offset)])}));
  const petals = (t=0,alpha=.8) => [0,1,2].map(i=>path(u=>{const a=u*TAU+i*TAU/3+t*.15,r=7+3*Math.cos(u*TAU);return[16+Math.cos(a)*r,16+Math.sin(a)*r];},alpha*(1-i*.17),1.55));

  function running(id,t) {
    const a=t*1.15+.1*Math.sin(t*2.2),b=(1-Math.cos(t*TAU/3.4))*.5;
    switch(id){
      case 1:return [0,1,2].map(i=>{const s=a+i*TAU/3,len=15+73*(.5+.5*Math.sin(t*2.2+i*2.1));return arc(s,s+rad(len),10.8,[1,.68,.42][i]);});
      case 2:return [arc(a-.5,a+1.8,10,.27),arc(a+.6,a+1.8,10,.7),dot(16+Math.cos(a+1.8)*10,16+Math.sin(a+1.8)*10,1,3.2)];
      case 3:return [0,1].map(i=>arc(a+i*Math.PI,a+i*Math.PI+rad(105+25*Math.sin(t*1.5)),10.5,i?.48:1));
      case 4:return [arc(a,a+rad(172),10.5,.85),arc(-a+1,-a+rad(150)+1,6,.58)];
      case 5:return [arc(0,TAU,10.2,.32),dot(16+Math.cos(a)*10.2,16+Math.sin(a)*10.2,1,3),dot(16,16,.75,2.5)];
      case 6:return [0,1,2,3].map(i=>arc(a+i*TAU/4,a+i*TAU/4+rad(37),10.4,[1,.7,.4,.24][i],16,16,2));
      case 7:return [0,1,2].map(i=>{const ph=a+i*TAU/3,r=7.8+Math.sin(t*1.4)*1.2;return dot(16+Math.cos(ph)*r,16+Math.sin(ph)*r,[1,.65,.38][i],3.5);});
      case 8:return [0,1,2].map(i=>{const q=((t*.48-i*.16)%1+1)%1;return dot(4+24*q,16,Math.pow(Math.sin(Math.PI*q),.7),2.7);});
      case 9:return [0,1,2].map(i=>{const v=.5+.5*Math.sin(t*3-i*1.35);return line(8+i*8,16-.6*v,8+i*8,16+.6*v,.28+.72*v,3);});
      case 10:{const q=(t*.42)%1,x=6+20*q;return [line(6,16,26,16,.18,1.3),line(Math.max(6,x-5),16,x,16,.9,2.6)];}
      case 11:return [0,1,2,3,4].map(i=>{const h=2+8*Math.pow(.5+.5*Math.sin(t*2.4-i*.9),1.7);return line(7+i*4.5,16-h/2,7+i*4.5,16+h/2,.45+i*.12,2.4);});
      case 12:{const x=Math.sin(t*1.9)*3;return[line(7+x,12.5,19+x,12.5,.9,2.2),line(13-x,19.5,25-x,19.5,.5,2.2)];}
      case 13:return [...flank(.3+.3*Math.sin(t*1.8)),dot(16+4*Math.sin(t*1.7),16,.9,3)];
      case 14:return [...corners(),line(10,10+12*(.5+.5*Math.sin(t*1.6)),22,10+12*(.5+.5*Math.sin(t*1.6)),.95,1.8)];
      case 15:return rotate([poly([[6,14],[14,6]],.95),poly([[18,6],[26,14]],.65),poly([[26,18],[18,26]],.4),poly([[14,26],[6,18]],.25)],t*.55);
      case 16:return [0,1,2].map(i=>{const ph=a*.65+i*TAU/3;return arc(ph+1.9,ph+4.8,7,.94-i*.22,16+Math.cos(ph)*4,16+Math.sin(ph)*4,1.7);});
      case 17:return petals(t,.9);
      case 18:return [0,1].map(i=>path(u=>{const ph=u*TAU+i*Math.PI,wave=Math.sin(t*1.35+i*Math.PI);return[16+(8.5+.6*wave)*Math.sin(ph),16+(4.5+.8*wave)*Math.sin(ph*2+wave*.35+i*Math.PI/4)];},i?.4:.9,1.7));
      case 19:return [0,1].map(i=>path(u=>[5+22*u,14+i*5+2.8*Math.sin(u*TAU-t*2+i*1.2)],i?.35:.9,1.8));
      case 20:return [0,1,2].map(i=>{const q=(t*.24+i/3)%1;return arc(rad(35),rad(325),2+9*q,(1-q)*.9,16,16,1.9);});
      case 21:return [box(7,6,16,18,.3),box(10,9,15,17,.7),line(13,15,19+3*b,15,.9,1.6),line(13,20,18+3*(1-b),20,.55,1.6)];
      case 22:return [...bubble(.6),...[0,1,2].map(i=>dot(11+i*5,16,.25+.75*(.5+.5*Math.sin(t*2.8-i*1.1)),2.2))];
      case 23:return [path(u=>[6+20*u,16-6*Math.sin(u*Math.PI)*( .65+.18*Math.sin(t*1.9))],.9),path(u=>[6+20*u,16+6*Math.sin(u*Math.PI)*(.65+.18*Math.cos(t*1.9))],.45),dot(16+5*Math.sin(t*1.9),16,.8,2.6)];
      case 24:return [poly([[11,9],[5,16],[11,23]],.55,1.7),poly([[21,9],[27,16],[21,23]],.55,1.7),line(16,12,16,20,.35+.65*(.5+.5*Math.sin(t*2.5)),2)];
      default:return [];
    }
  }
  function resting(id,alpha=.6) {
    if(id===1||id===22)return bubble(alpha);
    if(id<=7)return [arc(rad(20),rad(160),10.3,alpha),arc(rad(200),rad(340),10.3,alpha)];
    if(id===8||id===9)return [dot(8,16,alpha*.6,2.6),dot(16,16,alpha,2.6),dot(24,16,alpha*.6,2.6)];
    if(id===10||id===12)return [line(6,13,26,13,alpha*.6,1.7),line(10,19,22,19,alpha,1.7)];
    if(id===11)return [0,1,2,3,4].map(i=>line(7+i*4.5,13,7+i*4.5,19,alpha,1.8));
    if(id===13)return flank();
    if(id===14)return corners();
    if(id===15)return [poly([[6,14],[14,6]],alpha),poly([[18,6],[26,14]],alpha),poly([[26,18],[18,26]],alpha),poly([[14,26],[6,18]],alpha)];
    if(id===16)return [arc(rad(105),rad(255),10,alpha),arc(rad(-75),rad(75),10,alpha)];
    if(id===17)return petals(0,alpha);
    if(id===18)return [ellipse(10,6,0,alpha),ellipse(6,10,0,alpha*.55)];
    if(id===19)return [path(u=>[5+22*u,16+3*Math.sin(u*TAU)],alpha,1.8)];
    if(id===20)return [arc(rad(35),rad(325),10,alpha),arc(rad(35),rad(325),6,alpha*.55)];
    if(id===21)return [box(7,6,16,18,.3),box(10,9,15,17,alpha)];
    if(id===23)return [path(u=>[6+20*u,16-5*Math.sin(u*Math.PI)],alpha),path(u=>[6+20*u,16+5*Math.sin(u*Math.PI)],alpha*.65)];
    return [poly([[11,9],[5,16],[11,23]],alpha,1.7),poly([[21,9],[27,16],[21,23]],alpha,1.7)];
  }
  function pose(id,state,seconds,still=false){
    const t=still?.65:seconds,breath=still?.5:(1-Math.cos(t*TAU/3.4))*.5;
    if(state==='running')return fill(running(id,t));
    if(state==='approval'){
      if(id===1){const shift=breath*.55,sweep=12*breath,half=still?3:1.5+2*breath;return fill([arc(rad(111+sweep),rad(249-sweep),10.3,.68,16-shift),arc(rad(-69+sweep),rad(69-sweep),10.3,.68,16+shift),line(13.7,16-half,13.7,16+half,.98,2.4),line(18.3,16-half,18.3,16+half,.98,2.4)]);}
      let outside;
      if(id===2)outside=[arc(rad(35),rad(285),10.4,.48),dot(16+Math.cos(rad(285))*10.4,16+Math.sin(rad(285))*10.4,.95,2.7)];
      else if(id===3)outside=[arc(rad(200),rad(340),10.5,.7),arc(rad(20),rad(160),10.5,.45)];
      else if(id===4)outside=[arc(rad(100),rad(265),11,.6),arc(rad(-60),rad(65),8.5,.6)];
      else if(id===5)outside=[arc(0,TAU,10.4,.38),dot(23.35,8.65,.9,2.9)];
      else if(id===6)outside=[0,1,2,3].map(i=>arc(rad(25)+i*TAU/4,rad(65)+i*TAU/4,10.5,.52));
      else if(id===7)outside=[dot(16,5.5,.8,2.6),dot(6.9,21.2,.45,2.6),dot(25.1,21.2,.6,2.6)];
      else if(id===8||id===9)outside=[dot(6,16,.5,2.4),dot(26,16,.5,2.4)];
      else if(id===10)outside=[line(5,16,9,16,.4,1.5),line(23,16,27,16,.4,1.5)];
      else if(id===11)outside=[line(6,14,6,18,.45,1.8),line(26,14,26,18,.45,1.8)];
      else if(id===12)outside=[line(6,11,12,11,.65,1.8),line(20,21,26,21,.45,1.8)];
      else if(id===13)outside=flank(breath);
      else if(id===16)outside=[0,1,2].map(i=>arc(rad(-8)+i*TAU/3,rad(70)+i*TAU/3,10.5,.68-i*.12));
      else if(id===20)outside=[arc(rad(35),rad(325),11,.5),arc(rad(125),rad(235),8,.3)];
      else if(id===14||id===15||id===21||id===22||id===24)outside=resting(id,.6);
      else if(id===17)outside=petals(0,.35);
      else if(id===18)outside=[ellipse(11,8,0,.4),ellipse(8,11,0,.25)];
      else outside=[path(u=>[5+22*u,12-2*Math.sin(u*Math.PI)],.5,1.6),path(u=>[5+22*u,20+2*Math.sin(u*Math.PI)],.5,1.6)];
      const half=2.7+.55*breath;
      return fill([...outside,line(13.7,16-half,13.7,16+half,.88+.12*breath,2.2),line(18.3,16-half,18.3,16+half,.88+.12*breath,2.2)]);
    }
    if(state==='unread'){
      if(id===1)return fill([arc(rad(7),Math.PI-.04,10.5,.78),arc(Math.PI+.04,TAU-rad(7),10.5,.78),dot(16,16,1,4.2)]);
      if(id>=8&&id<=12)return fill([dot(7,16,.25,2.3),line(12,16,19,16,.45,1.7),dot(25,16,1,3.7)]);
      const contour=resting(id,.5);
      return fill([...contour,dot(id===21?18:16,id===21?18:16,1,3.8)]);
    }
    if(state==='draft'){
      if(id===1)return fill([line(7,12.5,18.5,12.5,.66,1.55),line(7,18,14,18,.66,1.55),line(18,22,24.5,15.5,.9,2.1)]);
      if(id>=8&&id<=12)return fill([line(6,12,21,12,.55,1.6),line(6,18,15,18,.55,1.6),line(20,23,26,17,.95,2.1)]);
      return fill([...resting(id,.38),line(18,23,25,16,.95,2.2)]);
    }
    return fill(resting(id));
  }
  const time=now=>((paused?pauseAt:now)-start-skipped)/1000;
  function tick(now){
    frame=0;if(document.hidden)return;
    if(previous&&now-previous<30){frame=requestAnimationFrame(tick);return;}
    const dt=Math.min(48,previous?now-previous:32);previous=now;
    let moving=false;
    for(const item of items){
      if(!item.svg.isConnected){items.delete(item);continue;}if(!item.visible)continue;
      const target=pose(item.id,item.state,time(now),reduced.matches),blend=reduced.matches?1:1-Math.exp(-dt/68);
      let unsettled=false;
      target.forEach((s,i)=>{
        const current=item.current[i];
        current.points.forEach((p,j)=>{for(let k=0;k<2;k++){const delta=s.points[j][k]-p[k];if(Math.abs(delta)>.018)unsettled=true;p[k]+=delta*blend;}});
        if(Math.abs(s.alpha-current.alpha)>.01||Math.abs(s.width-current.width)>.01)unsettled=true;
        current.alpha+=(s.alpha-current.alpha)*blend;current.width+=(s.width-current.width)*blend;
        item.paths[i].setAttribute('d',current.points.map((p,j)=>`${j?'L':'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' '));
        item.paths[i].setAttribute('opacity',current.alpha.toFixed(3));item.paths[i].setAttribute('stroke-width',current.width.toFixed(2));
      });
      moving ||= !reduced.matches&&(unsettled||(!paused&&['running','approval'].includes(item.state)));
    }
    if(moving)frame=requestAnimationFrame(tick);
  }
  function wake(){if(!frame&&!document.hidden){previous=0;frame=requestAnimationFrame(tick);}}
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){const item=entry.target._wallMotion;if(item)item.visible=entry.isIntersecting;}wake();},{rootMargin:'40px'});
  function mount(host,id,state){
    const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 32 32');svg.setAttribute('aria-hidden','true');svg.classList.add('motion-mark');svg.dataset.state=state;
    const paths=Array.from({length:SLOT_COUNT},()=>{const p=document.createElementNS(NS,'path');svg.append(p);return p;});
    host.append(svg);const item={svg,paths,id,state,visible:true,current:pose(id,state,.65,true)};svg._wallMotion=item;items.add(item);observer.observe(svg);wake();
    return {update(nextId,nextState){item.id=nextId;item.state=nextState;svg.dataset.state=nextState;wake();},destroy(){observer.unobserve(svg);items.delete(item);svg.remove();}};
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&frame){cancelAnimationFrame(frame);frame=0;}else wake();});reduced.addEventListener('change',wake);
  return{mount,setPaused(value){if(value&&!paused)pauseAt=performance.now();if(!value&&paused)skipped+=performance.now()-pauseAt;paused=value;wake();}};
})();
