const mammoth = require('mammoth');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, AlignmentType } = require('docx');
const fs = require('fs');
const path = require('path');

// Screenshot mappings for the new miniprogram screens
const screenshots = {
  'fig4-2-home': path.join(__dirname, 'picture', 'screenshot-20260705-225253.png'),
  'fig4-3-collect-top': path.join(__dirname, 'picture', 'screenshot-20260705-225313.png'),
  'fig4-3-collect-bottom': path.join(__dirname, 'picture', 'screenshot-20260705-225335.png'),
  'fig4-4-list': path.join(__dirname, 'picture', 'screenshot-20260705-225346.png'),
  'fig4-5-detail': path.join(__dirname, 'picture', 'screenshot-20260705-235955.png'),
  'fig4-6-export': path.join(__dirname, 'picture', 'screenshot-20260705-235928.png'),
};

// Replacements map
const replacements = [
  ['热带水果数据集采集系统', '热带水果采集小程序'],
  ['热带水果采集APP', '热带水果采集小程序'],
  ['热带水果采集app', '热带水果采集小程序'],
  ['tropical-fruit-collector', 'tropical-fruit-miniprogram'],
  ['Android 移动终端', '微信小程序平台'],
  ['Android APK 安装包', '微信小程序'],
  ['Android 手机', '微信客户端'],
  ['Android 端', '微信小程序端'],
  ['Android Studio', '微信开发者工具'],
  ['Android', '微信'],
  ['React 18 + TypeScript + Vite', '微信小程序原生框架 (WXML + WXSS + JavaScript)'],
  ['React + TypeScript + Vite', '微信小程序原生框架 (WXML + WXSS + JavaScript)'],
  ['Capacitor 7', '微信小程序原生能力'],
  ['Capacitor 原生能力', '微信小程序原生能力'],
  ['Capacitor', '微信小程序'],
  ['React 跨平台前端', '微信小程序前端'],
  ['React', '微信小程序'],
  ['TypeScript', 'JavaScript'],
  ['Vite', '微信开发者工具'],
  ['Gradle', '微信开发者工具'],
  ['LocalStorage + Android 文件系统', 'wx.setStorage 微信本地存储'],
  ['LocalStorage', 'wx.setStorage'],
  ['Local Storage', '微信小程序本地存储'],
  ['localStorage', 'wx.setStorage'],
  ['@capacitor/camera', 'wx.chooseMedia'],
  ['Camera.getPhoto', 'wx.chooseMedia'],
  ['相机权限', '相机/相册权限'],
  ['@capacitor/geolocation', 'wx.getLocation'],
  ['Geolocation', 'wx.getLocation'],
  ['@capacitor/filesystem', 'wx.getFileSystemManager'],
  ['Capacitor Filesystem', '微信文件系统'],
  ['Directory.Data 应用私有目录', 'wx.env.USER_DATA_PATH 用户目录'],
  ['Directory.Data', 'wx.env.USER_DATA_PATH'],
  ['Directory.Cache', 'wx.env.CACHE_DIR'],
  ['@capacitor/share', 'wx.shareFileMessage'],
  ['系统分享面板', '微信分享功能'],
  ['系统分享界面', '微信分享'],
  ['唤起系统分享', '调用微信分享'],
  ['唤起系统分享面板', '调用微信分享'],
  ['@capacitor-community/media', 'wx.saveVideoToPhotosAlbum'],
  ['FruitCollector 相册', '手机相册'],
  ['FruitCollector', '手机相册'],
  ['app-debug.apk', '微信开发者工具预览'],
  ['APK 安装包', '小程序'],
  ['安装包', '小程序'],
  ['@capacitor/status-bar', '微信小程序状态栏'],
  ['原生容器', '微信小程序运行时'],
  ['原生能力', '微信小程序原生能力'],
  ['Android 6.0（API 23）', '微信 8.0'],
  ['Android 6.0', '微信 8.0'],
  ['API 23', '基础库 2.0'],
  
  // --- GPS 定位功能工作文档替换 ---
  ['、定位信息采集', ''],
  ['、GPS', ''],
  ['含图片样本数、含定位样本数', '含图片样本数'],
  ['每条样本包含水果种类、病害类型、重量、颜色、成熟度、GPS 坐标、备注及时间戳', '每条样本包含水果种类、病害类型、重量、颜色、成熟度、备注及时间戳'],
  ['四宫格统计卡片', '三宫格统计卡片'],
  ['含定位样本数', '已拍摄图片数'],
  ['GPS定位', '图片名称'],
  ['备注及 GPS 定位按钮', '备注'],
  ['GPS 坐标、', ''],
  ['GPS坐标、', ''],
  ['及定位权限', ''],
  ['、定位', ''],

  // --- ZIP 打包与导出替换 ---
  ['系统分享功能发送数据集包', '微信分享接口直接发送 ZIP 压缩包'],
  ['通过系统分享界面发送', '通过微信客户端发送 ZIP 压缩包'],
  ['生成包含 dataset.json、dataset.csv 及 images 子目录的数据集，并唤起系统分享面板', '生成包含 CSV 数据表及对应重命名图片文件夹的 ZIP 压缩包，并直接调起微信分享界面'],
  ['生成 JSON + CSV + 图片文件夹', '生成包含 CSV 数据表与对应重命名图片的 ZIP 压缩包'],
  ['JSON、CSV 格式数据集', 'CSV 格式数据集与 ZIP 压缩包'],
  ['JSON 元数据、CSV 表格及 images 图片目录', 'CSV 数据表及对应重命名图片文件夹'],
  ['JSON 格式元数据', 'CSV 数据表'],
  ['JSON/CSV/图片说明', 'CSV 数据表及图片打包说明'],
  ['导出为 JSON 元数据、CSV 表格及 images 图片目录', '导出为 CSV 数据表及对应的重命名图片'],
  ['导出 N 条样本', '导出为 ZIP 压缩包'],
  ['「全选/取消全选」', '「全选/取消全选智能切换」'],
  ['buildExportBundle 构建含 datasetName、disease 字段的 JSON 元数据结构，Native 端以自定义名称创建文件夹并写入 dataset.json、dataset.csv 及 images 子目录，Web 端则生成含 Base64 嵌入的单文件 JSON。', '通过内置的 zip.js 打包模块，将 CSV 数据表与 images 目录下的高清图片在本地直接压缩打包为 ZIP 文件，并调用微信原生分享能力进行发送。'],

  // --- 用户手册目录层级对齐样式 ---
  ['热带水果采集小程序V1.0用户手册', "热带水果采集小程序V1.0\n用户手册\n系统简介"],
  ['1. 系统简介', ''],
  ['2. 系统概述', '2.系统概述'],
  ['3. 运行环境', '3.运行环境'],
  ['4. 系统设计', '4.系统设计'],
  ['5. 操作示例', '5. 操作示例'],
  ['2.1 设计目标', '2.1 目标'],
  ['2.2 功能特点', '2.2 功能'],
  ['4.1 功能模块架构', '4.1 功能模块'],
  ['4.2.1 首页界面', '4.2.1 首页界面展示'],
  ['4.2.2 连续采集界面', '4.2.2 连续采集界面展示'],
  ['4.2.3 数据列表与详情界面', '4.2.3 数据列表与详情界面展示'],
  ['4.2.4 导出界面', '4.2.4 导出界面展示'],
  ['5.1 安装与启动', '（1）安装与启动'],
  ['5.2 连续采集操作', '（2）连续采集操作'],
  ['5.3 查看与管理数据', '（3）查看与管理数据'],
  ['5.4 导出数据集', '（4）导出数据集'],
  ['5.5 病害标注说明', '（5）病害标注说明'],

  // --- 软件设计说明书（开发说明）封面样式对齐 ---
  ['本材料用于软件著作权登记及相关成果认定。', '本材料只限用于校内人员认定成果使用，且第一完成人必须为本校教职工。'],
  ['热带水果采集小程序V1.0软件开发说明', "热带水果采集小程序 V1.0\n软件开发说明"],
  ['课题来源：热带水果种质资源数字化采集与数据集建设', '课题来源：纵向科研项目，课题名称：热带水果种质资源数字化采集与数据集建设，课题编号：（请填写）'],
  ['课题名称：热带水果采集小程序研发', '课题负责人：（请填写）'],
  ['课题起止时间：2025 年 01 月 01 日——2026 年 12 月 31 日', '课题起止时间：2025 年 01 月 01  日——2026 年 12 月 31  日'],
  ['表1 主要完成人及分工', '主要完成人及分工：'],
  ['姓名\n分工', ''],
  ['（请填写）\n软件总体设计、微信小程序端集成', '（请填写）                        （请填写）                         （请填写）\n软件总体设计、微信小程序端集成    前端界面与采集流程开发             数据存储、命名规则与导出模块开发'],
  ['（请填写）\n前端界面与采集流程开发', ''],
  ['（请填写）\n数据存储、命名规则与导出模块开发', ''],
  ['（请填写单位名称）\n2026 年 07 月 03 日', "中国农业大学\n2026 年 07 月 03 日"]
];

