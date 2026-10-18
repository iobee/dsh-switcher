# 最近会话 · 紧凑磨砂

2026-10-18。设计原型，未连接 DSH。

预览：http://127.0.0.1:4381/artifacts/session-switcher-text/index.html
保留版：http://127.0.0.1:4381/artifacts/session-switcher/index.html

## 当前方向

用户认可最后一次用户输入、会话标题和状态的组合，要求进一步减小整体和 padding，保持克制，并尝试与 DSH 桌面材质搭配的玻璃效果。

浮层最大宽 820 px、高 222 px，外层 padding 8 px。每项高 152 px，内部 padding 10/10/8 px，项目间距 4 px。1171 px 视口下每项宽约 157.2 px。只在外层使用磨砂；普通项无独立底色和边框，以很淡的分隔线区分。选中只改变浅底色和细边框，宽高、位置和字号完全相同。

状态置顶、输入原文在中间、标题收在底部。取消可见的工作区行和重复说明，工作区仍保留在选项辅助名称里。正文改用 DSH 风格的系统字体 13/20 px，最多显示能容纳的完整行；标题 11/16 px、最多两行；状态 10/15 px。没有摘要、主题推断、关键词生成或虚构封面。

## 材质与宿主边界

当前 CSS 使用 blur(40px) saturate(150%)，与已安装 DSH 的 --dsw-menu-backdrop-filter 参数一致；正式接入时应优先读取宿主 token。玻璃只放在外层，文字和选择态不做透明动画，不做放大或抬升。浏览器原型只模糊页面内后方内容。

本轮只读检查安装包发现：macOS 主窗口配置 vibrancy: sidebar、visualEffectState: active 和透明 backgroundColor；renderer/assets/window-material.css 说明模糊由原生材质提供，CSS 只加前景 tint。说明宿主有原生背景材质，但不能据此证明叠在不透明聊天内容上方的插件层能透出桌面。真正的桌面背景透出需要在宿主层合成关系中另行验证，未修改宿主窗口或安装包。

官方参考：
- https://www.electronjs.org/docs/latest/api/browser-window#winsetvibrancytype-options-macos
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter

顶部“磨砂 / 实底”只用于设计比较。无 backdrop-filter 支持、降低透明度或提高对比度时使用不透明底色；提高对比度时加强文字与选择边线。系统辅助设置的实际联动尚未原生验证。

## 数据与交互

仍使用原设计页的示例会话。最近一条已获取的用户输入优先；缺失时使用明确标注的未发送草稿，再缺失则只显示标题。没有接入实时会话接口。原文和标点保持不变，超出空间省略显示；完整内容保留在 DOM、悬停提示及辅助说明中。

保留 Ctrl+Tab 的 MRU 协议：候选期间不切换、顺序冻结；Tab / Shift+Tab 与方向键选取；Enter、点击或模拟松开 Ctrl 确认；Esc 取消并恢复原焦点。失焦取消。浏览器测试不证明原生 Ctrl 松键已经接通。

窄于 761 px 时卡片固定 152 px 宽并横向滚动，候选变化时滚到完整可见。没有内容缓存时可用“试试仅有标题”体验。

## 保留与范围

artifacts/session-switcher/ 的保留版未修改。上一轮等大摘页的源码、文档和截图保存在 before-glass/；该目录是源码快照，不作为独立可运行入口。本轮仅修改 session-switcher-text/ 原型及其记录，未实现正式插件功能。
