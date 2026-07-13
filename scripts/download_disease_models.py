# -*- coding: utf-8 -*-
"""下载多作物病虫害 YOLOv8 best.pt，并导出为微信小程序可用的 ONNX。

说明：
- .pt 无法直接在小程序运行，必须导出 .onnx，再通过 wx.createInferenceSession 推理
- 小程序主包有大小限制，模型默认放到 miniprogram/models/ 并通过 downloadFile 缓存

用法：
  python scripts/download_disease_models.py
"""

from __future__ import annotations

import json
import shutil
import urllib.request
from pathlib import Path

from ultralytics import YOLO

ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / "models"
MP_MODELS = ROOT / "miniprogram" / "models"
UA = {"User-Agent": "FruitCollector/1.0 (disease-model-download)"}

# PlantVillage 标准 38 类顺序（本仓库权重类别 id 与此对齐）
PLANTVILLAGE_38 = [
    "Apple___Apple_scab",
    "Apple___Black_rot",
    "Apple___Cedar_apple_rust",
    "Apple___healthy",
    "Blueberry___healthy",
    "Cherry_(including_sour)___Powdery_mildew",
    "Cherry_(including_sour)___healthy",
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
    "Corn_(maize)___Common_rust_",
    "Corn_(maize)___Northern_Leaf_Blight",
    "Corn_(maize)___healthy",
    "Grape___Black_rot",
    "Grape___Esca_(Black_Measles)",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
    "Grape___healthy",
    "Orange___Haunglongbing_(Citrus_greening)",
    "Peach___Bacterial_spot",
    "Peach___healthy",
    "Pepper,_bell___Bacterial_spot",
    "Pepper,_bell___healthy",
    "Potato___Early_blight",
    "Potato___Late_blight",
    "Potato___healthy",
    "Raspberry___healthy",
    "Soybean___healthy",
    "Squash___Powdery_mildew",
    "Strawberry___Leaf_scorch",
    "Strawberry___healthy",
    "Tomato___Bacterial_spot",
    "Tomato___Early_blight",
    "Tomato___Late_blight",
    "Tomato___Leaf_Mold",
    "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite",
    "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato___Tomato_mosaic_virus",
    "Tomato___healthy",
]

PLANTVILLAGE_ZH = {
    "Apple___Apple_scab": "苹果疮痂病",
    "Apple___Black_rot": "苹果黑腐病",
    "Apple___Cedar_apple_rust": "苹果锈病",
    "Apple___healthy": "苹果健康",
    "Blueberry___healthy": "蓝莓健康",
    "Cherry_(including_sour)___Powdery_mildew": "樱桃白粉病",
    "Cherry_(including_sour)___healthy": "樱桃健康",
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot": "玉米灰斑病",
    "Corn_(maize)___Common_rust_": "玉米普通锈病",
    "Corn_(maize)___Northern_Leaf_Blight": "玉米大斑病",
    "Corn_(maize)___healthy": "玉米健康",
    "Grape___Black_rot": "葡萄黑腐病",
    "Grape___Esca_(Black_Measles)": "葡萄食管病",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)": "葡萄叶斑病",
    "Grape___healthy": "葡萄健康",
    "Orange___Haunglongbing_(Citrus_greening)": "柑橘黄龙病",
    "Peach___Bacterial_spot": "桃细菌性斑点病",
    "Peach___healthy": "桃健康",
    "Pepper,_bell___Bacterial_spot": "辣椒细菌性斑点病",
    "Pepper,_bell___healthy": "辣椒健康",
    "Potato___Early_blight": "马铃薯早疫病",
    "Potato___Late_blight": "马铃薯晚疫病",
    "Potato___healthy": "马铃薯健康",
    "Raspberry___healthy": "覆盆子健康",
    "Soybean___healthy": "大豆健康",
    "Squash___Powdery_mildew": "瓜类白粉病",
    "Strawberry___Leaf_scorch": "草莓叶焦病",
    "Strawberry___healthy": "草莓健康",
    "Tomato___Bacterial_spot": "番茄细菌性斑点病",
    "Tomato___Early_blight": "番茄早疫病",
    "Tomato___Late_blight": "番茄晚疫病",
    "Tomato___Leaf_Mold": "番茄叶霉病",
    "Tomato___Septoria_leaf_spot": "番茄斑枯病",
    "Tomato___Spider_mites Two-spotted_spider_mite": "番茄红蜘蛛",
    "Tomato___Target_Spot": "番茄靶斑病",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus": "番茄黄化曲叶病毒病",
    "Tomato___Tomato_mosaic_virus": "番茄花叶病毒病",
    "Tomato___healthy": "番茄健康",
}

# 水果 -> 使用哪个模型包（按作物特化优先）
FRUIT_MODEL_MAP = {
    "番茄": "tomato",
    "芒果": "mango",
    "香蕉": "banana",
    "其他": "plantvillage",
    "菠萝": "plantvillage",
    "火龙果": "plantvillage",
    "荔枝": "plantvillage",
    "木瓜": "plantvillage",
    "番石榴": "plantvillage",
}


def download(url: str, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 1000:
        print(f"已存在: {dest}")
        return dest
    print(f"下载 {url}")
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=180) as resp, open(dest, "wb") as f:
        shutil.copyfileobj(resp, f)
    print(f"  -> {dest} ({dest.stat().st_size / 1e6:.1f} MB)")
    return dest