function applyReplacements(text) {
  let modifiedText = text;
  for (const [oldText, newText] of replacements) {
    modifiedText = modifiedText.split(oldText).join(newText);
  }
  modifiedText = modifiedText.replace(/手机\s*手机相册/g, '手机相册');
  modifiedText = modifiedText.replace(/微信小程序\s*微信小程序/g, '微信小程序');
  modifiedText = modifiedText.replace(/微信 8\.0（基础库 2\.0）/g, '微信 8.0');
  modifiedText = modifiedText.replace(/100MB 应用安装空间/g, '100MB 小程序缓存空间');
  modifiedText = modifiedText.replace(/微信本地存储\s*微信本地存储/g, '微信本地存储');
  return modifiedText;
}

function createImageRun(imagePath, width) {
  const imageData = fs.readFileSync(imagePath);
  return new ImageRun({
    data: imageData,
    transformation: {
      width: width,
      height: Math.round(width * 1.8),
    },
  });
}

function createParagraphs(text) {
  const lines = text.split('\n');
  const paragraphs = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    if (trimmedLine === '') {
      paragraphs.push(new Paragraph({ text: '' }));
      continue;
    }
    
    // Check if it's a figure name that needs screenshots inserted
    let isFig = false;
    let figKey = '';
    
    if (trimmedLine.includes('图4-2') || trimmedLine.includes('fig4-2')) {
      isFig = true;
      figKey = 'fig4-2-home';
    } else if (trimmedLine.includes('图4-3') || trimmedLine.includes('fig4-3')) {
      isFig = true;
      figKey = 'fig4-3-collect';
    } else if (trimmedLine.includes('图4-4') || trimmedLine.includes('fig4-4')) {
      isFig = true;
      figKey = 'fig4-4-list';
    } else if (trimmedLine.includes('图4-5') || trimmedLine.includes('fig4-5')) {
      isFig = true;
      figKey = 'fig4-5-detail';
    } else if (trimmedLine.includes('图4-6') || trimmedLine.includes('fig4-6') || trimmedLine.includes('图5-4') || trimmedLine.includes('fig5-4')) {
      isFig = true;
      figKey = 'fig4-6-export';
    }
    
    if (isFig) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: trimmedLine, bold: true, size: 22, font: "等线" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 100 }
      }));
      
      if (figKey === 'fig4-3-collect') {
        if (fs.existsSync(screenshots['fig4-3-collect-top'])) {
          paragraphs.push(new Paragraph({
            children: [createImageRun(screenshots['fig4-3-collect-top'], 300)],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 }
          }));
        }
        if (fs.existsSync(screenshots['fig4-3-collect-bottom'])) {
          paragraphs.push(new Paragraph({
            children: [createImageRun(screenshots['fig4-3-collect-bottom'], 300)],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }));
        }
      } else {
        const screenshotPath = screenshots[figKey];
        if (screenshotPath && fs.existsSync(screenshotPath)) {
          paragraphs.push(new Paragraph({
            children: [createImageRun(screenshotPath, 300)],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }));
        }
      }
      continue;
    }
    
    // Detect Headings matching the template outline
    if (/^(系统简介|2\.系统概述|3\.运行环境|4\.系统设计|5\.\s*操作示例|一、软件概述|二、开发环境与工具|三、系统结构设计|四、核心算法与处理流程|五、测试与运行)/.test(trimmedLine)) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: trimmedLine, bold: true, size: 32, font: "等线", color: "000000" })],
        spacing: { before: 400, after: 200 }
      }));
    } else if (/^\d+\.\d+\s/.test(trimmedLine) || /^（[一二三四五]）/.test(trimmedLine)) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: trimmedLine, bold: true, size: 28, font: "等线", color: "000000" })],
        spacing: { before: 300, after: 150 }
      }));
    } else if (/^\d+\.\d+\.\d+\s/.test(trimmedLine)) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: trimmedLine, bold: true, size: 26, font: "等线", color: "000000" })],
        spacing: { before: 200, after: 100 }
      }));
    } else {
      // Normal paragraph
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: trimmedLine, size: 24, font: "等线", color: "000000" })],
        spacing: { after: 120 }
      }));
    }
  }
  
  return paragraphs;
}

