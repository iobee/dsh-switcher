// A second study of the user's selected 04 structure. Historical layouts are untouched.
export const projectTabs = [
  { id: 'split', number: '01', name: '分签', summary: '用户已选 · 独立题签与细边。', detail: '每张卡片都有独立的顶栏，保留原案的归属感，拉开相邻题签。', review: '2026-10-19 用户最终选择本案；正式实现见插件界面验证页。' },
  { id: 'inset', number: '02', name: '内签', summary: '项目栏收进卡片。', detail: '题签四周保留空间，标题与题签左边缘一致。', review: '项目像独立标签，长项目名截断更早；不作为主推。' },
  { id: 'rule', number: '03', name: '细线', summary: '用一道线替代标题栏底色。', detail: '降低面与面的叠加，让一条细线区分归属和标题。', review: '安静，但分区感比你选中的原案弱，保留作极简对照。' },
  { id: 'headline', number: '04', name: '大字', summary: '把更多空间交给会话标题。', detail: '压缩项目栏，增大标题字号与字重，状态仍固定在底部。', review: '长中文标题过早截断，视觉重量也偏重，淘汰。' },
  { id: 'center', number: '05', name: '居中', summary: '更规整的中轴排布。', detail: '项目、标题和状态沿卡片中轴排列，观察对称感是否值得。', review: '短标题漂亮，长标题的起读位置不稳定，不适合快速扫读。' },
  { id: 'mono', number: '06', name: '等宽', summary: '项目名使用等宽字体。', detail: '用字体区别项目名称和自然语言标题，颜色保持克制。', review: '技术感更强，两套字体的节奏也更明显，与这轮轻盈的方向不够协调。' },
  { id: 'accent', number: '07', name: '压线', summary: '选中题签增加一条色线。', detail: '选中卡片的顶部多一条短色线，同时保留整张卡的选中底色。', review: '定位明确，但与状态颜色争夺注意力，不作为默认。' },
  { id: 'solid', number: '08', name: '石墨', summary: '更实、更稳定的底。', detail: '降低透明度，增加文字与背景的分离，弱化背后的复杂内容。', review: '复杂背景下稳，但离 B「轻透」更远，保留作可读性参照。' },
  { id: 'soft', number: '09', name: '轻签', summary: '推荐 · 保留题签，减轻边界。', detail: '项目有清楚的顶栏，标题留出自然的两行；选中卡在亮色中略浮起，在暗色中轻轻提亮。', review: '归属、标题与选中态最均衡。状态和原话各守一行，整体更接近 DSH 的克制感。', recommended: true },
  { id: 'joined', number: '10', name: '连页', summary: '备选 · 更整体的横向托盘。', detail: '相邻题签像同一条页眉，取消重复的卡片轮廓，只让选中会话独立浮现。', review: '整体感强、很安静；需要更强分区时，09 更明确。', recommended: true },
  { id: 'warm', number: '11', name: '暖签', summary: '一点暖灰，柔化纯中性。', detail: '保留 09 的比例，暖灰只进入材质，不给项目添加额外的彩色标签。', review: '暖色主题比较舒服，与冷色背景搭配时有偏色感，留作主题候选。' },
  { id: 'air', number: '12', name: '留白', summary: '备选 · 让标题呼吸。', detail: '只在选中卡上显示最后输入，其他卡留出安静的底部；项目、标题、状态位置完全固定。', review: '最容易扫读，但少了一眼查看其他会话原话的能力。', recommended: true },
];
export const getProjectTab = id => projectTabs.find(item => item.id === id) || projectTabs.find(item => item.id === 'split');
