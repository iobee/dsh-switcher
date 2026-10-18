# 浏览器验证

2026-10-18。设计原型，未接入 DSH；验证说明不代表用户已接受该视觉方向。

- 实际渲染：1280 × 720 下浮层 744 × 140；五个项目约 142.8 × 126，预览约 130.8 × 86，状态图标 20 × 20。卡片 transform 为 none。
- 明暗两套均实拍查看：`review/01-light.png`、`review/02-dark.png`。标题统一基线，长标题省略，完整标题保留在 tooltip 与无障碍名称中。
- 668 × 787 窄窗口：页面无横向溢出；候选项目横向滚动后完整进入视口。见 `review/03-narrow.png`、`review/responsive-checks.json`。
- 方向键移动、Esc 取消、Enter 进入、Ctrl+Tab 快速返回均通过。控制台无 error/warn。见 `review/interaction-checks.json`。
- 模拟减少透明度、高对比度时，背景模糊关闭并显示选中描边；减少动态效果沿用已有五拍引擎的媒体查询。未进行真实屏幕阅读器测试。
- 之前 299 个原型文件的 SHA-256 未变，五拍动效引擎逐字节未变。见 `review/preservation-check.json`。

视觉参考的来源和测量限制见 `design-notes.md`。当前页面为独立版本，归档入口已增加链接。
