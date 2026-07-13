# -*- coding: utf-8 -*-
"""本机用 YOLOv8s tomato disease best.pt 检测图片。

用法:
  python scripts/detect_tomato_disease.py path/to/leaf.jpg
  python scripts/detect_tomato_disease.py path/to/folder --conf 0.3
"""

from __future__ import annotations

import argparse
from pathlib import Path

from ultralytics import YOLO

ROOT = Path(__file__).resolve().parents[1]
WEIGHTS = ROOT / "models" / "tomato-disease" / "yolov8s-tomato-disease-best.pt"

LABELS_ZH = {
    "Pepper__bell___Bacterial_spot": "辣椒细菌性斑点病",
    "Pepper__bell___healthy": "辣椒健康",
    "Potato___Early_blight": "马铃薯早疫病",
    "Potato___Late_blight": "马铃薯晚疫病",
    "Potato___healthy": "马铃薯健康",
    "Tomato_Bacterial_spot": "番茄细菌性斑点病",
    "Tomato_Early_blight": "番茄早疫病",
    "Tomato_Late_blight": "番茄晚疫病",
    "Tomato_Leaf_Mold": "番茄叶霉病",
    "Tomato_Septoria_leaf_spot": "番茄斑枯病",
    "Tomato_Spider_mites_Two_spotted_spider_mite": "番茄红蜘蛛（二斑叶螨）",
    "Tomato__Target_Spot": "番茄靶斑病",
    "Tomato__Tomato_YellowLeaf__Curl_Virus": "番茄黄化曲叶病毒病",
    "Tomato__Tomato_mosaic_virus": "番茄花叶病毒病",
    "Tomato_healthy": "番茄健康",
}


def main() -> None:
    parser = argparse.ArgumentParser(description="番茄病虫害检测（YOLOv8s）")
    parser.add_argument("source", help="图片文件或目录")
    parser.add_argument("--conf", type=float, default=0.25)
    parser.add_argument("--weights", type=Path, default=WEIGHTS)
    parser.add_argument("--save-dir", type=Path, default=ROOT / "data" / "detect-out")
    args = parser.parse_args()

    if not args.weights.exists():
        raise SystemExit(f"找不到权重: {args.weights}")

    model = YOLO(str(args.weights))
    args.save_dir.mkdir(parents=True, exist_ok=True)
    results = model.predict(
        source=str(args.source),
        conf=args.conf,
        save=True,
        project=str(args.save_dir),
        name="run",
        exist_ok=True,
    )

    for r in results:
        print(f"\n图片: {r.path}")
        if r.boxes is None or len(r.boxes) == 0:
            print("  （未检出）")
            continue
        for box in r.boxes:
            cls_id = int(box.cls.item())
            score = float(box.conf.item())
            en = model.names.get(cls_id, str(cls_id))
            zh = LABELS_ZH.get(en, en)
            print(f"  - {zh} ({en})  {score:.1%}")

    print(f"\n可视化结果: {args.save_dir / 'run'}")


if __name__ == "__main__":
    main()
