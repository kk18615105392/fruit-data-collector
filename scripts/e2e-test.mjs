/**
 * 端到端测试：多图保存 + 导出
 * 用法:
 *   npx vite preview --host 127.0.0.1 --port 5175
 *   node scripts/e2e-test.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.APP_URL || 'http://127.0.0.1:5175';
const STORAGE_KEY = 'tropical_fruit_records_v1';

const SAMPLE_IMAGE = path.join(ROOT, 'android', 'app', 'src', 'main', 'res', 'drawable', 'splash.png');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function clickNav(page, label) {
  await page.locator('.bottom-nav .nav-btn').filter({ hasText: label }).click();
  await page.waitForTimeout(400);
}

async function pickPhoto(page, imagePath) {
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 15000 }),
    page.getByRole('button', { name: '从相册添加' }).click(),
  ]);
  await fileChooser.setFiles(imagePath);
  await page.waitForTimeout(600);
}

async function testMultiPhotoSave(page) {
  console.log('\n=== 测试 1：连续拍摄 3 张并保存 ===');

  await page.goto(BASE_URL);
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
  await page.waitForTimeout(600);

  await clickNav(page, '采集');
  await page.selectOption('#category', '芒果');
  await page.selectOption('#disease', { label: '炭疽病' });
  await page.selectOption('#color', '黄色');
  await page.selectOption('#ripeness', '成熟');

  for (let i = 1; i <= 3; i++) {
    await page.getByRole('button', { name: /继续拍照/ }).click();
    await page.waitForTimeout(800);
    const count = await page.locator('.photo-grid-item').count();
    assert(count === i, `第 ${i} 张拍摄后应有 ${i} 张，实际 ${count}`);
    console.log(`  已拍摄 ${count} 张`);
  }

  const downloads = [];
  page.on('download', (d) => downloads.push(d));

  await page.getByRole('button', { name: /保存 3 张到手机/ }).click();

  // 等待保存完成（压缩 + localStorage + web 下载）
  await page.waitForFunction(
    () => document.querySelector('.alert-success') || document.querySelector('.alert-error'),
    { timeout: 30000 },
  );

  const errorEl = page.locator('.alert-error');
  if (await errorEl.isVisible()) {
    const msg = await errorEl.textContent();
    throw new Error(`保存失败: ${msg}`);
  }

  const successMsg = await page.locator('.alert-success').textContent();
  console.log(`  ${successMsg?.trim()}`);

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  }, STORAGE_KEY);

  assert(stored.length === 3, `localStorage 应有 3 条，实际 ${stored.length}`);
  assert(stored.every((r) => r.batchId), '每条记录应有 batchId');
  assert(stored.every((r) => r.fileName?.includes('芒果')), '应保留中文文件名');
  assert(stored.every((r) => r.photoDataUrl?.startsWith('data:image')), '应有缩略图 dataUrl');

  console.log(`  Web 端触发 ${downloads.length} 次图片下载`);
  console.log('✓ 多图保存测试通过');
  return stored;
}

async function testExport(page) {
  console.log('\n=== 测试 2：自定义名称 + 选择批次导出 ===');

  await clickNav(page, '导出');
  await page.waitForTimeout(500);

  const datasetCount = await page.locator('.export-dataset-item').count();
  assert(datasetCount >= 1, `应有至少 1 个批次，实际 ${datasetCount}`);
  console.log(`  可导出批次数: ${datasetCount}`);

  await page.fill('#exportName', 'E2E测试数据集_20260703');

  if (datasetCount > 0) {
    await page.getByRole('button', { name: '取消全选' }).click();
    await page.locator('.export-dataset-item').first().click();
  }

  const selectedCount = await page
    .locator('.detail-row')
    .filter({ hasText: '样本总数' })
    .locator('.detail-value')
    .textContent();
  assert(Number.parseInt(selectedCount ?? '0', 10) > 0, '应选中至少 1 条样本');
  console.log(`  已选样本: ${selectedCount?.trim()}`);

  let downloadedName = '';
  page.once('download', async (download) => {
    downloadedName = download.suggestedFilename();
  });

  await page.getByRole('button', { name: /导出 .* 条样本/ }).click();
  await page.waitForFunction(
    () => {
      const exportSection = document.querySelector('#exportName')?.closest('section');
      return exportSection?.querySelector('.alert-success') || exportSection?.querySelector('.alert-error');
    },
    { timeout: 30000 },
  );

  const exportSection = page.locator('section').filter({ has: page.locator('#exportName') });
  const exportError = await exportSection.locator('.alert-error').textContent().catch(() => '');
  assert(!exportError, `导出失败: ${exportError}`);

  await page.waitForTimeout(500);
  assert(downloadedName.includes('E2E'), `导出文件名应含自定义名，实际: ${downloadedName || '(无下载)'}`);

  const successMsg = await exportSection.locator('.alert-success').textContent();
  console.log(`  ${successMsg?.trim()}`);
  console.log(`  下载文件: ${downloadedName}`);
  console.log('✓ 导出测试通过');
}

async function testExportAllBatches(page) {
  console.log('\n=== 测试 3：全选导出 UI ===');

  await clickNav(page, '数据');
  await clickNav(page, '导出');
  await page.waitForTimeout(400);

  const toggleBtn = page.getByRole('button', { name: /全选|取消全选/ });
  const label = (await toggleBtn.textContent())?.trim() ?? '';
  if (label.includes('全选') && !label.includes('取消')) {
    await toggleBtn.click();
  }

  const total = await page
    .locator('.detail-row')
    .filter({ hasText: '样本总数' })
    .locator('.detail-value')
    .textContent();

  assert(Number.parseInt(total ?? '0', 10) === 3, `全选后应显示 3 条，实际 ${total}`);
  console.log(`  全选样本数: ${total?.trim()}`);
  console.log('✓ 全选导出 UI 正常');
}

async function main() {
  assert(fs.existsSync(SAMPLE_IMAGE), `测试图片不存在: ${SAMPLE_IMAGE}`);

  try {
    const res = await fetch(BASE_URL);
    assert(res.ok, `HTTP ${res.status}`);
  } catch {
    throw new Error(`预览服务未启动，请先运行: npx vite preview --host 127.0.0.1 --port 5175`);
  }

  const photoDataUrl = `data:image/png;base64,${fs.readFileSync(SAMPLE_IMAGE).toString('base64')}`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true, locale: 'zh-CN' });
  await context.addInitScript((url) => {
    window.__E2E_PHOTO_URL__ = url;
  }, photoDataUrl);
  const page = await context.newPage();

  try {
    await testMultiPhotoSave(page);
    await testExport(page);
    await testExportAllBatches(page);
    console.log('\n========================================');
    console.log('全部 E2E 测试通过 ✓');
    console.log('（Web 端已验证；Android 原生保存需在真机复测）');
    console.log('========================================\n');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('\n✗ E2E 测试失败:', err.message);
  process.exit(1);
});
