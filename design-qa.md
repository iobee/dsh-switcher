# 01「分签」正式实现 QA · 2026-10-19

final result: passed

本报告验证 0.1.4 的正式视图和公开宿主接口适配；浏览器 fixture 通过不等于原生 DSH 插件联调。本轮没有安装到 DSH。此前研究报告保留于 `design/reviews/2026-10-19-design-lab/project-tabs-qa.md`，B 的生产报告保留于 `design/reviews/2026-10-19-material-b-production/design-qa.md`。

## 视觉来源与同状态比较

用户选择的是手机上展示的 **01 分签**，不是此前推荐的 09、10、12。准确来源为 `design/reviews/2026-10-19-design-lab/private/mobile/01-split.png`；原始桌面截图为同目录上级的 `tabs-initial-split-dark.png` / `tabs-initial-split-light.png`。

- 实现：`demo/plugin.html?theme=dark&scene=real&backdrop=reference&first=1&clean=1`，使用正式插件视图、样式和动效。
- 内容、选中项：同一组真实 Codex 标题、项目名、原话；首项选中，状态为演示。
- 原始桌面与实现均为 1280×720 CSS px。普通截图已归一到 1280×720 像素，不重复乘 DPR。原始面板位置 x=169 / y=151，实现 x=169 / y=265；均截取 942×190 后并置，消除研究台外框的位置差异。
- 同背景补充比较：研究路由 `demo/project-tabs/?layout=split&theme=dark&scene=real&clean=1` 与正式 fixture 使用相同全屏背景、相同 942×190 面板位置。当前研究台的全局状态字重曾被加粗，正式版按用户实际看到的 01 图片保留 11/16、400 字重。

以下真实文案证据均位于 `design/reviews/2026-10-19-design-lab/private/`，已忽略，不进入 Git 或安装包：

| 证据 | 文件 |
| --- | --- |
| 正式明暗完整截图 | `split-production-dark.png` / `split-production-light.png` |
| 所选原始图与正式视图同图比较 | `split-selected-comparison-dark.png` / `split-selected-comparison-light.png` |
| 同背景、同位置补充比较 | `split-compare-dark.png` / `split-compare-light.png` |
| 前两张卡片的字体、留白与边界细节 | `split-focused-dark.png` / `split-focused-light.png` |

细节图从两者同一位置截取 364×158，再同时放大为 728×316，只为查看字重与行距，不代表新增细节。已经打开同图并置证据进行视觉判断。

公开 fixture 证据为 `design/reviews/2026-10-19-split-production/{light,dark,narrow-light,narrow-dark}.png`。窄窗口使用完整 CDP 页面捕获，480×720 CSS px 对应 480×720 原始像素；早期截图工具的缩小预览已替换，不作为视觉依据。

## Findings

没有尚未处理的 P0/P1/P2 视觉偏差。

- 项目题签、两行标题、状态、原话的位置与选中图片一致。所选 01 的独立细边和 6px 视觉窄缝保留，未改成 09 的无边界方案。
- 保留所选 01 图片的状态字重，属于准确复现用户选择；历史研究台较粗的状态不是本次目标。
- 图标截图的波形差异来自完整五拍动效的采样时间，源与实现使用同一个 motion 模块。透明面板在原始局部背景与全屏背景上有亮度差异，同背景补充比较未发现材质偏移。
- 原型没有真实宿主的「待回应」及「运行中 · 有草稿」等并存状态。正式实现保留完整状态语义，紧凑标签放在固定一行中，经长文案压力场景验证不挤占标题。

本轮首次同状态视觉比较没有发现需要修正的 P0/P1/P2；没有虚构视觉迭代。截屏尺寸修正属于证据采集修正，不属于产品设计修改。

## 五个必要表面

| 表面 | 结果 |
| --- | --- |
| 字体与排版 | 系统字体 / PingFang SC；项目 12/20、标题 15/21、状态 11/16、原话 11/16。选中标题 600，其他标题 550。中英文长标题最多两行，项目与原话单行省略，完整文字仍在 DOM 与 title 中。 |
| 空间与节奏 | 外框 942×190，单项 182×158，题签高 33px，图标 20px。项目、标题、状态、原话四个固定区块；短标题留白，底部行始终对齐。窄窗口保持卡片宽度，横向滚动。 |
| 颜色与材质 | 按所选 01 的中性半透明明暗值实现，模糊 48px / 饱和度 108%；项目、状态和原话使用独立颜色。选中整卡提亮，同时保留所有卡片的边界。减少透明度和增强对比度模式有效。 |
| 图像与图标 | 复用已有 DSH 示例背景与完整 family 11 动效；所有五个图标均识别为 11，未替换成近似图标。没有新增位图产品素材。 |
| 文案与数据 | 本机真实快照的标题、项目名和原话一致；数据通过 textContent 写入。生产项目名按 DSH 工作区成员关系查找，回退目录名或「未分组」。加载、空白和错误提示仍保留。 |

## 行为与工程验证

- `npm test`：14 项通过。覆盖 MRU、冻结顺序、正反循环、松开 Control、双 Control、Esc、组合输入、引用释放、用户原文提取，以及工作区标题/路径回退、改名/归属更新、短状态与并存草稿。
- `npm run check`、构建和本地打包通过。主入口资源均位于仓库内；安装包只有 README、package.json、cordis.patch.yml、lib/index.js、lib/client.js。
- 浏览器正式 fixture：明暗均为 942×190；480×720 下为 448×190。末项 scrollLeft=494，卡片完整可见；页面无横向溢出。
- 状态从运行变待确认，项目动态改名，选中会话保持不变。长标题高度不超过 42px，摘录始终 16px。脚本文字作为文本呈现，卡片内 script 元素数为 0。
- 正反方向键、Enter 提交、Esc 取消、Ctrl+K 浏览器替代测试键的松键提交通过。取消后原会话不变、草稿保留、焦点返回触发控件；卸载移除浮层。
- 减少动态效果后两次图形采样一致；增强对比度 / 减少透明度时 backdrop-filter 为 none，选中轮廓可见。调试媒体覆盖已清除。
- 控制台 error 为空。

## 边界与后续

没有安装 0.1.4 到 DSH，未验证本次宿主工作区映射的实机展示、真实 Control 独立松键、VoiceOver 或自定义主题配色。既有键盘和动效实现保持，历史实机证据不当作新版本安装验证。原生边界见 `design/integration.md`。

实施清单完成：确认所选 01 → 冻结 B 与历史研究 → 接入真实项目名 → 改造正式卡片 → 明暗同图比较 → 窄窗口及交互验证 → 构建和打包。

final result: passed
