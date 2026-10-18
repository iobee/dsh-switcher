# DSH 适配与验证

目标宿主：安装的 DeepSeek Harness 0.2.1-rc.2。生产入口为 `src/plugin/client.js`，构建产物为 `lib/client.js`。

## 公共服务边界

| 用途 | 来源 |
| --- | --- |
| 会话标题、最近活动、空白判断 | `sessions.list` |
| 当前会话 | `sidebarRight.mounted` |
| 归档排除 | `workspaces.list.archivedSessionIds` |
| 运行、等待用户、未读结果 | `uiSession.sessionStatus` |
| 最新用户输入 | 保留的 Session `eventSource` 中最后一条人类 `user/message` |
| 草稿 | `conversation.input.for(binding.ctx).state`，只读 |
| 切换动作 | `uiWorkspace.openSession(id)` |
| 桌面快捷键 | 主文档捕获 `keydown` / `keyup`，同一事件链处理完整手势 |
| 浮层 | `slots` 的 `shell.overlay` |
| 明暗主题 | `theme.getTheme()` 与 `theme/change` |

只保留预览中的会话；当前会话借用宿主引用。关闭和卸载释放自己的引用，不释放宿主引用。候选顺序在一次切换期间冻结，实时更新标题和状态；删除或归档候选会取消当前切换。

## 松键问题与当前边界

2026-10-19 在真实键盘上做了对照。通过 `shortcuts.register` 注册 Ctrl + Tab 时，原生转发能打开浮层，但主文档未收到后续 Control keyup；直接监听主文档 Ctrl + Tab 后，同一键盘正常送达 `keyup ControlRight ctrl=false`，随后提交切换。用户确认松开后正常切换，诊断同时记录了按住 Ctrl 再按 Esc 取消成功。

因此当前版本将整个手势保留在主文档，不在宿主原生通道注册 Ctrl + Tab。系统映射后传入的逻辑 Control 状态直接使用，没有 Caps Lock 特判，没有修改系统映射，也没有原生轮询或额外辅助程序。这个对照锁定了原生转发路径的差异，未进一步断言 Electron/宿主内部的具体丢失位置。

收到 Ctrl + Tab 后立即聚焦浮层，140ms 只控制视觉显示；快速松键可以在显示前提交。以 `ctrlKey` 为准，释放 Shift 或仅释放两个 Control 中的一个不会误提交。失焦、隐藏和输入法组合取消。

**当前限制：**焦点位于独立内嵌网页或 iframe 内部时，事件不会冒泡到主文档，因此不支持从这些区域唤起。不能重新注册原生 Ctrl + Tab 来假装覆盖该场景，否则会恢复已复现的松键故障。终端入口与 Windows 仍需分别原生验证。

## 已执行验证

- `npm test`：12 项通过，包含 MRU/归档/空白过滤、正反循环与冻结、原文提取、状态优先级、真实接口形状及引用释放；并覆盖完整按下/松开、双 Control、Esc 取消、组合输入和卸载监听。
- `npm run check`：语法与本地资源引用。
- 浏览器 fixture：942 × 190 / 182 × 158 / 158 × 106 尺寸；亮暗主题；480px 窄窗口；末项滚动完整可见；Esc 取消；快切与草稿保留。
- 原生 DSH：通过官方 CLI 安装并热加载，Ctrl + Tab 打开真实会话浮层，真实标题和最后输入可见；Enter 提交、真实键盘松开 Ctrl 提交、按住 Ctrl 再按 Esc 取消已观察到。

真实松键证据来自用户操作与临时输入诊断，最终包已移除该诊断。浏览器 fixture 的明暗/窄窗口验证与真实 DSH 的键盘验证分别记录，不相互替代。

## 0.1.3 · B「轻透」材质 · 2026-10-19

用户选定 B 后，将对照页的明暗材质值原样应用于正式 `src/plugin/switcher.css`。只改变配色、透明度、边线、阴影和背景模糊；视图、键盘、数据适配及完整 11 五拍动效代码没有变化。0.1.2 样式完整保存于 `archive/session-material-05/`，对照页的“原版”固定引用该快照。

- `npm run check` 通过：116 个脚本、247 个本地引用；`npm test` 12 项通过。构建及本地打包通过，安装包仍只有 5 个文件。
- 正式样式的浏览器 fixture：亮暗主题均为浮层 942×190、单项 182×158、卡面 158×106；48px 模糊、108% 饱和度与 B 一致，5 个图标均为 family 11。480px 窄窗口下浮层 448×190，末项可滚动到完整可见。控制台无 error。截图在 `reviews/2026-10-19-material-b-production/`。
- 官方 CLI 已将日常 `desktop` profile 的 Switcher 从 0.1.2 更新为 0.1.3。安装目录的客户端、宿主入口和插件补丁与本地构建逐字节一致；客户端 SHA-256：`4b58acdfbf894d1c5b71076b1e2911cb9a632804383cce4e6e67a3f5363fb7b6`。
- 安装后在真实 DSH 用 Ctrl+Tab 打开浮层，读取到真实会话标题与最后输入，并用 Esc 关闭。未重新测试真实键盘的独立 Control 松键；此前用户验证仍为该行为的证据。
- 本轮桌面捕获只返回台前调度缩略图，因此没有把它作为原生材质的精细视觉证明，也未声称完成原生明暗截图验证。浏览器验证和用户在 DSH 的最终视觉体验分开记录。

更新前已备份 Switcher 及配置。其他插件在本轮期间有独立版本更新，因此回退应仅重装 Switcher 的旧包，不整体覆盖 profile 备份。此次 Switcher 更新前后的 `cordis.yml`、`cordis.patch.yml`、`pnpm-workspace.yaml` 一致。
