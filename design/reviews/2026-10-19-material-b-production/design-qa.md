# 材质对照 QA · 2026-10-19

final result: passed

范围：以下主体保留 `demo/materials/` 在用户选择前的材质预览记录。该阶段的通过表示可供设计比较；用户随后选定 B 并接入正式插件，见文末追加记录。

## Source visual truth

- 原生亮/暗参考：`demo/materials/reference/native-light.png`、`native-dark.png`，3036 × 1990 像素，原生截图约 2×。本轮拍摄、检查并接受。
- 布局与图标依据：生产 `src/plugin/switcher.css` / `view.js` / `motion.js`，以及当前设计基线 `design/baseline.md`。用户明确要求保留布局。
- 同尺度对照：`design/reviews/2026-10-19-materials/baseline-light.png`、`baseline-dark.png`，1280 × 720，CSS 1280 × 720，1×。
- 原生截图用来判断宿主灰阶和融合感，不与缩放后的背景做逐像素尺寸比较。同内容、同视口的原版渲染作为几何比较依据。

## Rendered implementation

- 页面：`http://127.0.0.1:4382/demo/materials/`。
- `design/reviews/2026-10-19-materials/{mist,glass,soft}-{light,dark}.png`：1280 × 720，1×；五个样例会话，第二项选中。
- 全景比较：每种主题下将 baseline 与三种实现截图置于同一查看输入中检查，明暗各一组。
- 细节比较：`baseline-detail-dark.png` 与 `glass-detail-dark.png` 置于同一查看输入。CSS 视口 948 × 880、设备 DPR 2，截图 API 输出归一为 1× 的 940 × 214 区域；两张都为第四项选中。检查同一背景、同一选中态的边线、标题、图标和阴影。
- 窄窗口：`narrow-light.png`、`narrow-dark.png`，480 × 720，1×；最后一项选中并完整显示。浮层 448 × 190，内容区域 416px，scrollLeft 494，选中项 x266…448，页面无水平溢出。

## Required fidelity surfaces

| 项目 | 检查结果 |
| --- | --- |
| 字体与排版 | 原组件系统字体、正文 14/20、标题 14/16、四行摘录与标题省略规则均复用，未更改字重与排布 |
| 尺寸与节奏 | 八组桌面状态实测均为浮层 942×190、单项 182×158、卡面 158×106；圆角、padding、标题间距未覆盖 |
| 颜色与材质 | 三组材质有意改变颜色、透明度、模糊与投影；暗色卡面亮度下降，B 背景透入明显；文字没有被背景纹理遮挡 |
| 资源与图标 | 使用真实 DSH 截图背景与原始五拍 SVG 动效实现；每组五个图标均为 family 11，没有生成或替换图形 |
| 文字与内容 | 三组复用相同的五个样例会话，未引入新信息或状态文案；浏览器数据明确标为材质预览 |

## Interaction and implementation checks

- 三个方案与原版可以切换，两个主题均可切换，URL 同步方案和主题。
- 预览工具栏 Enter 激活方案与 Space 对照后的恢复已检查；当前材质不因松开对照而丢失。
- ArrowRight / Tab 逐步选择，末项横向滚动完整可见。Esc 关闭，打开按钮重新显示。
- 新预览没有改生产键盘事件路径。
- 浏览器 error 日志为空。
- `npm run check` 通过，116 scripts / 247 local references；生产代码差异为空。
- 临时视口覆盖已清除，原生 DSH 恢复为用户原来的 Light 主题。

## Findings and comparison history

- 初版预览背景按原生逻辑像素居中裁切，在默认视口左侧截掉了部分侧栏文字。改为按视口等比 cover 后重截全组，侧栏在桌面比较中完整可辨。该修正仅影响示例背景，不影响 Switcher 的布局。
- 预览工具栏最初会被生产模态快捷键捕获 Enter / Space。增加仅限工具栏的预览键盘处理；重新验证方案激活、对照恢复、Esc 和重开通过。
- 恢复应用实际 948px 面板宽度时，预览工具栏因定位元素的可用宽度计算提前换行；设为内容宽度并保留视口最大宽度后复核恢复一行。仅修改预览工具栏。
- 复核后没有待处理的 P0/P1/P2。长标题截断与窄窗口横向候选是既定布局行为，按本轮要求保留。

## Follow-up

当时的下一步为用户比较材质、确定方向，再接入实际 DSH。该原型结果不证明原生 vibrancy，也不替代宿主端无障碍与性能检查。

## B 选定后 · 正式插件 0.1.3

- 用户明确选定 B「轻透」。原版 05 的 CSS 按字节归档；比较页改为引用归档，A/B/C 与原版都继续可用。
- 正式 CSS 使用与 B 相同的全部材质值；布局、字号、选中逻辑、五拍及键盘模块保持原样。
- 浏览器正式组件在 1280×720 下复核亮暗主题，480×720 下复核两主题末项横向滚动；截图 `design/reviews/2026-10-19-material-b-production/browser-{light,dark,narrow-light,narrow-dark}.png` 已目视检查。
- 固定几何仍为 942×190 / 182×158 / 158×106；窄窗口末项 x266…448，浮层宽 448px。5 个图标均为 family 11，控制台 error 为空。
- 12 项测试、语法与资源检查、构建和打包通过。0.1.3 已通过官方 CLI 更新到 DSH，并核实安装文件与构建一致。真实会话浮层可打开并用 Esc 关闭。
- 原生截图仍受台前调度缩略图限制，本轮未宣称原生材质的精细视觉验证完成。完整范围见 `design/integration.md`。
