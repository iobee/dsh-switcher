# DSH Switcher

- 本项目独立于同级 dshMagicShortcuts；Switcher 的新代码写在这里。
- 正式宿主适配在 `src/plugin/`，设计基线与历史方案继续保留。不要把浏览器原型验证称为 DSH 插件验证；验证范围见 `design/integration.md`。
- 保持 05 亮色、05 raised 暗色、Dia 尺寸与完整 11「五拍」图标，不因整理文件改变已选视觉。
- `design/archive/` 保留历史方案；当前开发使用 `src/`，示例背景放在 `demo/`。
- 主入口不能引用同级项目、绝对本机路径或本仓库之外的资源。
- 使用 `npm run check` 验证语法和资源引用。UI 变化需在浏览器验证明暗主题与窄窗口。
