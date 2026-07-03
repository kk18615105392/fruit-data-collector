# -*- coding: utf-8 -*-
"""将 screenshots 目录中的截图插入用户手册 Word 文档"""

from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "软著材料"
SCREEN_DIR = OUT_DIR / "screenshots"
MANUAL_PATH = OUT_DIR / "热带水果数据集采集系统-用户手册.docx"

# 图号关键字 -> 截图文件名
FIGURE_MAP = {
    "图4-2": "fig4-2-home.png",
    "图4-3": "fig4-3-collect.png",
    "图4-4": "fig4-4-list.png",
    "图4-5": "fig4-5-detail.png",
    "图4-6": "fig4-6-export.png",
    "图5-1": "fig4-2-home.png",
    "图5-2": "fig4-3-collect.png",
    "图5-3": "fig4-4-list.png",
    "图5-4": "fig4-6-export.png",
    "图5-5": "fig5-5-disease.png",
}


def insert_figures() -> None:
    if not MANUAL_PATH.exists():
        raise FileNotFoundError(f"未找到用户手册: {MANUAL_PATH}")

    doc = Document(str(MANUAL_PATH))
    inserted = set()

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text.startswith("图"):
            continue

        fig_key = text.split()[0]
        if fig_key not in FIGURE_MAP or fig_key in inserted:
            continue

        img_name = FIGURE_MAP[fig_key]
        img_path = SCREEN_DIR / img_name
        if not img_path.exists():
            print(f"跳过 {fig_key}，缺少 {img_name}")
            continue

        # 在同一段落后插入图片
        parent = para._element.getparent()
        idx = list(parent).index(para._element)

        new_p = doc.add_paragraph()
        new_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = new_p.add_run()
        run.add_picture(str(img_path), width=Cm(12))
        parent.insert(idx + 1, new_p._element)

        inserted.add(fig_key)
        print(f"已插入 {fig_key} <- {img_name}")

    out_path = OUT_DIR / "热带水果数据集采集系统-用户手册-含截图.docx"
    try:
        doc.save(str(out_path))
    except PermissionError:
        out_path = OUT_DIR / "热带水果数据集采集系统-用户手册-含截图-更新.docx"
        doc.save(str(out_path))
        print("原文件被占用，已另存为新文件。")
    print(f"\n已保存: {out_path}")


if __name__ == "__main__":
    insert_figures()
