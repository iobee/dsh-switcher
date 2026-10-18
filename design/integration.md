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
