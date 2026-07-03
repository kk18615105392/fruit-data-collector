import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import type { FruitRecord } from './types';

export const PHONE_SAVE_DIR = 'Pictures/FruitCollector';

function dataUrlToBase64(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(',');
  return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
}

function getExtensionFromDataUrl(dataUrl: string): string {
  const mime = dataUrl.match(/^data:([^;]+);/)?.[1] ?? 'image/jpeg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
}

async function ensureSaveDir(): Promise<void> {
  await Filesystem.mkdir({
    path: PHONE_SAVE_DIR,
    directory: Directory.ExternalStorage,
    recursive: true,
  });
}

export async function savePhotoToPhone(dataUrl: string, fileName: string): Promise<string> {
  const safeName = fileName.includes('.') ? fileName : `${fileName}.jpg`;

  if (Capacitor.isNativePlatform()) {
    await ensureSaveDir();
    await Filesystem.writeFile({
      path: `${PHONE_SAVE_DIR}/${safeName}`,
      data: dataUrlToBase64(dataUrl),
      directory: Directory.ExternalStorage,
    });
    const uri = await Filesystem.getUri({
      path: `${PHONE_SAVE_DIR}/${safeName}`,
      directory: Directory.ExternalStorage,
    });
    return uri.uri;
  }

  const blob = await (await fetch(dataUrl)).blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeName;
  anchor.click();
  URL.revokeObjectURL(url);
  return safeName;
}

export async function saveBatchMetadataToPhone(
  records: FruitRecord[],
  batchName: string,
): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  await ensureSaveDir();
  const meta = {
    savedAt: new Date().toISOString(),
    folder: PHONE_SAVE_DIR,
    total: records.length,
    records: records.map((r) => ({
      fileName: r.fileName,
      savedPath: r.savedPath,
      fruitName: r.fruitName,
      category: r.category,
      weight: r.weight,
      color: r.color,
      ripeness: r.ripeness,
      notes: r.notes,
      latitude: r.latitude,
      longitude: r.longitude,
      createdAt: r.createdAt,
    })),
  };

  const jsonName = `${batchName}.json`;
  await Filesystem.writeFile({
    path: `${PHONE_SAVE_DIR}/${jsonName}`,
    data: JSON.stringify(meta, null, 2),
    directory: Directory.ExternalStorage,
    encoding: Encoding.UTF8,
  });

  const uri = await Filesystem.getUri({
    path: `${PHONE_SAVE_DIR}/${jsonName}`,
    directory: Directory.ExternalStorage,
  });
  return uri.uri;
}

export async function saveRecordsToPhone(records: FruitRecord[]): Promise<{
  savedCount: number;
  folder: string;
  paths: string[];
}> {
  const paths: string[] = [];

  for (const record of records) {
    const ext = getExtensionFromDataUrl(record.photoDataUrl);
    const fileName = record.fileName?.includes('.') ? record.fileName : `${record.fileName ?? record.id}.${ext}`;
    const savedPath = await savePhotoToPhone(record.photoDataUrl, fileName);
    paths.push(savedPath);
    record.savedPath = `${PHONE_SAVE_DIR}/${fileName.split('/').pop()}`;
    record.fileName = fileName.split('/').pop() ?? fileName;
  }

  if (Capacitor.isNativePlatform() && records.length > 0) {
    const batchName = `batch_${Date.now()}`;
    await saveBatchMetadataToPhone(records, batchName);
  }

  return {
    savedCount: records.length,
    folder: PHONE_SAVE_DIR,
    paths,
  };
}

export function getPhoneSaveHint(): string {
  return Capacitor.isNativePlatform()
    ? `图片将保存到手机：内部存储/${PHONE_SAVE_DIR}/`
    : '浏览器环境将触发文件下载';
}
