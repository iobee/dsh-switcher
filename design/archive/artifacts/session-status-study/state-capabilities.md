# 会话状态：真实能力与设计边界

2026-10-18。核对对象为当前安装的 `/Applications/DeepSeek Harness.app/Contents/Resources/app.asar`，读取其中的 DSH 包源码与中文 README；下列 `/tmp/dsh-mru-api/` 文件为只读提取后的核对副本。本次仅做设计探索，未接入插件生产代码。

## 建议的状态体系

| 设计状态 | 真实来源 | 表达边界 |
| --- | --- | --- |
| 运行中 | Session 列表 `running`；统一 UI 状态 `running` | 核心持续动态态；子任务仍在运行可并入同一视觉状态。 |
| 需要你处理 | `pendingInteraction.kind` 为 `approval`、`plan-review` 或 `question` | 视觉可合并，tooltip 和无障碍名称保留审批、计划审阅、等待回答的具体类别。 |
| 新结果待查看 | 统一 UI 状态 `completionUnread` | 表示本轮活动结束后尚未查看。使用中性或品牌色，不用成功绿勾。 |
| 空闲 / 已查看 | 无待处理交互、无自身或子任务活动、无未读完成提醒 | 安静常态，无需持续动效。 |
| 异常 / 中止 | 已保留会话 snapshot 的错误字段，或已加载历史的 `turn/end.reason.kind` | 非列表直接字段；确认来源后才展示，不能由 `running === false` 推断。 |

草稿是**正交附加属性**：可以与运行、等待、新结果等状态同时存在。它适合轻量附加痕迹，不应抢占主状态。当前会话和键盘候选选中也是导航关系，应与业务状态分别编码。

## 可直接取得与有条件取得

### 列表直接取得

`sessions.list` 中的单条投影公开 `id`、`displayTitle`、`running`、`retainedBy`、`blank`、`updatedAt`、`formatStatus`、可选 `projectionValues` 等；没有统一的草稿、错误、pending 或完成未读字段。

证据：`/tmp/dsh-mru-api/dsh-api-session-controller-client.js:4153–4165`。

### 根级统一 UI 状态

当前安装版已有 `uiSession.sessionStatus`，提供 `getSnapshot()` 和 `subscribe(listener)`；也通过 Slot 根 hook `sessionStatus` 公开。逐会话快照含：

```js
{
  running,
  pendingInteraction,
  completionUnread
}
```

不需要为每个候选打开历史以读取这些已经存在的根级投影。Pending interaction 为进程本地投影，重连后依赖所属 Remote 重放尚未完成的请求，不能当作永久持久化事实。

证据：

- `/tmp/dsh-mru-api/dsh-client-ui-session-lib-client.js:781–789`：根级 source。
- 同文件 `:1102–1107`：公开根 hook。
- 同文件 `:976–987`：状态快照字段。
- `/tmp/dsh-mru-api/dsh-client-ui-session-README.zh.md:11–13`、`:42`：运行来源、进程本地 pending 与重连边界。

### 完成未读不等于成功

`completionUnread` 的实现观察 `running` 变化：开始运行时删除标记；此前为运行且当前结束、会话不在主视图时加入标记。进入主视图后清除。它没有在这里检查结束原因是否成功，因此视觉语义应为“新结果待查看”，不能以成功图形暗示任务成功。

证据：`/tmp/dsh-mru-api/dsh-client-ui-session-lib-client.js:948–965`。主视图判断使用 `retainedBy.mainView`，见 `:973–974`。

### 草稿、错误和中止

草稿由逐会话 Conversation store 持久化，输入 shell 绑定在现有 Session generation 上；不是会话目录的直接字段。设计时可使用输入 store 或已维护的草稿缓存；读取方式在生产接入时再落实，不应把内部 localStorage 键当作稳定插件 API。

证据：

- `/tmp/dsh-mru-api/dsh-client-ui-conversation-lib-client.js:4425–4441`：逐会话 `draft` store。
- 同文件 `:4460–4475`：读取持久化语义草稿的内部实现。
- 同文件 `:15828–15837`：按现有 binding 取得 resident input shell。

Session snapshot 有 `openState`、`openError`、`promptError`、`lastAgentError`。这些字段分别可能是历史打开失败、提交失败或实时 Agent 失败，不宜不加区分地全部当作“任务失败”。`lastAgentError` 在新 prompt 时清除。已加载历史的结束原因可以区分 `aborted`、`interrupted`、`error`；普通 `running === false` 无法区分它们。

证据：

- `/tmp/dsh-mru-api/dsh-api-session-controller-client.js:2898–2920`：snapshot 错误字段。
- 同文件 `:2642–2648`：实时 Agent 失败出口。
- 同文件 `:2341–2344`：新 prompt 清除旧错误。
- `/tmp/dsh-mru-api/dsh-client-ui-chat-lib-client.js:3640–3648`：已加载回合的中止 / 中断 / 错误原因。

## 主状态优先级

当前 DSH 侧边栏已经使用以下顺序：

1. 待处理交互：审批、计划审阅、问题。
2. 自身运行。
3. 子任务仍运行。
4. 新结果待查看。
5. 空闲。

子任务可以在待处理交互旁作为附加活动事实，但切换器的主视觉应先让用户看出“需要我处理”。异常若后续接入，必须按明确错误来源和生命周期定义优先级，当前不假设它已属于根级统一状态。

证据：`/tmp/dsh-mru-api/dsh-client-ui-workspace-client.js:1048–1053`、`:2064–2116`。子任务活动依据最新 UI 状态，尚无该状态时回退列表 `running`，见 `:1056–1057`。

## 不能无差别 retain 候选会话

`sessions.retain()` 会启动共享的首次历史打开，并保活本地会话数据、作用域 Context 和历史流。`binding(id)` 与 `scope(id)` 只是借用已经存在的 generation。Ctrl+Tab 展示候选时，不应为了取得状态或摘要无差别 retain 所有候选；优先使用列表、根级 UI 状态和已有缓存，有条件内容缺失时使用标题回退。

证据：`/tmp/dsh-mru-api/dsh-api-session-controller-README.zh.md:80–82`。

## 动效探索的共同语义

不同风格可以共享动作语义：运行为持续、有方向的活动；等待为能量聚集和停留；新结果出现一次收束后静止；异常为断裂或停顿；空闲完全安静。减弱动态效果时应保留不同静态形态，颜色只作为辅助。这里描述的是设计映射，原型演示状态不是实时 DSH 状态连接。
