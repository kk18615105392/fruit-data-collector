/**
 * 软著手册截图（手机视口、适中尺寸）
 * 用法:
 *   npx vite preview --host 127.0.0.1 --port 5175
 *   node scripts/capture-screenshots.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'data', '软著材料', 'screenshots');
const BASE_URL = process.env.APP_URL || 'http://127.0.0.1:5175';

/** 手机视口：仅截可见区域，避免 fullPage 过长 */
const VIEWPORT = { width: 390, height: 780 };

const SCREENSHOTS = [
  { name: 'fig4-2-home.png', action: 'home' },
  { name: 'fig4-3-collect.png', action: 'collect' },
  { name: 'fig5-5-disease.png', action: 'collect-disease' },
  { name: 'fig4-4-list.png', action: 'list' },
  { name: 'fig4-5-detail.png', action: 'detail' },
  { name: 'fig4-6-export.png', action: 'export' },
];

function imageToDataUrl(imagePath) {
  const buf = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function buildSeedRecords(dataUrl) {
  const now = new Date().toISOString();
  const earlier = new Date(Date.now() - 3600000).toISOString();
  return [
    {
      id: 'demo-001',
      fruitName: '台农芒果',
      category: '芒果',
      photoDataUrl: dataUrl,
      fileName: '芒果_炭疽病_黄色_成熟_001.jpg',
      savedPath: 'FruitCollector/芒果_炭疽病_黄色_成熟_001.jpg',
      weight: 350,
      color: '黄色',
      ripeness: '成熟',
      disease: '炭疽病',
      notes: '软著截图示例样本',
      latitude: 23.1291,
      longitude: 113.2644,
      batchId: 'batch-demo-mango',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-002',
      fruitName: '香蕉样本',
      category: '香蕉',
      photoDataUrl: dataUrl,
      fileName: '香蕉_未知_绿色_半熟_001.jpg',
      savedPath: 'FruitCollector/香蕉_未知_绿色_半熟_001.jpg',
      color: '绿色',
      ripeness: '半熟',
      disease: '未知',
      batchId: 'batch-demo-banana',
      createdAt: earlier,
      updatedAt: earlier,
    },
  ];
}

async function seedData(page, dataUrl) {
  await page.goto(BASE_URL);
  const records = buildSeedRecords(dataUrl);
  await page.evaluate(
    ([key, data]) => localStorage.setItem(key, JSON.stringify(data)),
    ['tropical_fruit_records_v1', records],
  );
  await page.evaluate(
    ([key, val]) => localStorage.setItem(key, val),
    ['tropical_fruit_last_disease_v1', '炭疽病'],
  );
}

async function seedLastDisease(page) {
  await page.goto(BASE_URL);
  await page.evaluate(
    ([key, val]) => localStorage.setItem(key, val),
    ['tropical_fruit_last_disease_v1', '炭疽病'],
  );
}

async function clickNav(page, label) {
  await page.locator('.bottom-nav .nav-btn').filter({ hasText: label }).click();
  await page.waitForTimeout(400);
}

async function captureHome(page) {
  await page.goto(BASE_URL);
  await page.waitForTimeout(700);
}

async function captureCollect(page) {
  await page.goto(BASE_URL);
  await clickNav(page, '采集');
  await page.selectOption('#category', '芒果');
  await page.selectOption('#color', '黄色');
  await page.selectOption('#ripeness', '成熟');
  await page.selectOption('#disease', { label: '炭疽病' });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
}

async function captureCollectDisease(page) {
  await seedLastDisease(page);
  await clickNav(page, '采集');
  await page.selectOption('#category', '芒果');
  await page.locator('#disease').scrollIntoViewIfNeeded();
  await page.selectOption('#disease', { value: '__PREVIOUS__' });
  await page.waitForTimeout(500);
}

async function captureList(page, dataUrl) {
  await seedData(page, dataUrl);
  await clickNav(page, '数据');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
}

async function captureDetail(page, dataUrl) {
  await seedData(page, dataUrl);
  await clickNav(page, '数据');
  await page.getByRole('button').filter({ hasText: '台农芒果' }).first().click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
}

async function captureExport(page, dataUrl) {
  await seedData(page, dataUrl);
  await clickNav(page, '导出');
  await page.fill('#exportName', '芒果病害数据集_20260703');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const sampleImage = path.join(ROOT, 'android', 'app', 'src', 'main', 'res', 'drawable', 'splash.png');
  if (!fs.existsSync(sampleImage)) {
    throw new Error(`示例图片不存在: ${sampleImage}`);
  }
  const dataUrl = imageToDataUrl(sampleImage);

  try {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch {
    throw new Error(`请先启动: npx vite preview --host 127.0.0.1 --port 5175`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    locale: 'zh-CN',
  });
  const page = await context.newPage();

  const actions = {
    home: () => captureHome(page),
    collect: () => captureCollect(page),
    'collect-disease': () => captureCollectDisease(page),
    list: () => captureList(page, dataUrl),
    detail: () => captureDetail(page, dataUrl),
    export: () => captureExport(page, dataUrl),
  };

  for (const item of SCREENSHOTS) {
    console.log(`截图: ${item.name} ...`);
    await actions[item.action]();
    await page.screenshot({
      path: path.join(OUT_DIR, item.name),
      fullPage: false,
      type: 'png',
    });
    const stat = fs.statSync(path.join(OUT_DIR, item.name));
    console.log(`  -> ${(stat.size / 1024).toFixed(0)} KB`);
  }

  await browser.close();
  console.log(`\n完成，共 ${SCREENSHOTS.length} 张（视口 ${VIEWPORT.width}x${VIEWPORT.height}）`);
  console.log(OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
