// Explorations only. The installed plugin still uses the selected B material.
const entry = (id, name, group, material, type, detail, caution, extra = {}) => ({ id, name, group, material, type, detail, caution, ...extra });

export const variants = [
  entry('00', 'B · 轻透', '基准', 'baseline', 'plain', '当前已选方案，作为这一轮的原点。', '正文与标题权重相近，短输入像普通文字框。'),
  entry('01', '余白', '文字', 'baseline', 'air', '增加文字四周的呼吸，略松的行距配合更轻的标题。', '长输入显示的字符稍少。'),
  entry('02', '首句', '文字', 'baseline', 'lead', '原文第一小句略重，后文退半步，给扫视一个落点。', '首句未必概括任务；只作排版，不能冒充摘要。'),
  entry('03', '紧序', '文字', 'baseline', 'compact', '细密的 13px 正文，更像工具界面的信息摘录。', '密度更高，但辨认更费眼。'),
  entry('04', '句读', '文字', 'baseline', 'verse', '在原有标点后换行，第一小句与后文拉开距离。', '小卡面中长句容易占满空间。'),
  entry('05', '书宋', '文字', 'baseline', 'serif', '宋体正文与系统字体标题，给用户的话一点书写气息。', '中文有性格，代码和密集英语会显得不统一。'),
  entry('06', '机读', '文字', 'baseline', 'mono', '等宽字体、清晰的字符秩序，偏开发工具气质。', '中英文混排有割裂感，长英文容纳量下降。'),
  entry('07', '题记', '文字', 'baseline', 'caption', '用极小的“最后输入”标识建立摘录语境。', '五次重复标签增加噪声，也占用一行空间。'),
  entry('08', '薄雾', '材质', 'mist', 'lead', '中性的雾面外壳，低反差内层，保留柔和边缘。', '亮色下选中项需要足够的明度差。'),
  entry('09', '浮瓷', '材质', 'porcelain', 'air', '近乎不透明的细白瓷面，阴影仅落在整个托盘。', '稳定清楚，但与背景的联系较弱。'),
  entry('10', '石墨', '材质', 'graphite', 'lead', '暗色以 DSH 的深灰层次为锚点，压低卡面的发亮感。', '材质更安静，通透感也更弱。'),
  entry('11', '磨砂', '材质', 'frost', 'air', '更高模糊、低饱和度，只透入背景的大块明暗。', '在很平的背景上，差异不明显。'),
  entry('12', '冰透', '材质', 'ice', 'air', '更低透明底与很细的亮边，探索通透的上限。', '背景较花时文字和选中态不够稳。'),
  entry('13', '烟晶', '材质', 'smoke', 'lead', '温和的烟色薄层，弱化每张卡片各自的投影。', '暗色优于亮色，暖底上可能偏冷。'),
  entry('14', '纸感', '材质', 'paper', 'serif', '微暖、无纹理的纸面，让文字成为主角。', '温度更明确，和冷色 DSH 主题不总协调。'),
  entry('15', '页边', '细节', 'mist', 'margin', '一根短竖线锚定第一小句，像一小段被摘出的文字。', '五张卡片重复竖线时可能产生栅栏感。'),
  entry('16', '引言', '细节', 'mist', 'quote', '小引号与正文分层，明确这是用户原话。', '引号是额外装饰，长输入可用宽度降低。'),
  entry('17', '页眉线', '细节', 'paper', 'hairline', '一条细短横线与更整齐的行距，近似手边的索引页。', '线条没有操作含义，应避免被当成进度。'),
  entry('18', '折光', '细节', 'ice', 'air', '边缘有极淡的斜向反光，正文表面保持平静。', '反光有个性，但和主题融合不如中性面。', { treatment: 'prism' }),
  entry('19', '聚焦', '细节', 'graphite', 'lead', '只让选中的卡面稍亮，其余卡面更贴近托盘。', '不能把未选文字同时降得太暗。', { treatment: 'focus' }),
  entry('20', '细框', '细节', 'smoke', 'air', '用中性细边线识别选中，减少大面积填充。', '窄窗和花背景下需检查边线是否足够清楚。', { treatment: 'outline' }),
  entry('21', '无界', '细节', 'mist', 'lead', '弱化内卡面，像同一张材质上的五份摘录。', '整体轻，但短文本的组块辨认较弱。', { treatment: 'borderless' }),
  entry('22', '青灰', '色温', 'blue', 'lead', '极低饱和的蓝灰，与 DSH 冷色界面相接。', '暖色主题中会留下偏蓝的底。'),
  entry('23', '苔青', '色温', 'sage', 'margin', '一点灰绿色，温柔、低刺激的文字阅读方向。', '气质鲜明，未必适合所有主题。'),
  entry('24', '茶白', '色温', 'tea', 'air', '暖灰底与茶色细节，减少工具界面的冷感。', '与紫蓝主题同时出现时容易混浊。'),
  entry('25', '素笺', '精修', 'quiet', 'refined', '首句微重、后文有序退后；更薄的中性卡面，选中项轻轻提亮。', '最均衡；仍需你在真实 DSH 中确认读字与切换手感。', { treatment: 'focus', recommended: true, verdict: '首选 · 日常使用' }),
  entry('26', '墨透', '精修', 'ink', 'refined', '保留玻璃的通透，把暗色的灰块收回去，重心落在原文。', '暗色融合更好；极亮的背景仍需保护文字反差。', { treatment: 'focus', recommended: true, verdict: '推荐 · 更轻的材质' }),
  entry('27', '书页', '精修', 'vellum', 'book', '柔暖纸面、宋体首句、系统字体后文，有一点阅读器的气息。', '更有性格，开发类输入的协调性弱于素笺。', { treatment: 'focus', recommended: true, verdict: '备选 · 文字个性' }),
  entry('28', '随境', '精修', 'adaptive', 'refined', '以宿主底色混出中性层级，字色与选中始终保持清楚。', '目前是主题色模拟；接入真实主题 token 仍需验证。', { treatment: 'focus', recommended: true, verdict: '推荐 · 主题适配方向' }),
];

export const groups = ['全部', '精修', '文字', '材质', '细节', '色温'];
export const getVariant = id => variants.find(v => v.id === id) || variants.find(v => v.id === '25');

export const palettes = {
  neutral: { name: 'DSH 默认', light: '#f2f3f5', dark: '#202023', accent: '#7d86b6' },
  blue: { name: '蓝灰', light: '#e8edf5', dark: '#1c2533', accent: '#7f9ec7' },
  sage: { name: '青绿', light: '#eaf0eb', dark: '#202b28', accent: '#88a792' },
  sand: { name: '暖沙', light: '#f2ece2', dark: '#302923', accent: '#bba282' },
  plum: { name: '灰紫', light: '#eee9f3', dark: '#2b2430', accent: '#b09abc' },
};
