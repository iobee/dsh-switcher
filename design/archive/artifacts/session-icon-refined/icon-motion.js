'use strict';

// Native DSH path data, a fixed icon slot, and independent status/draft semantics.
window.SessionSignal = (() => {
  const ns = 'http://www.w3.org/2000/svg';
  const kinds = ['idle','running','approval','question','plan','unread','draft'];
  const el = (name, attrs = {}) => {
    const node = document.createElementNS(ns, name);
    Object.entries(attrs).forEach(([key,value]) => node.setAttribute(key, String(value)));
    return node;
  };
  const paths = (parent, data, className = '') => data.map(attrs => {
    const path = el('path', {...attrs, ...(className ? {class:className} : {})}); parent.append(path); return path;
  });
  function mount(host, kind = 'idle', draft = false) {
    const svg = el('svg', {viewBox:'0 0 16 16',class:'signal-mark','aria-hidden':'true','stroke-width':1.15,'fill':'none'});
    const layers = new Map();
    for (const state of kinds) {
      const group = el('g', {class:'icon-layer','data-icon':state}); layers.set(state,group); svg.append(group);
      if (state === 'running') {
        const rotor = el('g',{class:'icon-running'}); paths(rotor, DSHSymbols.loading); group.append(rotor);
      } else if (state === 'approval') {
        paths(group, DSHSymbols.shield);
        const core = el('g',{class:'icon-approval-core',transform:'translate(2.5 2.1) scale(.7)'});
        paths(core,DSHSymbols.pause.slice(1)); group.append(core);
      } else if (state === 'question') {
        paths(group, DSHSymbols.conversation.slice(2));
        const core = el('g',{class:'icon-question-core'}); paths(core,DSHSymbols.question.slice(1)); group.append(core);
      } else if (state === 'plan') {
        const parts=paths(group,DSHSymbols.plan); parts.slice(0,2).forEach(path=>path.classList.add('icon-plan-line'));
      } else if (state === 'draft') {
        paths(group,DSHSymbols.edit);
      } else {
        paths(group,DSHSymbols.conversation);
        if(state==='unread') group.append(el('circle',{class:'icon-unread-dot',cx:12.5,cy:3,r:2.2}));
      }
    }
    const badge=el('g',{class:'icon-draft-badge','data-visible':false,transform:'translate(8.4 8.6) scale(.6)'});
    badge.append(el('circle',{cx:10.5,cy:5.4,r:5})); paths(badge, DSHSymbols.edit.slice(1)); svg.append(badge); host.append(svg);
    let current;
    function update(next, hasDraft) {
      const value=kinds.includes(next) ? next : 'idle';
      const display=value==='idle'&&hasDraft ? 'draft' : value;
      layers.forEach((group,key)=>group.dataset.active=String(key===display));
      badge.dataset.visible=String(!!hasDraft&&value!=='idle');
      const unread=layers.get('unread').querySelector('.icon-unread-dot');
      unread.classList.toggle('is-new',display==='unread'&&current!==display);
      svg.dataset.state=display; current=display;
    }
    update(kind,draft);
    return {update,destroy(){svg.remove();}};
  }
  function setVisible(value) { document.documentElement.dataset.signalVisible=String(value&&!document.hidden); }
  document.addEventListener('visibilitychange',()=>setVisible(!document.hidden && document.body.dataset.mruOpen==='true'));
  return {mount,setVisible,redraw(){}};
})();
