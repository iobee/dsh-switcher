// Isolated fixture: no host services, network requests, or real conversation data.
const params = new URLSearchParams(location.search), before = params.get('version') === 'before';
const source = before ? '../review/performance/before/' : '../src/plugin/';
if (before) document.getElementById('switcher-style').href = source + 'switcher.css';
const { mountSwitcher } = await import(source + 'view.js');
const ids = ['a', 'b', 'c', 'd', 'e'], listeners = new Set();
let current = 'a', theme = params.get('theme') === 'dark' ? 'dark' : 'light', reads = 0, previews = 0, releases = 0;
const opens = [], log = [], kinds = ['draft', 'running', 'idle', 'approval', 'unread'];
const publish = () => { for (const fn of listeners) fn(); };
const host = {
  current: () => current, candidates: () => ids, exists: id => ids.includes(id), theme: () => theme,
  row(id) { reads++; const i = ids.indexOf(id); return { id, workspaceName: ['Switcher', 'Workspace', 'Workbench', 'Design', 'Notes'][i],
    title: ['打磨键盘导航体验', '节点稳定性与切换策略', '左侧栏的焦点与候选状态', '插件接入方案', '快速记录交互'][i],
    text: '原文摘录仅作辅助线索，快速切换时优先识别标题。', kind: kinds[i], draft: i === 0,
    label: ['有草稿', '运行中', '已就绪', '待确认', '新结果'][i] }; },
  preview() { previews++; let active = true; return () => { if (active) { active = false; releases++; } }; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  open(id) { opens.push(id); current = id; document.getElementById('current').textContent = `当前：${id}，切换次数：${opens.length}`; publish(); },
};
const controller = mountSwitcher(document.getElementById('mount'), host);
const nativeFrame = window.requestAnimationFrame.bind(window);
const frame = () => new Promise(resolve => nativeFrame(resolve));
const settle = async () => { await frame(); await frame(); };
let measuring = false, frameCosts = [];
const originalFrame = window.requestAnimationFrame;
window.requestAnimationFrame = callback => originalFrame.call(window, time => {
  const start = performance.now(); callback(time); if (measuring) frameCosts.push(performance.now() - start);
});
document.getElementById('version').textContent = before ? '基线 0.1.5' : '当前实现';
document.getElementById('open').onclick = () => { controller.cancel(); controller.begin(1, true); };
for (const next of ['light', 'dark']) document.getElementById(next).onclick = () => { theme = next; publish(); };
window.addEventListener('keydown', event => {
  if (!controller.active && event.ctrlKey && event.code === 'KeyK') { event.preventDefault(); controller.begin(1); }
});
for (const type of ['pointerdown', 'pointerup', 'click', 'auxclick', 'contextmenu', 'keyup']) {
  window.addEventListener(type, event => {
    if (!event.target.closest?.('.dsh-switcher') && type !== 'keyup') return;
    log.push(`${type} button=${event.button} ctrl=${event.ctrlKey} prevented=${event.defaultPrevented} active=${controller.active}`);
    document.getElementById('events').textContent = log.slice(-12).join('\n');
  });
}
const mutations = records => ({
  attributes: records.filter(r => r.type === 'attributes').length,
  textReplacements: records.filter(r => r.type === 'childList').length,
  svgPaths: records.filter(r => r.type === 'attributes' && r.attributeName === 'd').length,
});
const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * p))] || 0;
document.getElementById('bench').onclick = async () => {
  document.getElementById('result').textContent = '正在测量';
  controller.cancel(); current = 'a'; controller.begin(1, true); await settle();
  let records = [];
  const observer = new MutationObserver(batch => records.push(...batch));
  observer.observe(document.querySelector('.dsh-switcher'), { subtree: true, attributes: true, childList: true });
  const card = document.querySelectorAll('.dsh-switcher-card')[1];
  const startReads = reads, start = performance.now();
  for (let i = 0; i < 200; i++) card.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, movementX: 1, clientX: 400 + i % 20, clientY: 320 }));
  const hoverMS = performance.now() - start;
  records.push(...observer.takeRecords());
  const hover = { events: 200, ms: hoverMS, rowReads: reads - startReads, ...mutations(records) };
  records = []; const keyReads = reads, timings = [];
  for (let i = 0; i < 100; i++) { const t = performance.now(); controller.begin(1, true); timings.push(performance.now() - t); }
  records.push(...observer.takeRecords());
  const cycle = { events: 100, ms: timings.reduce((a, b) => a + b, 0), p95: percentile(timings, .95), rowReads: reads - keyReads, ...mutations(records) };
  records = []; await settle(); records = []; frameCosts = []; measuring = true;
  const motionStart = performance.now();
  await new Promise(resolve => setTimeout(resolve, 2000));
  measuring = false; records.push(...observer.takeRecords());
  const motion = { durationMS: performance.now() - motionStart, callbacks: frameCosts.length,
    callbackMS: frameCosts.reduce((a, b) => a + b, 0), p95: percentile(frameCosts, .95), ...mutations(records) };
  observer.disconnect();
  document.getElementById('metrics').textContent = JSON.stringify({ version: before ? '0.1.5' : 'current', hover, cycle, motion,
    note: '合成负载与 fixture 工作量，不代表原生 DSH 的端到端帧率。' }, null, 2);
  document.getElementById('result').textContent = '测量完成';
};
document.getElementById('regressions').onclick = async () => {
  const results = [], check = (name, pass) => results.push({ name, pass });
  controller.cancel(); current = 'a'; const initialOpens = opens.length;
  controller.begin(1, true); await settle();
  const target = document.querySelectorAll('.dsh-switcher-card')[2];
  target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, ctrlKey: true, button: 2 }));
  check('Control-click context menu commits immediately', !controller.active && current === 'c' && opens.length === initialOpens + 1);
  window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control', ctrlKey: false, bubbles: true }));
  check('Control release does not commit twice', opens.length === initialOpens + 1);
  controller.cancel(); current = 'a'; controller.begin(1, true); await settle();
  const menu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 });
  document.querySelectorAll('.dsh-switcher-card')[2].dispatchEvent(menu);
  check('Ordinary right click does not switch', controller.active && current === 'a');
  document.querySelectorAll('.dsh-switcher-card')[3].click();
  check('Normal click commits without a key release', !controller.active && current === 'd');
  controller.begin(1, true); await settle(); controller.cancel();
  check('Preview references released', previews === releases);
  document.getElementById('metrics').textContent = JSON.stringify(results, null, 2);
  document.getElementById('result').textContent = results.every(r => r.pass) ? '交互验证通过' : '存在失败';
};
controller.begin(1, true);
