import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import type { FruitRecord } from './types';

export const PHONE_ALBUM_NAME = 'FruitCollector';
export const PHONE_SAVE_DIR = PHONE_ALBUM_NAME;

const METADATA_DIR = PHONE_SAVE_DIR;
const SAVE_TIMEOUT_MS = 45_000;

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

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label}超时，请重试`)), SAVE_TIMEOUT_MS);
    }),
  ]);
}

function makeUniqueFileName(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  const base = dot >= 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot >= 0 ? fileName.slice(dot) : '.jpg';
  return `${base}_${Date.now()}${ext}`;
}

async function ensureMetadataDir(): Promise<void> {
  await Filesystem.mkdir({
    path: METADATA_DIR,
    directory: Directory.External,
    recursive: true,
  });
}

async function savePhotoToAppDir(dataUrl: string, safeName: string): Promise<string> {
  await ensureMetadataDir();
  await Filesystem.writeFile({
    path: `${METADATA_DIR}/${safeName}`,
    data: dataUrlToBase64(dataUrl),
    directory: Directory.External,
  });
  return `${METADATA_DIR}/${safeName}`;
}

async function savePhotoToGallery(dataUrl: string, safeName: string): Promise<void> {
  const { Media } = await import('@capacitor-community/media');

  const tempName = `tmp_${Date.now()}_${safeName}`;
  await Filesystem.writeFile({
    path: tempName,
    data: dataUrlToBase64(dataUrl),
    directory: Directory.Cache,
  });

  const { uri } = await Filesystem.getUri({
    path: tempName,
    directory: Directory.Cache,
  });

  const { albums } = await Media.getAlbums();
  let album = albums.find((item) => item.name === PHONE_ALBUM_NAME);
  if (!album) {
    await Media.createAlbum({ name: PHONE_ALBUM_NAME });
    const refreshed = await Media.getAlbums();
    album = refreshed.albums.find((item) => item.name === PHONE_ALBUM_NAME);
  }
  if (!album) {
    throw new Error(`无法创建相册「${PHONE_ALBUM_NAME}」`);
  }

  const baseName = safeName.replace(/\.[^.]+$/, '');
  await Media.savePhoto({
    path: uri,
    albumIdentifier: album.identifier,
    fileName: baseName,
  });

  try {
    await Filesystem.deleteFile({ path: tempName, directory: Directory.Cache });
  } catch {
    // 临时文件清理失败不影响主流程
  }
}

export async function savePhotoToPhone(dataUrl: string, fileName: string): Promise<string> {
  const safeName = makeUniqueFileName(fileName.includes('.') ? fileName : `${fileName}.jpg`);

  if (Capacitor.isNativePlatform()) {
    const appPath = await savePhotoToAppDir(dataUrl, safeName);
    try {
      await savePhotoToGallery(dataUrl, safeName);
    } catch {
      // 相册保存失败时，应用目录副本仍可用于导出
    }
    return appPath;
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

  await ensureMetadataDir();
  const meta = {
    savedAt: new Date().toISOString(),
    folder: PHONE_ALBUM_NAME,
    total: records.length,
    records: records.map((r) => ({
      fileName: r.fileName,
      savedPath: r.savedPath,
      fruitName: r.fruitName,
      category: r.category,
      weight: r.weight,
      color: r.color,
      ripeness: r.ripeness,
      disease: r.disease,
      notes: r.notes,
      latitude: r.latitude,
      longitude: r.longitude,
      createdAt: r.createdAt,
    })),
  };

  const jsonName = `${batchName}.json`;
  await Filesystem.writeFile({
    path: `${METADATA_DIR}/${jsonName}`,
    data: JSON.stringify(meta, null, 2),
    directory: Directory.External,
    encoding: Encoding.UTF8,
  });

  const uri = await Filesystem.getUri({
    path: `${METADATA_DIR}/${jsonName}`,
    directory: Directory.External,
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
    const savedPath = await withTimeout(savePhotoToPhone(record.photoDataUrl, fileName), '保存图片');
    paths.push(savedPath);
    record.savedPath = savedPath;
    record.fileName = savedPath.split('/').pop() ?? fileName;
  }

  if (Capacitor.isNativePlatform() && records.length > 0) {
    const batchName = `batch_${Date.now()}`;
    await withTimeout(saveBatchMetadataToPhone(records, batchName), '保存批次元数据');
  }

  return {
    savedCount: records.length,
    folder: PHONE_ALBUM_NAME,
    paths,
  };
}

export async function readPhotoFromSavedPath(savedPath: string): Promise<string | null> {
  if (!Capacitor.isNativePlatform() || !savedPath) {
    return null;
  }

  try {
    const file = await Filesystem.readFile({
      path: savedPath,
      directory: Directory.External,
    });
    return `data:image/jpeg;base64,${file.data}`;
  } catch {
    return null;
  }
}

export function getPhoneSaveHint(): string {
  return Capacitor.isNativePlatform()
    ? `图片将保存到手机相册「${PHONE_ALBUM_NAME}」，可在图库中查看`
    : '浏览器环境将触发文件下载';
}
