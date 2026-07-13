# -*- coding: utf-8 -*-
"""
从 Wikimedia Commons 下载真实水果照片，用作软著截图示例图。
均为 CC / GFDL 等自由许可，详见同目录 SOURCES.txt。

用法: python scripts/download_sample_fruit_images.py
"""

import json
import urllib.parse
import urllib.request
from io import BytesIO
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "软著材料" / "sample-images"
SOURCES_FILE = OUT_DIR / "SOURCES.txt"

USER_AGENT = (
    "FruitDataCollector/1.0 "
    "(https://github.com/kk18615105392/fruit-data-collector; soft-copyright demo images)"
)

# (本地文件名, Wikimedia Commons 文件名)
DOWNLOADS = [
    ("mango-001.jpg", "Hapus Mango.jpg"),
    ("mango-002.jpg", "Mango fruit Nam Dok Mai.jpg"),
    ("mango-003.jpg", "Mangos - single and halved.jpg"),
    ("banana-001.jpg", "Banana-Single.jpg"),
    ("banana-002.jpg", "Banana bunch in a banana farm at Chinawal.jpg"),
    ("pineapple-001.jpg", "Pineapple and cross section.jpg"),
    ("dragonfruit-001.jpg", "Dragonfruit.jpg"),
    ("lychee-001.jpg", "Lychee fruit.jpg"),
]

THUMB_WIDTH = 720
JPEG_QUALITY = 88


def commons_image_info(file_title: str) -> dict:
    params = urllib.parse.urlencode(
        {
            "action": "query",
            "titles": f"File:{file_title}",
            "prop": "imageinfo",
            "iiprop": "url|extmetadata",
            "iiurlwidth": THUMB_WIDTH,
            "format": "json",
        }
    )
    url = f"https://commons.wikimedia.org/w/api.php?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=45) as resp:
        data = json.load(resp)

    page = next(iter(data["query"]["pages"].values()))
    if "missing" in page:
        raise FileNotFoundError(f"Commons 上未找到: {file_title}")

    info = page["imageinfo"][0]
    meta = info.get("extmetadata", {})
    return {
        "download_url": info.get("thumburl") or info["url"],
        "page_url": f"https://commons.wikimedia.org/wiki/File:{urllib.parse.quote(file_title.replace(' ', '_'))}",
        "author": meta.get("Artist", {}).get("value", "Unknown").replace("<br />", " ").strip(),
        "license": meta.get("LicenseShortName", {}).get("value", "Unknown"),
    }


def download_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


def save_as_jpeg(raw: bytes, dest: Path) -> None:
    with Image.open(BytesIO(raw)) as im:
        im = im.convert("RGB")
        w, h = im.size
        if w > THUMB_WIDTH:
            h = int(h * THUMB_WIDTH / w)
            im = im.resize((THUMB_WIDTH, h), Image.Resampling.LANCZOS)
        im.save(dest, format="JPEG", quality=JPEG_QUALITY, optimize=True)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    source_lines = [
        "# 示例图片来源（Wikimedia Commons，仅用于软著手册截图演示）",
        "",
    ]

    for local_name, commons_name in DOWNLOADS:
        print(f"下载 {local_name} <- {commons_name} ...")
        info = commons_image_info(commons_name)
        raw = download_bytes(info["download_url"])
        dest = OUT_DIR / local_name
        save_as_jpeg(raw, dest)
        kb = dest.stat().st_size // 1024
        print(f"  -> {dest} ({kb} KB) [{info['license']}]")

        source_lines.extend(
            [
                f"## {local_name}",
                f"- Commons 文件: {commons_name}",
                f"- 页面: {info['page_url']}",
                f"- 作者: {info['author'][:120]}",
                f"- 许可: {info['license']}",
                "",
            ]
        )

    SOURCES_FILE.write_text("\n".join(source_lines), encoding="utf-8")
    print(f"\n共 {len(DOWNLOADS)} 张 -> {OUT_DIR}")
    print(f"来源说明: {SOURCES_FILE}")


if __name__ == "__main__":
    main()
