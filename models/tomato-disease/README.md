# 番茄病虫害检测模型（YOLOv8s）

来源：Hugging Face [`peachfawn/yolov8-plant-disease`](https://huggingface.co/peachfawn/yolov8-plant-disease) 的 `best.pt`  
基础结构：**YOLOv8s**（small），适合移动端部署。

## 文件

| 文件 | 说明 |
|------|------|
| `yolov8s-tomato-disease-best.pt` | 原始 Ultralytics 权重（本机推理 / 再训练） |
| `yolov8s-tomato-disease-best.onnx` | 导出后的 ONNX（App WebView 推理） |
| `model.json` | 类别中英文与元数据 |

## 类别（番茄相关）

- 番茄细菌性斑点病 / 早疫病 / 晚疫病 / 叶霉病 / 斑枯病
- 番茄红蜘蛛 / 靶斑病 / 黄化曲叶病毒 / 花叶病毒 / 健康

（权重中还含辣椒、马铃薯类别；App 默认只显示番茄。）

## 本机检测

```bash
python scripts/detect_tomato_disease.py path/to/leaf.jpg
```

## 重新导出 ONNX

```bash
python -c "from ultralytics import YOLO; YOLO('models/tomato-disease/yolov8s-tomato-disease-best.pt').export(format='onnx', imgsz=640, simplify=True, opset=12)"
```