def export_onnx(pt_path: Path, onnx_path: Path, imgsz: int = 320) -> Path:
    model = YOLO(str(pt_path))
    exported = Path(str(model.export(format="onnx", imgsz=imgsz, simplify=True, opset=12, dynamic=False)))
    onnx_path.parent.mkdir(parents=True, exist_ok=True)
    if exported.resolve() != onnx_path.resolve():
        if onnx_path.exists():
            onnx_path.unlink()
        exported.replace(onnx_path)
    print(f"ONNX: {onnx_path} ({onnx_path.stat().st_size / 1e6:.1f} MB)")
    return onnx_path


def write_meta(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def inspect_names(pt_path: Path) -> dict:
    model = YOLO(str(pt_path))
    return {int(k): str(v) for k, v in model.names.items()}


def main() -> None:
    MODELS.mkdir(parents=True, exist_ok=True)
    MP_MODELS.mkdir(parents=True, exist_ok=True)

    catalog = {
        "version": 1,
        "inputSize": 320,
        "note": "微信小程序通过 wx.createInferenceSession 加载 onnx；.pt 仅本地训练/导出用",
        "models": {},
        "fruitModelMap": FRUIT_MODEL_MAP,
    }

    # 1) tomato (already downloaded)
    tomato_pt = MODELS / "tomato-disease" / "yolov8s-tomato-disease-best.pt"
    tomato_onnx = MODELS / "tomato-disease" / "yolov8s-tomato-disease-best-320.onnx"
    if tomato_pt.exists():
        if not tomato_onnx.exists():
            export_onnx(tomato_pt, tomato_onnx, 320)
        names = inspect_names(tomato_pt)
        labels_zh = {
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
            "Pepper__bell___Bacterial_spot": "辣椒细菌性斑点病",
            "Pepper__bell___healthy": "辣椒健康",
            "Potato___Early_blight": "马铃薯早疫病",
            "Potato___Late_blight": "马铃薯晚疫病",
            "Potato___healthy": "马铃薯健康",
        }
        catalog["models"]["tomato"] = {
            "id": "tomato",
            "base": "yolov8s",
            "imgsz": 320,
            "pt": str(tomato_pt.relative_to(ROOT)).replace("\\", "/"),
            "onnx": "models/tomato/best.onnx",
            "names": names,
            "labelsZh": labels_zh,
            "source": "https://huggingface.co/peachfawn/yolov8-plant-disease",
        }
        mp_dir = MP_MODELS / "tomato"
        mp_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(tomato_onnx, mp_dir / "best.onnx")
        write_meta(mp_dir / "meta.json", catalog["models"]["tomato"])

    # 2) plantvillage multi-crop
    pv_pt = MODELS / "plant-disease" / "yolov8n-plantvillage-best.pt"
    pv_onnx = MODELS / "plant-disease" / "yolov8n-plantvillage-best.onnx"
    if pv_pt.exists():
        if not pv_onnx.exists():
            export_onnx(pv_pt, pv_onnx, 320)
        names = {i: PLANTVILLAGE_38[i] for i in range(38)}
        catalog["models"]["plantvillage"] = {
            "id": "plantvillage",
            "base": "yolov8n",
            "imgsz": 320,
            "pt": str(pv_pt.relative_to(ROOT)).replace("\\", "/"),
            "onnx": "models/plantvillage/best.onnx",
            "names": names,
            "labelsZh": PLANTVILLAGE_ZH,
            "source": "https://huggingface.co/MudassirFayaz/YoloV8-PlantVillage-classes-detection",
        }
        mp_dir = MP_MODELS / "plantvillage"
        mp_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(pv_onnx, mp_dir / "best.onnx")
        write_meta(mp_dir / "meta.json", catalog["models"]["plantvillage"])

    # 3) mango / banana / pomegranate specific
    gh_base = "https://raw.githubusercontent.com/AshishTukaral/Fruit-Ripeness-and-Disease-Detection/main/"
    fruit_specific = {
        "mango": ("train/weights/best.pt", "yolov8"),
        "banana": ("train2/weights/best.pt", "yolov8"),
        "pomegranate": ("train4/weights/best.pt", "yolov8"),
    }
    for crop, (rel, base) in fruit_specific.items():
        pt_path = MODELS / "fruit-specific" / f"{crop}-best.pt"
        onnx_path = MODELS / "fruit-specific" / f"{crop}-best-320.onnx"
        download(gh_base + rel, pt_path)
        names = inspect_names(pt_path)
        print(f"{crop} classes:", names)
        export_onnx(pt_path, onnx_path, 320)
        # 粗略中文：把下划线/英文尽量保留并附加原名
        labels_zh = {v: v.replace("_", " ") for v in names.values()}
        catalog["models"][crop] = {
            "id": crop,
            "base": base,
            "imgsz": 320,
            "pt": str(pt_path.relative_to(ROOT)).replace("\\", "/"),
            "onnx": f"models/{crop}/best.onnx",
            "names": names,
            "labelsZh": labels_zh,
            "source": "https://github.com/AshishTukaral/Fruit-Ripeness-and-Disease-Detection",
        }
        mp_dir = MP_MODELS / crop
        mp_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(onnx_path, mp_dir / "best.onnx")
        write_meta(mp_dir / "meta.json", catalog["models"][crop])

    write_meta(MP_MODELS / "catalog.json", catalog)
    write_meta(MODELS / "disease-models-catalog.json", catalog)
    print("\n完成。小程序模型目录:", MP_MODELS)
    for p in sorted(MP_MODELS.rglob("*")):
        if p.is_file():
            print(f"  {p.relative_to(ROOT)} ({p.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
