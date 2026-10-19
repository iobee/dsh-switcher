# DSH 适配与验证

目标宿主：安装的 DeepSeek Harness 0.2.1-rc.2。生产入口为 `src/plugin/client.js`，构建产物为 `lib/client.js`。

## 公共服务边界

| 用途 | 来源 |
| --- | --- |
| 会话标题、最近活动、空白判断 | `sessions.list` |
| 当前会话 | `sidebarRight.mounted` |
| 项目名称与归属 | `workspaces.list.items[].title / sessionIds`；未分组回退 `sessions.list.byId[id].cwd` 目录名 |
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

## 历史 0.1.2 验证

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


## 0.1.4 · 01「分签」· 2026-10-19

用户最终选择 01 后，将独立项目题签、两行标题、固定状态行与单行次要原话接入正式视图。项目归属按安装宿主的公共 `workspaces.list.items[].sessionIds` 查找，显示 `title`；回退到工作区路径或会话 `cwd` 的目录名，没有信息时显示「未分组」。核对依据为宿主 `dsh-api-workspace-controller` 的 `workspaceView` / `buildSnapshot` 以及 `dsh-client-ui-workspace` 的 `labelOf`。没有根据路径猜测已归属会话的项目名称。

- 工作区订阅实时更新改名与归属。状态短标签保留「待确认」和「待回应」的区别，并可并列「有草稿」；辅助名称保留完整状态语义。
- `npm test` 14 项通过；新增工作区命名回退、状态短标签和改名/归属更新检查。原有键盘、MRU、引用释放及草稿处理保持。
- 浏览器使用正式 `view.js`、`core.js`、`motion.js`、`switcher.css`：1280×720 明暗均为 942×190 / 182×158；480×720 下外框 448×190，末项滚动位置 494px 且完整可见。长名称、两行标题、单行摘录、状态并存、动态改名、取消、确认、草稿保留与卸载通过。
- 所有图标仍为 family 11；减少动态效果后两次图形采样一致，减少透明度/增强对比度时关闭背景模糊并强化选中边界。控制台无 error。
- 完整设计比较见项目根目录 `design-qa.md`；公开样例截图在 `reviews/2026-10-19-split-production/`，真实聊天比较图只在忽略目录。

本轮构建、打包与 push，不更新已安装 DSH。因此上述新增 UI 和工作区数据映射尚未在宿主实机联调；0.1.2 的真实松键证据与 0.1.3 的安装记录不当作 0.1.4 的安装验证。

### 后续安装验证 · 2026-10-19 22:06（Asia/Shanghai）

用户随后要求安装试用。通过应用内置官方 CLI，将日常 `desktop` profile 的 Switcher 从 0.1.3 更新到 0.1.4，已热加载。安装目录的客户端、宿主入口、包信息和插件补丁与 0.1.4 安装包逐字节一致；客户端 SHA-256 为 `ace5e464c653ac258156deea5b1a831c58fb722e3322549c6fa87f97aedd2c84`。

真实 DSH 主界面中，Ctrl+Tab 唤起浮层，可访问树显示项目「Agent」、真实会话标题、「有草稿」和「已就绪」状态。Esc 关闭后原会话与未发送草稿保持。此次没有重新验证真实键盘的独立 Control 松键，也未把系统返回的低分辨率台前调度缩略图当作精细材质验证。

更新前已备份原插件和配置；安装后 `cordis.yml`、`cordis.patch.yml`、`pnpm-workspace.yaml`、其他依赖及应用包均保持一致。回退时仅重装此前的 Switcher 包，不整体恢复 profile，以免覆盖其他插件后续变更。


## 0.1.5 · 亮色浅灰选中态 · 2026-10-19 22:25（Asia/Shanghai）

根据用户对实际亮色截图的反馈，参考暗色的柔和明度差，将亮色选中卡由高不透明度白色改为低不透明度浅灰，并加深选中卡的中性状态和摘录。增强对比度下摘录仍使用主文字色。暗色、视图结构、键盘和数据适配没有改动；0.1.4 样式完整归档。

- `npm run check`：128 个脚本、294 个本地引用通过；既有 14 项测试通过，构建和打包通过。安装包仍只有 5 个文件。
- 浏览器明暗和 480px 窄窗已验证，选中末项完整可见。暗色浮层区域前后像素一致；增强对比度下选中轮廓、摘录和无模糊背景正确。详见本轮 `reviews/2026-10-19-light-selection/design-qa.md`。
- 官方 CLI 已将日常 `desktop` profile 从 0.1.4 更新为 0.1.5，安装的 5 个文件与安装包逐字节一致。客户端 SHA-256：`074438154a9c4f12d3db18632caced12431483aa7323c9c60941f832e1005b3b`。
- 真实 DSH 的 Ctrl+Tab 正常唤起浮层，可访问树可见「Agent」项目、真实标题、「有草稿」和「已就绪」；Esc 关闭后仍在原「AI助手升级询问」会话。本轮不把这些功能检查当作原生细节材质截图，也未重新验证独立 Control 松键。
- 更新前已备份旧插件和配置。`cordis.yml`、`cordis.patch.yml`、`pnpm-workspace.yaml`、其他依赖及应用 `app.asar` 均未变化。回退应只重装旧 Switcher 包。
