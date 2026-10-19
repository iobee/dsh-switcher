export const recognitionLayouts = [
  { id: 'index', number: '01', name: '项目索引', summary: '先定位项目，再认出会话。', detail: '项目固定在顶部，标题占据中心；状态和一句原话排在下面。', tradeoff: '信息完整、位置稳定。所有卡片仍各留一行原话。', recommended: true },
  { id: 'headline', number: '02', name: '标题主导', summary: '让会话名称成为第一眼。', detail: '大一号的两行标题优先出现，项目紧随其后，状态与原话退到下方。', tradeoff: '标题起得好时最直接；相近标题需要再看项目区分。' },
  { id: 'status', number: '03', name: '状态领读', summary: '先看哪个正在跑、哪个等你。', detail: '完整五拍图标与状态文字先出现，项目与标题组成第二层识别。', tradeoff: '适合多会话并行；找某个特定项目时，状态可能稍抢眼。' },
  { id: 'tab', number: '04', name: '项目题签', summary: '把所属项目做成稳定的页签。', detail: '顶部独立的轻色项目栏，下面是会话标题；状态与原话留在卡片底部。', tradeoff: '归属非常明确，边界也会比其他方案多一点。' },
  { id: 'selected', number: '05', name: '选中再读', summary: '只让选中会话露出最后一句。', detail: '所有会话先给出项目、标题和状态。原话只在选中卡片里出现，切换时卡片不跳动。', tradeoff: '浏览更安静，但窄卡片中的一句原话仍可能截断。', recommended: true },
  { id: 'shared', number: '06', name: '共用旁注', summary: '会话负责识别，原话共享一行。', detail: '卡片只放项目、标题、状态。选中会话的最后输入显示在整条浮层下沿，随选择更新。', tradeoff: '原话有更宽的阅读空间；视线需要从卡片移到下沿。', recommended: true },
  { id: 'rail', number: '07', name: '状态侧栏', summary: '项目在上，状态和标题分两列。', detail: '完整项目名先出现；左侧放五拍状态，右侧专注会话标题，最下面留一行原话。', tradeoff: '状态与标题区分清楚，但长标题的横向空间更少。' },
  { id: 'rows', number: '08', name: '横向清单', summary: '把五个会话放在同一套列里。', detail: '每行依次对齐项目、状态、标题和原话。保持原来的最近使用顺序，不按项目重排。', tradeoff: '文字容纳最多；会从横向卡片切换，变成纵向列表的阅读习惯。' },
];

export const getRecognitionLayout = id => recognitionLayouts.find(layout => layout.id === id) || recognitionLayouts[0];
