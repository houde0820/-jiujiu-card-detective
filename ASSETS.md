# 手绘素材说明

生成方式：内置 imagegen。风格参考为用户提供的植物大战僵尸经典主菜单截图；生成背景和空白石碑素材，未将截图中的文字或菜单做成图片。

- `dist/assets/garden-menu-background.webp`：蓝天、房屋、树木与花园背景。
- `dist/assets/garden-stone-panel.webp`：有透明背景的空白石碑面板。

生成后使用cwebp转换格式以减小网页体积，石碑保留透明度。界面文字、数字和交互仍由HTML提供。

## 背景生成提示词

Use case: stylized-concept. Asset type: illustrated background for a playable children's browser math card game, landscape 1536x1024. Input image: supplied Plants vs. Zombies classic main-menu screenshot is a STYLE REFERENCE, not a layout to reproduce. Create a matching hand-painted 2D cartoon suburban garden background: vivid azure blue sky, soft fluffy clouds, rounded leafy trees at upper corners, a distant small crooked house and picket fence on the far left, lush tufts of hand-drawn green grass along the lower edges and a few yellow flowers, one little teal watering can near the lower-left edge. Use bold irregular near-black ink outlines, slightly wonky perspective, lively painted texture and saturated colors, the exact playful spooky-cute cartoon quality of the reference. Leave the central 75 percent calm and open, mostly sky and a lawn clearing, because live HTML card tables will be placed over it. No stone menu, no UI panels, no buttons, no text, no lettering, no numerals, no logo, no watermark, no extra characters. Full bleed scene, opaque background.

## 石碑生成提示词

Use case: stylized-concept. Asset type: reusable blank gravestone-shaped game UI panel, landscape 1536x1024 with genuinely transparent background. Input image: supplied Plants vs. Zombies classic main-menu screenshot is a STYLE REFERENCE. Isolate ONE large blank broad gray-blue gravestone slab, filling most of the image. It has a gently arched irregular top, chunky chipped edges, a dark near-black cartoon ink outline, thick uneven bevels, a few angular cracks and very subtle painted mottled stone texture. Match the screenshot's wonky hand-painted 2D spooky-cute main-menu gravestone, not realistic stone, not smooth modern UI. Broad center must be blank, light neutral slate gray and calm for legible dark live HTML text and controls; concentrate cracks, chips and small moss patches near the outer edges, no busy detail in the center. Single continuous slab, no internal menu strips. No text, no letters, no numerals, no logos, no UI content, no objects outside the slab. Transparent alpha everywhere outside the outline. No drop shadow extending far outside the slab. Straight-on framing with a slightly asymmetric outline; not a tilted perspective render.
