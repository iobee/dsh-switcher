// Invented fixtures remain available alongside an optional local Codex snapshot.
// Text typed into the study is temporary and is never saved or sent.
const base = [
  { id: 'a', title: '打磨键盘导航体验', workspaceName: 'dsh-shortcutter', kind: 'draft', label: '有草稿', draft: true },
  { id: 'b', title: '节点稳定性与切换策略', workspaceName: 'proxyAutoSwitch', kind: 'running', label: '运行中' },
  { id: 'c', title: '左侧栏的焦点与候选状态', workspaceName: 'dsh-shortcutter', kind: 'idle', label: '会话已就绪' },
  { id: 'd', title: 'DSH 插件接入方案', workspaceName: 'dsh-switcher', kind: 'approval', label: '等待用户确认' },
  { id: 'e', title: '一念 · 快速记录交互', workspaceName: 'Trice', kind: 'unread', label: '有新结果' },
];

export const scenes = {
  daily: { name: '日常中文', texts: [
    '想把高频操作连起来，尽量让双手留在键盘上。',
    '延迟很低但只稳定一小会儿的节点，不要急着切过去。',
    '上下移动的时候，先不要直接切换会话。',
    '把插件的接入边界梳理一下。',
    '打开就能写，历史记录也要容易找到。',
  ] },
  long: { name: '长句与短句', texts: [
    '好，就按这个方向继续。',
    '我想让整个切换过程更安静一些。按住快捷键时可以快速认出上一次聊到哪里，松开以后就回到那里，不要有额外的提示和等待。',
    '不要改变现有布局和快捷键的行为，先把字重、行距、文字颜色、透明度、边缘以及阴影放在一起比较一下。',
    '再试一版？',
    '当一段很长很长而且中间没有任何标点的中文出现在预览区域里时也应该自然换行并且不会把底部的会话标题挤出去',
  ] },
  mixed: { name: '英文与代码', texts: [
    'Keep the transition quiet. The selected session should be easy to recognize at a glance.',
    '先检查 src/plugin/view.js，再确认 Ctrl + Tab 松开时的 focus restore 是否正常。',
    'npm run check\nnpm test\nnode --version',
    '修复这个错误：TypeError: Cannot read properties of undefined (reading "sessionId")',
    'https://example.com/docs/session-switcher/keyboard-events-and-focus-restoration',
  ] },
  edge: { name: '边界状态', texts: [
    '',
    '“先别动布局。”\n\n这一版只看文字和材质。',
    '👋🏽 你好！继续处理 family 👨‍👩‍👧‍👦 与中文混排。',
    '步骤一：先保留原样。\n步骤二：检查明暗主题。\n步骤三：再比较窄窗口。',
    '<script>alert("只是原文")</script>\n显示文字，不能作为 HTML 执行。',
  ] },
};

let realConversations;

export function useRealConversations(rows) {
  if (!Array.isArray(rows) || rows.length !== base.length || rows.some(row => !row || typeof row.title !== 'string' || typeof row.text !== 'string')) {
    throw new TypeError('Expected five conversation titles and user messages.');
  }
  realConversations = rows.map(({ title, text, workspaceName }) => ({ title, text, workspaceName: typeof workspaceName === 'string' ? workspaceName.trim() : '' }));
  scenes.real = { name: 'Codex 真实对话', texts: realConversations.map(row => row.text) };
}

export function fixtureRows(scene = 'daily', custom = '') {
  const texts = (scenes[scene] || scenes.daily).texts;
  return base.map((row, i) => ({
    ...row,
    title: scene === 'real' && realConversations ? realConversations[i].title : row.title,
    workspaceName: scene === 'real' && realConversations ? realConversations[i].workspaceName : row.workspaceName,
    text: custom && i === 1 ? custom : texts[i],
    placeholder: '还没有用户输入',
  }));
}

// Typography, never a summary. Split only at punctuation already in the source.
// Preserve the exact original string across both spans, including whitespace.
export function splitExcerpt(text) {
  const raw = String(text ?? '');
  if (/^(?:https?:\/\/|(?:npm|node|git|pnpm)\s|```|<script)/.test(raw)) return [raw, ''];
  const points = Array.from(raw);
  for (let i = 0; i < Math.min(points.length - 1, 42); i++) {
    if (i < 5) continue;
    const punctuation = /[，。！？；：,!?;\n]/.test(points[i]) || (points[i] === '.' && /\s/.test(points[i + 1] || ''));
    if (punctuation) return [points.slice(0, i + 1).join(''), points.slice(i + 1).join('')];
  }
  return [raw, ''];
}

export function textKind(text) {
  if (/^(?:https?:\/\/|(?:npm|node|git|pnpm)\s|```|<script)/.test(text)) return 'code';
  return /[\u3400-\u9fff]/.test(text) ? 'cjk' : 'latin';
}
