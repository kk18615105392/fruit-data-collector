# 热带水果数据集采集 App

一款用于采集热带水果图像与标注数据的移动应用，支持拍照、定位、分类标注，并可导出为 JSON / CSV 数据集，适合机器学习训练数据收集。

## 功能

- 📷 **拍照采集**：调用相机或相册选取水果图片
- 🏷️ **多维标注**：种类、重量、颜色、成熟度、备注
- 📍 **GPS 定位**：记录样本采集位置（Android 端）
- 📋 **数据管理**：浏览、搜索、编辑、删除样本
- 📤 **一键导出**：导出 JSON + CSV + 图片（Android 端分享）

## 支持的热带水果

芒果、菠萝、火龙果、榴莲、山竹、荔枝、龙眼、木瓜、香蕉、椰子、百香果、红毛丹、释迦、莲雾、番石榴、杨桃等。

---

## 快速开始（浏览器预览）

```bash
npm install
npm run dev
```

浏览器打开 http://localhost:5173 即可预览（Web 端可测试界面，拍照需 HTTPS 或 localhost）。

---

## 打包 Android APK（推荐：GitHub 云端构建，无需安装 Android Studio）

本仓库已配置 **GitHub Actions**，推送代码后会在云端自动构建 APK，**你的电脑不需要安装 Android Studio**。

### 第一步：创建 GitHub 仓库

1. 打开 [github.com/new](https://github.com/new) 创建一个新仓库（例如 `fruit-data-collector`）
2. 保持仓库为 **Public**（免费账户的 Actions 对公开仓库无限制）

### 第二步：推送代码到 GitHub

在项目目录打开终端，执行：

```powershell
cd "c:\Users\崔泽坤\Desktop\fruit_data"

git init
git add .
git commit -m "初始提交：热带水果采集 App"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

> 将 `你的用户名/你的仓库名` 替换成你实际创建的仓库地址。

### 第三步：等待云端构建

1. 打开 GitHub 仓库页面
2. 点击顶栏 **Actions**
3. 看到 **Build Android APK** 工作流正在运行（约 5～10 分钟）
4. 绿色勾号表示构建成功

也可以手动触发：Actions → Build Android APK → **Run workflow**

### 第四步：下载 APK 并安装到手机

1. 进入成功的 Actions 运行记录
2. 页面底部 **Artifacts** 区域
3. 下载 `tropical-fruit-collector-apk`（zip 包，解压得到 `app-debug.apk`）
4. 将 APK 传到手机安装

> 首次安装可能提示「未知来源」：在系统设置中允许安装此来源的应用即可。

---

## 打包 Android APK（本机构建，可选）

如果你已安装 Android Studio，也可以在本机打包：

### 前置要求

1. **Node.js** 18+
2. **Java JDK** 17 或 18
3. **Android Studio**（含 Android SDK）

安装 Android Studio 后，设置环境变量：

```powershell
# Windows PowerShell 示例
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools"
```

### 一键构建

```powershell
.\build-apk.ps1
```

生成的 APK 位于 `android\app\build\outputs\apk\debug\app-debug.apk`。

<details>
<summary>手动分步构建（展开）</summary>

### 步骤 1：安装依赖并构建 Web 资源

```bash
npm install
npm run build
```

### 步骤 2：同步 Android 平台

```bash
npx cap sync android
```

### 步骤 3：构建 Debug APK

```bash
cd android
.\gradlew assembleDebug
```

</details>

## 导出数据格式

导出的 `dataset.json` 结构示例：

```json
{
  "version": "1.0",
  "exportedAt": "2026-07-03T10:00:00.000Z",
  "totalRecords": 2,
  "records": [
    {
      "id": "uuid",
      "imageFile": "images/0001_abc12345.jpg",
      "fruitName": "台农芒果",
      "category": "芒果",
      "weight": 350,
      "color": "黄色",
      "ripeness": "成熟",
      "latitude": 23.129,
      "longitude": 113.264,
      "createdAt": "..."
    }
  ]
}
```

Web 端导出为单个 JSON 文件（图片以 Base64 嵌入）；Android 端导出为文件夹并通过系统分享。

---

## 项目结构

```
fruit_data/
├── src/
│   ├── components/     # UI 组件
│   ├── App.tsx         # 主应用
│   ├── storage.ts      # 本地存储
│   ├── export.ts       # 导出逻辑
│   └── constants.ts    # 水果种类等常量
├── android/            # Capacitor Android 工程（cap add android 后生成）
├── capacitor.config.ts
└── package.json
```

---

## 技术栈

- React 18 + TypeScript
- Vite
- Capacitor 7（Camera、Geolocation、Filesystem、Share）

## 许可证

MIT