async function readDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

async function convertDocx(inputPath, outputPath) {
  try {
    console.log(`Reading: ${inputPath}`);
    const originalText = await readDocx(inputPath);
    
    console.log('Applying replacements...');
    const modifiedText = applyReplacements(originalText);
    
    console.log('Creating new document with screenshots...');
    const paragraphs = createParagraphs(modifiedText);
    
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1800,
              bottom: 1440,
              left: 1800,
            }
          }
        },
        children: paragraphs
      }]
    });
    
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outputPath, buffer);
    
    console.log(`Created: ${outputPath}`);
    return true;
  } catch (error) {
    console.error(`Error processing ${inputPath}:`, error.message);
    return false;
  }
}

async function main() {
  const 软著材料Dir = path.join(__dirname, 'data', '软著材料');
  const outputDir = path.join(__dirname, 'data', '软著材料_小程序版');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const filesToConvert = [
    '热带水果采集APP-用户手册.docx',
    '热带水果采集APP-软件设计说明书.docx',
    '热带水果数据集采集系统-用户手册.docx',
    '热带水果数据集采集系统-软件设计说明书.docx',
    '热带水果数据集采集系统-软件设计说明书-更新.docx'
  ];
  
  let successCount = 0;
  let failCount = 0;
  
  for (const file of filesToConvert) {
    const inputPath = path.join(软著材料Dir, file);
    // Keep different project names to avoid collisions and rename 软件设计说明书 to 软件开发说明
    const outputFile = file
      .replace('热带水果采集APP', '热带水果采集小程序')
      .replace('热带水果数据集采集系统', '热带水果采集小程序系统')
      .replace('软件设计说明书', '软件开发说明');
    const outputPath = path.join(outputDir, outputFile);
    
    if (fs.existsSync(inputPath)) {
      const success = await convertDocx(inputPath, outputPath);
      if (success) successCount++;
      else failCount++;
    } else {
      console.log(`File not found: ${inputPath}`);
      failCount++;
    }
  }
  
  console.log('\n=== Conversion Complete ===');
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Output directory: ${outputDir}`);
}

main().catch(console.error);
