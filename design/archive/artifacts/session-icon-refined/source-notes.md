# DSH source reference

Read-only source: `/Applications/DeepSeek Harness.app/Contents/Resources/app.asar`.

Paths extracted from `dsh/node_modules/@deepseek-ai/dsh-web-frontend/dist/assets/index-CN7NIWNw.js`. No source geometry is approximated. Local design prototype only.

- Conversation: native shared component `bv` (two lines and conversation contour).
- Running: `IconLoadingOutlineRegular` / `vy`.
- Approval: `IconShieldOutlineRegular` / `o_`, with the native Pause outline placed inside.
- Question: conversation contour plus the internal native `IconQuestionOutlineRegular` paths.
- Plan review: `IconPlanOutlineRegular`, shared `n4` / ListPen paths.
- Draft: `IconEditOutlineRegular` / `ey`.
- New result: conversation symbol with a small unread badge; no success check.

UI theme source: `dsh-client-ui-theme/lib/client.js`. Hover: light `#2631480f`, dark `#ffffff14`. Primary text: light `#0f1115`, dark `#f9fafb`. Secondary text: light `#61666b`, dark `#cfd3d6`. Business blue: light `#4176e6`, dark `#7aaaff`. Menu material: light `#f8f9fa94`, dark `#43454a73`; blur 40px, saturate 150%.

The prototype uses these semantic roles with local neutral material fallbacks. Desktop wallpaper blur is not verified by browser blur.

Frontend source SHA-256: 4bc914bfbb6adbdd63953a29f63835eb7127defd2a973149d64cdab489f1a9a5
