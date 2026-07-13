/**
 * 软著手册截图（手机视口、多组示例数据、多张测试图）
 * 用法:
 *   python scripts/download_sample_fruit_images.py   # 从 Wikimedia 下载真实水果图
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
const SAMPLE_DIR = path.join(ROOT, 'data', '软著材料', 'sample-images');
const BASE_URL = process.env.APP_URL || 'http://127.0.0.1:5175';
const STORAGE_KEY = 'tropical_fruit_records_v1';
const LAST_DISEASE_KEY = 'tropical_fruit_last_disease_v1';

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

function loadSampleImages() {
  if (!fs.existsSync(SAMPLE_DIR)) {
    throw new Error(`示例图目录不存在，请先运行: python scripts/download_sample_fruit_images.py`);
  }
  const files = fs
    .readdirSync(SAMPLE_DIR)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort();
  if (files.length < 4) {
    throw new Error(`示例图不足，请先运行: python scripts/download_sample_fruit_images.py`);
  }
  const map = {};
  for (const file of files) {
    map[path.basename(file, path.extname(file))] = imageToDataUrl(path.join(SAMPLE_DIR, file));
  }
  return map;
}

function isoAt(offsetMs) {
  return new Date(Date.now() + offsetMs).toISOString();
}

function buildDemoRecords(images) {
  const img = (key, fallback) => images[key] ?? images[fallback] ?? Object.values(images)[0];

  return [
    {
      id: 'demo-mango-001',
      fruitName: '台农一号芒果',
      category: '芒果',
      photoDataUrl: img('mango-001', 'mango-001'),
      fileName: '芒果_炭疽病_黄色_成熟_001.jpg',
      savedPath: 'fruit_records/img_mango_001.jpg',
      weight: 352,
      color: '黄色',
      ripeness: '成熟',
      disease: '炭疽病',
      notes: '果园 A 区，叶面有褐色病斑',
      latitude: 18.2528,
      longitude: 109.5119,
      batchId: 'batch-mango-sanya-20260701',
      createdAt: isoAt(-86400000 * 3),
      updatedAt: isoAt(-86400000 * 3),
    },
    {
      id: 'demo-mango-002',
      fruitName: '金煌芒果',
      category: '芒果',
      photoDataUrl: img('mango-002', 'mango-002'),
      fileName: '芒果_健康_黄色_成熟_002.jpg',
      savedPath: 'fruit_records/img_mango_002.jpg',
      weight: 410,
      color: '黄色',
      ripeness: '成熟',
      disease: '健康',
      notes: '对照健康样本',
      latitude: 18.2535,
      longitude: 109.5125,
      batchId: 'batch-mango-sanya-20260701',
      createdAt: isoAt(-86400000 * 3 + 120000),
      updatedAt: isoAt(-86400000 * 3 + 120000),
    },
    {
      id: 'demo-mango-003',
      fruitName: '贵妃芒果',
      category: '芒果',
      photoDataUrl: img('mango-003', 'mango-003'),
      fileName: '芒果_炭疽病_橙黄_成熟_003.jpg',
      savedPath: 'fruit_records/img_mango_003.jpg',
      weight: 285,
      color: '黄色',
      ripeness: '成熟',
      disease: '炭疽病',
      notes: '病斑明显，用于训练集',
      latitude: 18.2541,
      longitude: 109.513,
      batchId: 'batch-mango-sanya-20260701',
      createdAt: isoAt(-86400000 * 3 + 240000),
      updatedAt: isoAt(-86400000 * 3 + 240000),
    },
    {
      id: 'demo-banana-001',
      fruitName: '巴西香蕉',
      category: '香蕉',
      photoDataUrl: img('banana-001', 'banana-001'),
      fileName: '香蕉_未知_绿色_半熟_001.jpg',
      savedPath: 'fruit_records/img_banana_001.jpg',
      weight: 180,
      color: '绿色',
      ripeness: '半熟',
      disease: '未知',
      notes: '现场无法确认叶斑类型',
      latitude: 19.0458,
      longitude: 109.8357,
      batchId: 'batch-banana-qionghai-20260702',
      createdAt: isoAt(-86400000 * 2),
      updatedAt: isoAt(-86400000 * 2),
    },
    {
      id: 'demo-banana-002',
      fruitName: '威廉香蕉',
      category: '香蕉',
      photoDataUrl: img('banana-002', 'banana-002'),
      fileName: '香蕉_叶斑病_黄色_成熟_002.jpg',
      savedPath: 'fruit_records/img_banana_002.jpg',
      weight: 165,
      color: '黄色',
      ripeness: '成熟',
      disease: '叶斑病',
      notes: '叶片黄化伴条斑',
      latitude: 19.0462,
      longitude: 109.8362,
      batchId: 'batch-banana-qionghai-20260702',
      createdAt: isoAt(-86400000 * 2 + 180000),
      updatedAt: isoAt(-86400000 * 2 + 180000),
    },
    {
      id: 'demo-pineapple-001',
      fruitName: '金钻菠萝',
      category: '菠萝',
      photoDataUrl: img('pineapple-001', 'pineapple-001'),
      fileName: '菠萝_健康_黄色_成熟_001.jpg',
      savedPath: 'fruit_records/img_pineapple_001.jpg',
      weight: 920,
      color: '黄色',
      ripeness: '成熟',
      disease: '健康',
      notes: '万宁示范基地',
      latitude: 18.795,
      longitude: 110.391,
      batchId: 'batch-pineapple-wanning-20260702',
      createdAt: isoAt(-86400000),
      updatedAt: isoAt(-86400000),
    },
    {
      id: 'demo-pineapple-002',
      fruitName: '无眼菠萝',
      category: '菠萝',
      photoDataUrl: img('pineapple-001', 'pineapple-001'),
      fileName: '菠萝_粉斑病_黄绿_半熟_002.jpg',
      savedPath: 'fruit_records/img_pineapple_002.jpg',
      weight: 880,
      color: '绿色',
      ripeness: '半熟',
      disease: '粉斑病',
      notes: '果眼周围略现粉斑',
      batchId: 'batch-pineapple-wanning-20260702',
      createdAt: isoAt(-86400000 + 300000),
      updatedAt: isoAt(-86400000 + 300000),
    },
    {
      id: 'demo-dragon-001',
      fruitName: '红心火龙果',
      category: '火龙果',
      photoDataUrl: img('dragonfruit-001', 'dragonfruit-001'),
      fileName: '火龙果_软腐病_红色_成熟_001.jpg',
      savedPath: 'fruit_records/img_dragon_001.jpg',
      weight: 420,
      color: '红色',
      ripeness: '成熟',
      disease: '软腐病',
      notes: '采后软腐样本',
      latitude: 18.77,
      longitude: 109.58,
      batchId: 'batch-dragon-ledong-20260703',
      createdAt: isoAt(-3600000 * 5),
      updatedAt: isoAt(-3600000 * 5),
    },
    {
      id: 'demo-lychee-001',
      fruitName: '妃子笑荔枝',
      category: '荔枝',
      photoDataUrl: img('lychee-001', 'lychee-001'),
      fileName: '荔枝_霜疫霉病_红色_成熟_001.jpg',
      savedPath: 'fruit_records/img_lychee_001.jpg',
      weight: 22,
      color: '红色',
      ripeness: '成熟',
      disease: '霜疫霉病',
      notes: '果面有暗褐斑点',
      latitude: 19.52,
      longitude: 110.35,
      batchId: 'batch-lychee-qiongshan-20260703',
      createdAt: isoAt(-3600000 * 2),
      updatedAt: isoAt(-3600000 * 2),
    },
    {
      id: 'demo-lychee-002',
      fruitName: '白糖罂荔枝',
      category: '荔枝',
      photoDataUrl: img('lychee-001', 'lychee-001'),
      fileName: '荔枝_健康_红色_成熟_002.jpg',
      savedPath: 'fruit_records/img_lychee_002.jpg',
      weight: 25,
      color: '红色',
      ripeness: '成熟',
      disease: '健康',
      notes: '健康对照',
      latitude: 19.521,
      longitude: 110.351,
      batchId: 'batch-lychee-qiongshan-20260703',
      createdAt: isoAt(-3600000),
      updatedAt: isoAt(-3600000),
    },
  ];
}

async function seedRecords(page, records) {
  await page.goto(BASE_URL);
  await page.evaluate(
    ([key, data, diseaseKey, disease]) => {
      localStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem(diseaseKey, disease);
    },
    [STORAGE_KEY, records, LAST_DISEASE_KEY, '炭疽病'],
  );
  await page.reload();
  await page.waitForTimeout(700);
}

async function clickNav(page, label) {
  await page.locator('.bottom-nav .nav-btn').filter({ hasText: label }).click();
  await page.waitForTimeout(450);
}

async function addBurstPhotos(page, count = 3) {
  for (let i = 0; i < count; i++) {
    const btn = page.getByRole('button', { name: /继续拍照/ });
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await page.waitForTimeout(650);
  }
}

async function captureHome(page, records) {
  await seedRecords(page, records);
}

async function captureCollect(page) {
  await page.goto(BASE_URL);
  await page.evaluate(
    ([key, diseaseKey]) => {
      localStorage.removeItem(key);
      localStorage.setItem(diseaseKey, '炭疽病');
    },
    [STORAGE_KEY, LAST_DISEASE_KEY],
  );
  await page.reload();
  await page.waitForTimeout(500);

  await clickNav(page, '采集');
  await page.selectOption('#category', '芒果');
  await page.fill('#fruitName', '台农一号');
  await page.selectOption('#color', '黄色');
  await page.selectOption('#ripeness', '成熟');
  await page.selectOption('#disease', { label: '炭疽病' });
  await page.fill('#weight', '350');
  await page.fill('#notes', '三亚基地批次，连续采集 3 张');

  await addBurstPhotos(page, 3);

  await page.locator('.photo-grid').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
}

async function captureCollectDisease(page) {
  await page.goto(BASE_URL);
  await page.evaluate(([key, val]) => localStorage.setItem(key, val), [LAST_DISEASE_KEY, '炭疽病']);
  await page.reload();
  await clickNav(page, '采集');
  await page.selectOption('#category', '芒果');
  await page.locator('#disease').scrollIntoViewIfNeeded();
  await page.selectOption('#disease', { value: '__PREVIOUS__' });
  await page.waitForTimeout(500);
}

async function captureList(page, records) {
  await seedRecords(page, records);
  await clickNav(page, '数据');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
}

async function captureDetail(page, records) {
  await seedRecords(page, records);
  await clickNav(page, '数据');
  await page.getByRole('button').filter({ hasText: '台农一号芒果' }).first().click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
}

async function captureExport(page, records) {
  await seedRecords(page, records);
  await clickNav(page, '导出');
  await page.fill('#exportName', '热带水果采集APP_20260703');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const images = loadSampleImages();
  const records = buildDemoRecords(images);
  const samplePaths = fs
    .readdirSync(SAMPLE_DIR)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort()
    .map((f) => path.join(SAMPLE_DIR, f));

  try {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch {
    throw new Error(`请先启动: npx vite preview --host 127.0.0.1 --port 5175`);
  }

  const browser = await chromium.launch({ headless: true });
  const photoQueue = ['mango-001', 'mango-002', 'mango-003'].map(
    (key) => images[key] ?? Object.values(images)[0],
  );
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    locale: 'zh-CN',
  });
  await context.addInitScript((queue) => {
    window.__E2E_PHOTO_QUEUE__ = [...queue];
  }, photoQueue);
  const page = await context.newPage();

  const actions = {
    home: () => captureHome(page, records),
    collect: () => captureCollect(page),
    'collect-disease': () => captureCollectDisease(page),
    list: () => captureList(page, records),
    detail: () => captureDetail(page, records),
    export: () => captureExport(page, records),
  };

  console.log(`示例数据: ${records.length} 条记录, ${samplePaths.length} 张示例图\n`);

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
