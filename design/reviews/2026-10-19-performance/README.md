# 0.1.7 · 切换性能与鼠标确认

2026-10-19。用户反馈切换有轻微卡顿，并要求按住 Ctrl 时鼠标点击立即切换。保留 01 分签的全部 CSS、尺寸、字体、非选中与选中配色，完整五拍图标的状态语义、几何形状、波形和 68ms 阻尼函数。

## 复现与修复

1. macOS 浏览器实际带 Control 修饰键点击时，依次观察到 pointerdown / contextmenu / pointerup，button=0、ctrl=true，没有 click。0.1.5 保持浮层打开；0.1.7 在卡片的 Ctrl-contextmenu 中立即提交，阻止默认菜单及继续冒泡。普通点击仍提交，普通右键不会切换，随后 Control keyup 不重复提交。
2. 原 pointermove 每次刷新五张卡片的所有字段，键盘选中也走完整内容刷新。改为只有选中项变化才写前后两张卡的 aria-selected 和列表的 aria-activedescendant；内容由宿主通知驱动，每帧合并并按字段比较。横向滚动使用固定 182px 卡宽和 ResizeObserver 提供的列表宽度，避免选择后重新测量每张卡。
3. 真实宿主的事件窗口有 revision / change，并且完整 entries 是惰性展开。原实现每次流式事件、会话状态和草稿变化都访问完整 entries 并逆向扫描。新实现对连续 append 只检查新增事件，prepend 在当前窗口尚未读到用户原话时补查，缓存回退不会挡住分页中更新的原话；settle-assistant 保留原话。替换、版本跳跃或不支持的变化回退完整窗口。只有展示数据变化才发布通知；当前宿主会话不再额外 retain 或重复订阅。
4. 原动效每秒约 30 次重算并重写所有图标，路径的每条直线重复包含 24 个共线点。改为等价的两个端点、只写变化的属性；静止且已收敛的图标不参与后续帧。运行和等待图形按屏幕 requestAnimationFrame 节奏更新，减少动态效果时静止；初始图形同步绘制，关闭时取消动画。

macOS Control-click 的平台行为也可核对 [MDN](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/ctrlKey)。宿主增量窗口依据当前安装的 DSH 0.2.1-rc.2 `dsh-api-session-controller` 中 windowSnapshot / MutableSessionEventSource；读取应用包源码用于核对，没有改动应用包。

## 同场景测量

基线：提交 ce826e4（0.1.5）。同一 macOS IAB、1280×720，5 张卡，包含运行、等待、就绪、未读和草稿。页面为 `demo/performance.html`，仅模拟数据，无真实会话。before.json / after.json 为原始输出。

| 工作量 | 0.1.5 | 0.1.7 |
| --- | ---: | ---: |
| 同一卡片 200 次 pointermove：读取展示数据 | 1,000 | 0 |
| 同一卡片 200 次 pointermove：文字替换 / 属性写入 | 4,000 / 12,400 | 0 / 0 |
| 100 次选中切换：读取展示数据 | 500 | 0 |
| 100 次选中切换：文字替换 / 属性写入 | 2,000 / 6,200 | 0 / 300 |
| 2 秒动效：属性写入 | 7,320 | 1,422 |
| 2 秒动效：RAF 回调累计 JS 时间 | 34.8ms | 21.3ms |

另一个可重复的适配器负载：5,001 条历史、1,000 次 assistant 增量和 1,000 次草稿变化。完整窗口读取从 2,001 次降至 1 次，发布通知从 2,000 次降至 1 次；本轮脚本时间 13.60ms → 0.78ms。原文结果一致。原始数据在 host-before.json / host-after.json。

这些是合成负载中的插件工作量和单次测时，不是 DSH 整体帧率、冷启动或真实会话内容挂载耗时。主要依据稳定的读取和写入次数；没有将单次时间差表述为整个应用的倍数提升。

## 验证

- `npm test` 19 项通过，新增连续增量 / 缺失版本回退 / 草稿去重、鼠标提交后松键不重复、静止图标停帧、120Hz 时间采样、减少动态效果、隐藏与销毁清理。
- 浏览器实际 Control 修饰点击已从失败变为成功；另有 5 项交互断言，覆盖立即切换、松键不重入、普通右键不切换、普通点击、预览引用释放，记录在 interaction.json。
- 正式 fixture 的 Ctrl 点击后浮层关闭、目标标题变更、未发送草稿保留（control-click.json / click-result.png）。此场景采用 demo 模式隔离松键提交，明确验证点击路径，不替代真实键盘独立松键验证。
- 项目名和状态的实时更新正常。明暗 / 480px 窄窗已检查；末项滚到 494px，x=266…448 完整可见，页面无横向溢出。普通尺寸维持 942×190 / 182×158，5 个图标均为 family 11，控制台无 error。
- appearance-comparison.png 上为基线，下为优化后。减少动态效果下同状态检查通过：CSS 完全未改，图标仍为原直线几何；端点替代共线采样点产生少量抗锯齿像素差异，未把截图称为逐像素相同。
- 浏览器调试媒体及尺寸覆盖已清除。官方 CLI 已安装 0.1.7，包内 5 个文件一致；真实 DSH 中 Ctrl 修饰点击和普通点击均完成会话切换，最后恢复原会话。独立 Control 松键未另行采样，原生验证边界见 ../../integration.md。

## 重复测量

先将 ce826e4 的 `src/plugin/{view,motion,keyboard,host,core}.js` 及 switcher.css 保存至忽略目录 `review/performance/before/`。启动 `npm run dev`，分别打开 `demo/performance.html?version=before` 与 `demo/performance.html` 点击「测量工作量」。这份基线仅用于本机对照，不进入插件包。

适配器测量：`node scripts/bench-host.mjs review/performance/before/host.js` 与 `node scripts/bench-host.mjs`。只访问合成数据，不访问 DSH profile。

final result: passed
