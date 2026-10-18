# 紧凑磨砂原型检查

2026-10-18，浏览器内验证。该记录不是原生 DSH 集成验收。

- 1171 × 880 视口：浮层 820 × 222，外层 padding 8；五项宽约 157.2、高 152。
- 选择第二项后用 Tab 移到第三项：全部卡片宽高和位置不变，正文均为 13 px。
- 示例正文可容纳三行，line clamp 为 3，三行高 60 px，正文容器高 77 px（包含顶部 8 px）。短内容保留自然长度。
- 磨砂模式的计算样式为 blur(40px) saturate(1.5)；切到实底后滤镜为 none、背景 rgb(39, 40, 43)，浮层仍为 820 × 222。
- 明暗两种磨砂均渲染检查；浅色背景下正文、状态、标题和选择边线清晰可辨。
- 760 px 窄视口：连续反向移动至末项，卡片 x=581..733，列表 x=25..735，完整可见，scrollLeft=68。检查后调用 viewport.reset()。
- 仅标题模式：五项均进入 title 分支，浮层高度仍 222。恢复原文后按 Esc 取消，保留原会话与草稿，焦点回聊天阅读区。
- JavaScript 语法检查通过。保留版三个文件与 baseline-hashes.json 一致。
- 玻璃浏览器回退、减少动态、降低透明度、增加对比度有 CSS 规则；未切换用户系统设置，也未做 VoiceOver 或原生快捷键验收。

截图：compact-dark.png、compact-light.png、compact-solid.png、compact-narrow.png、compact-titles.png。
上一轮截图与检查保存在 before-glass/。本轮不把网页模糊截图视为原生桌面壁纸透出的证据。
