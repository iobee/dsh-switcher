# DSH Switcher 设计基线

## 来源

从 `dshMagicShortcuts/artifacts/session-05-pairing/preview.html?mode=raised&theme=light&size=dia` 迁入。
这是项目分离，保持已选设计。源项目不删改，旧版本继续保留。

## 固定选择

2026-10-19 用户选定 B「轻透」作为正式材质，仅更改配色、透明度、模糊与阴影。亮色外壳 rgb(241 243 246 / 58%)、白色卡面 57%；暗色外壳 rgb(39 40 42 / 58%)、白色卡面 5.2%。外层模糊 48px、饱和度 108%。具体边线、文字与阴影值以 `src/plugin/switcher.css` 为准。

原 05 亮色 / 05 raised 暗色保留于 `archive/session-material-05/switcher.css`；`demo/materials/` 的原版、A、B、C 对照继续可用。旧暗色 #3c3e42 卡面及其投影不再作为正式插件默认值。卡面圆角仍为 6px。
状态图标整套使用 11「五拍」，直接复用图标墙的原始图形与时间函数；状态为运行、等待确认、静置、有新结果，以及可并存的草稿。等待回答、方案确认保留具体无障碍语义。

## 尺寸

前一轮从用户手动打开的 Dia 切换器实测：2 倍屏幕截图中整体 1884 × 380 像素，对应 942 × 190 逻辑点；单项 182 × 158，内容预览 158 × 106，外间距 16、单项内间距 12、内容与标题相隔 12。
字号 14px、外圆角 24px 与选中圆角 14px 是视觉适配参数，并非 Dia 源码常量。图标槽位保持 20px。`size=compact` 保留旧版 744 × 140。

## 交互与边界

Ctrl + Tab 快按切换最近会话，按住后显示横向候选；Shift 反向，松开 Ctrl 提交，Esc 取消。弹层打开时冻结候选顺序。失焦、隐藏和输入法组合时取消。选中填充复用克制的 hover 表现，不放大。
设计预览继续使用 demo 数据；正式插件在 `src/plugin/` 接入宿主数据，边界与验证见 `integration.md`。网页内 backdrop blur 不是原生桌面玻璃效果的验证。

## 历史保存

`archive/artifacts/session-design-archive/index.html` 汇总可运行历史方案。归档保留原有示例项目名和文案以便比对。仅迁移设计源码和运行所需缩略图；桌面截图、运行日志与 zip 快照继续留在原项目。
