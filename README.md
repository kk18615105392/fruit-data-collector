# 🚗 热带水果与病害数据集采集系统 (Android & Web)

本项目是一款基于 **React 18 + Vite + TypeScript** 及 **Capacitor 7** 跨平台技术构建的**热带水果图像及标注数据集采集系统**。主要面向智慧农业研究人员与机器学习开发团队，旨在为深度学习模型训练（目标检测、图像分类）提供一套集**数据采集、定位追踪、可视化标注、边缘 AI 推理、数据集全格式导出及文档自动化生成**为一体的闭环式移动端及网页端工具链。

🌐 **在线演示 / 免安装直接使用**：[https://kk18615105392.github.io/fruit-data-collector/](https://kk18615105392.github.io/fruit-data-collector/)

---

## 📌 目录
- [🌟 核心特性](#-核心特性)
- [🧠 边缘 AI 辅助标注原理](#-边缘-ai-辅助标注原理)
- [🛠️ 技术栈](#️-技术栈)
- [🚀 快速开始 (Web 开发调试)](#-快速开始-web-开发调试)
- [📱 Android 真机打包指南](#-android-真机打包指南)
- [⛓️ 软著与文档自动化工具链](#️-软著与文档自动化工具链)
- [📁 项目目录结构](#-项目目录结构)
- [📤 导出数据集格式支持](#-导出数据集格式支持)

---

## 🌟 核心特性

1. 📷 **多维度属性采集表单**：支持采集单果图片、水果名称、大类、单果重量、外表颜色、成熟度以及详细的备注说明。
2. 📍 **GPS 定位追踪**：深度整合 Capacitor Geolocation 原生 API。在移动端采集时，系统会自动捕捉当前的经度、纬度信息并写入元数据，以便用于果树分布空间分析或带有地理标志的数据集建立。
3. 🏷️ **交互式 YOLO 目标标注板**：内置专门设计的可视化标注画框组件。拍照后，用户可通过手势或鼠标在图片上直接拖拽绘制 Bounding Box（边界框），并对标注框进行分类命名，标注坐标会自动进行标准归一化，支持多次绘制与编辑。
4. 🧠 **端侧 AI 辅助诊断**：集成了前端运行的深度学习模型。拍照后，AI 可自动识别出疑似病斑区域及疾病类型，支持一键将识别结果填充至采集表单，实现“AI 预标定 + 人工审核”的半自动数据集生产模式。
5. 📤 **全格式数据集一键打包**：采集到的图片及结构化元数据在本地聚合。支持在应用中一键导出生成 zip 压缩包，通过系统原生分享机制直接发送至开发电脑或共享群聊。
6. 📝 **软著文档自动化一键生成**：内置自动化工具链，可通过 Playwright 自动完成测试、截取高清截图，并结合 Python/Docx 库一键生成软件著作权申请所需的全部源代码和说明书文档。

---

## 🧠 边缘 AI 辅助标注原理

本系统引入了端侧 AI 推理，无需将图片上传至云端服务器，完全在用户的浏览器/手机 WebView 内部实现边缘计算：

*   **推理引擎**：基于 `onnxruntime-web` (WebAssembly 神经网络加速运行时)。
*   **图像预处理**：将采集的图像缩放至 `320x320` 像素，并将通道排列从 `RGBA` 转化为 `Float32 NCHW` 归一化张量。
*   **模型规格**：搭载 Ultralytics **YOLOv8s** 番茄叶片病害检测模型（权重基于 Hugging Face `peachfawn/yolov8-plant-disease` 的 `best.pt` 转换为 ONNX 格式）。
*   **覆盖病害**：支持番茄早疫病（Early Blight）、晚疫病（Late Blight）、叶霉病（Leaf Mold）、斑枯病（Septoria Leaf Spot）、黄化曲叶病毒（Yellow Leaf Curl Virus）等多种常见叶部病害的定位与分类。

---

## 🛠️ 技术栈

*   **前端核心**：React 18 + TypeScript + Vite + Vanilla CSS
*   **跨平台容器**：Capacitor 7 (Camera, Geolocation, Filesystem, Share, Status Bar)
*   **前端深度学习**：ONNX Runtime Web (Wasm)
*   **自动化与测试**：Playwright (E2E 测试与截图自动化), Mammoth, Docx (文档生成)
*   **后勤脚本**：Python 3 (软著组装脚本), Sharp (图片处理)

---

## 🚀 快速开始 (Web 开发调试)

### 1. 前置条件
确保您的电脑上安装了 [Node.js](https://nodejs.org/) (推荐 18+ 或 20+)。

### 2. 安装依赖并启动
```bash
# 进入项目目录
cd fruit_data

# 安装 npm 依赖
npm install

# 运行 Vite 本地开发服务器
npm run dev
```

打开浏览器访问 `http://localhost:5173` 即可进行预览与表单采集测试。
> **💡 提示**：由于浏览器安全策略限制，调用摄像头拍照功能需要通过 HTTPS 访问或使用 `localhost`/`127.0.0.1` 调试。

---

## 📱 Android 真机打包指南

本项目提供两种构建 Android 应用（APK）的途径：

### 🏁 方法 A：GitHub Actions 云端自动构建 (推荐，无需安装 Android Studio)

本项目已配置完善的 CI/CD 工作流。您不需要在本地电脑安装 Giga 级别的 Android Studio、SDK 以及 Java 配置，仅需将代码推送到您的 GitHub 仓库：

1. 在 GitHub 上新建一个仓库（如 `fruit-data-collector`），保留为空。
2. 本地执行 Git 命令配置并推送（将 URL 替换为您的仓库）：
   ```powershell
   git init
   git add .
   git commit -m "初始化热带水果采集系统"
   git branch -M main
   git remote add origin https://github.com/您的用户名/您的仓库名.git
   git push -u origin main
   ```
3. 打开 GitHub 仓库页面，点击 **Actions** 选项卡。
4. 此时会看到 `Build Android APK` 工作流正在自动运行，约耗时 5-10 分钟。
5. 构建成功后，进入该运行记录，在最底部的 **Artifacts** 区域即可下载 `tropical-fruit-collector-apk`（解压即可获得 `app-debug.apk` 并在手机上安装）。

### 💻 方法 B：本地电脑手工构建

如果您本地已装有 Android Studio，可根据以下步骤编译：

1. **环境准备**：安装 JDK 17 (或 18) 与 Android SDK，并配置好系统的 `ANDROID_HOME` 环境变量。
2. **一键构建脚本**：
   在 PowerShell 终端下运行以下命令：
   ```powershell
   # 允许执行脚本并运行一键打包脚本
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
   .\build-apk.ps1
   ```
3. **手动分步打包**：
   ```bash
   # 1. 编译 React 资源
   npm run build
   # 2. 同步资源至 Android 工程
   npx cap sync android
   # 3. 运行 Gradle 编译
   cd android
   ./gradlew assembleDebug
   ```
   编译完成后，生成的 APK 位于 `android/app/build/outputs/apk/debug/app-debug.apk`。

---

## ⛓️ 软著与文档自动化工具链

本项目拥有极其方便的自动化文档生成系统，位于 `scripts/` 目录中：

### 1. 自动截取高清运行图
利用 Playwright 启动无头浏览器并模拟 Android 真机大小，在测试流程中自动捕获不同页面的最新设计截图：
```bash
node scripts/capture-screenshots.mjs
```
截图会保存在 `data/软著材料/screenshots/` 中。

### 2. 一键生成软著申请文档
读取代码结构与截图，自动化组合为合规的**软著说明书**及**源程序代码大表**：
```bash
# 自动生成软著源代码大表 (60页) 与设计说明书模板
python scripts/generate_soft_copyright_docs.py

# 将捕获的截图自动嵌入说明书指定锚点
python scripts/insert_screenshots_to_manual.py
```
完成后，会在 `data/软著材料/` 下直接得到最终的 Word (`.docx`) 文档，您可以直接打印并提交申请。

---

## 📁 项目目录结构

```
fruit_data/
├── .github/workflows/          # GitHub Actions 自动化构建配置
├── android/                    # Capacitor 自动同步生成的原生 Android 工程
├── assets/                     # 静态资源、Logo 图标
├── data/                       # 存放数据示例及软著自动化输出文档
│   └── 软著材料/                 # 软著说明书文档模板与截图输出
├── public/                     # 静态公共资源，存放 ONNX 格式模型
├── scripts/                    # 工具链脚本（Playwright 测试、截图、软著生成、YOLO调试）
├── src/                        # React 源码
│   ├── components/             # UI 页面与交互组件
│   │   ├── HomePage.tsx        # 首页数据统计面板
│   │   ├── CollectForm.tsx     # 采集表单与摄像头调用
│   │   ├── AnnotationEditor.tsx# Bounding Box YOLO 可视化画框标注板
│   │   ├── DetectPage.tsx      # YOLOv8s ONNX 边缘 AI 推理检测页
│   │   ├── RecordList.tsx      # 历史记录列表
│   │   └── ExportPage.tsx      # 导出页
│   ├── detection/              # 前端 ONNX 推理模块（yoloDetect.ts 等）
│   ├── annotation.ts           # 归一化坐标转换与数据集构建逻辑
│   ├── export.ts               # 分享与文件导出逻辑
│   ├── storage.ts              # 本地 localStorage 数据存储读写
│   ├── fileStorage.ts          # 移动端 Capacitor 文件沙盒控制
│   ├── index.css               # 全局磨砂/玻璃拟态极简设计系统
│   └── main.tsx                # 应用入口
├── build-apk.ps1               # 本地 Android APK 打包脚本
├── capacitor.config.ts         # Capacitor 配置文件
├── package.json                # 项目依赖及运行命令
├── tsconfig.json               # TypeScript 配置
└── vite.config.ts              # Vite 打包配置
```

---

## 📤 导出数据集格式支持

在导出页面点击导出后，系统会将数据一键整理为结构化数据集，支持以下格式：

1. **YOLO 格式**：
   * 在压缩包的 `images/` 下存放图片。
   * 在 `labels/` 下存放与图片同名的 `.txt` YOLO 归一化格式文本（每一行代表一个画框：`class_id x_center y_center width height`）。
   * 自动生成包含类别总数及具体映射的 `data.yaml`。
2. **Pascal VOC 格式**：
   * 包含符合 XML 标准的图片标注属性文件（`<annotation><bndbox><xmin>...`），可直接与开源标注工具（如 LabelImg）配合。
3. **COCO 格式**：
   * 生成包含 `images`, `annotations`, `categories` 的标准 COCO JSON 格式大表 `instances_default.json`。
4. **图像分类文件夹**：
   * 自动在压缩包内按水果种类或病害标签类别创建分类文件夹，并将图片复制到对应目录下，方便直接运行分类网络训练。

---

## 📄 许可证

MIT License
