# -*- coding: utf-8 -*-
"""生成软著截图用的示例水果图片（多种颜色/形态，便于区分）"""

import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "软著材料" / "sample-images"

# (文件名, 主色, 辅色, 病斑数量)
SPECS = [
    ("mango-001.jpg", (255, 170, 60), (220, 120, 30), 3),
    ("mango-002.jpg", (255, 195, 90), (200, 145, 50), 0),
    ("mango-003.jpg", (240, 155, 45), (180, 100, 25), 5),
    ("banana-001.jpg", (255, 220, 80), (210, 170, 40), 0),
    ("banana-002.jpg", (180, 210, 90), (130, 160, 60), 1),
    ("pineapple-001.jpg", (255, 200, 50), (180, 140, 30), 0),
    ("dragonfruit-001.jpg", (255, 80, 120), (180, 40, 90), 0),
    ("lychee-001.jpg", (220, 60, 70), (160, 30, 45), 2),
]


def _noise_layer(size: tuple[int, int], strength: int = 18) -> Image.Image:
    w, h = size
    layer = Image.new("RGB", (w, h))
    px = layer.load()
    for y in range(h):
        for x in range(w):
            g = random.randint(255 - strength, 255)
            px[x, y] = (g, g, g)
    return layer.filter(ImageFilter.GaussianBlur(radius=1))


def draw_fruit(name: str, main: tuple[int, int, int], accent: tuple[int, int, int], spots: int) -> Image.Image:
    w, h = 480, 640
    bg = Image.new("RGB", (w, h), (248, 246, 242))
    draw = ImageDraw.Draw(bg)

    # 桌面/背景渐变感
    for i in range(h):
        t = i / h
        c = tuple(int(248 - 20 * t + random.randint(-2, 2)) for _ in range(3))
        draw.line([(0, i), (w, i)], fill=c)

    cx, cy = w // 2, h // 2 + 20
    rx, ry = 150 + random.randint(-10, 10), 190 + random.randint(-15, 15)

    # 阴影
    draw.ellipse([cx - rx + 8, cy - ry + 18, cx + rx + 8, cy + ry + 18], fill=(60, 55, 50))

    # 果实主体
    draw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=main, outline=accent, width=4)

    # 高光
    hx, hy = cx - rx // 2, cy - ry // 2
    draw.ellipse([hx, hy, hx + rx // 2, hy + ry // 3], fill=tuple(min(255, c + 40) for c in main))

    # 病斑
    for _ in range(spots):
        sx = random.randint(cx - rx + 30, cx + rx - 30)
        sy = random.randint(cy - ry + 30, cy + ry - 30)
        r = random.randint(8, 22)
        draw.ellipse([sx - r, sy - r, sx + r, sy + r], fill=(55, 35, 25))
        draw.ellipse([sx - r // 2, sy - r // 2, sx + r // 2, sy + r // 2], fill=(75, 50, 35))

    # 轻微纹理
    fruit = bg.crop((cx - rx, cy - ry, cx + rx, cy + ry))
    fruit = Image.blend(fruit, _noise_layer(fruit.size, 22), 0.08)
    bg.paste(fruit, (cx - rx, cy - ry))

    return bg.filter(ImageFilter.GaussianBlur(radius=0.3))


def main() -> None:
    random.seed(42)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, main, accent, spots in SPECS:
        img = draw_fruit(name, main, accent, spots)
        path = OUT_DIR / name
        img.save(path, format="JPEG", quality=88, optimize=True)
        print(f"已生成: {path} ({path.stat().st_size // 1024} KB)")
    print(f"\n共 {len(SPECS)} 张 -> {OUT_DIR}")


if __name__ == "__main__":
    main()
