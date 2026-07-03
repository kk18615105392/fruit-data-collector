import { Media } from '@capacitor-community/media';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { writeFileSafe, writeTextFileSafe } from './fsUtils';
import type { FruitRecord } from './types';

export const PHONE_ALBUM_NAME = 'FruitCollector';
export const PHONE_SAVE_DIR = PHONE_ALBUM_NAME;

/** 应用私有目录，与相册名分离，避免 mkdir 冲突 */
const APP_DATA_DIR = 'fruit_records';

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

function makeStorageFileName(ext = 'jpg'): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `img_${Date.now()}_${rand}.${ext}`;
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

async function ensureAlbum() {
  const { albums } = await Media.getAlbums();
  let album = albums.find((item) => item.name === PHONE_ALBUM_NAME);
  if (album) {
    return album;
  }

  try {
    await Media.createAlbum({ name: PHONE_ALBUM_NAME });
  } catch (err) {
    console.warn('创建相册失败，尝试查找已有相册', err);
  }

  const refreshed = await Media.getAlbums();
  album = refreshed.albums.find((item) => item.name === PHONE_ALBUM_NAME);
  if (!album) {
    throw new Error(`无法创建或找到相册「${PHONE_ALBUM_NAME}」，请检查相册/存储权限`);
  }
  return album;
}

async function savePhotoToAppDir(dataUrl: string, safeName: string): Promise<string> {
  const relativePath = `${APP_DATA_DIR}/${safeName}`;
  await writeFileSafe({
    path: relativePath,
    data: dataUrlToBase64(dataUrl),
    directory: Directory.Data,
  });
  return relativePath;
}

async function savePhotoToGallery(dataUrl: string, storageName: string): Promise<void> {
  const album = await ensureAlbum();
  const galleryName = storageName.replace(/\.[^.]+$/, '');
  await Media.savePhoto({
    path: dataUrl,
    albumIdentifier: album.identifier,
    fileName: galleryName,
  });
}

export async function savePhotoToPhone(dataUrl: string, fileName: string): Promise<string> {
  const ext = getExtensionFromDataUrl(dataUrl);
  const storageName = makeStorageFileName(ext);

  if (!Capacitor.isNativePlatform()) {
    const blob = await (await fetch(dataUrl)).blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName.includes('.') ? fileName : `${fileName}.${ext}`;
    anchor.click();
    URL.revokeObjectURL(url);
    return storageName;
  }

  let galleryOk = false;
  let appOk = false;
  let galleryErr: unknown;
  let appErr: unknown;
  let appPath = `${APP_DATA_DIR}/${storageName}`;

  try {
    await savePhotoToGallery(dataUrl, storageName);
    galleryOk = true;
  } catch (err) {
    galleryErr = err;
    console.warn('相册保存失败', err);
  }

  try {
    appPath = await savePhotoToAppDir(dataUrl, storageName);
    appOk = true;
  } catch (err) {
    appErr = err;
    console.warn('应用目录保存失败', err);
  }

  if (!galleryOk && !appOk) {
    const details = [
      galleryErr ? `相册：${toErrorMessage(galleryErr)}` : null,
      appErr ? `本地：${toErrorMessage(appErr)}` : null,
    ]
      .filter(Boolean)
      .join('；');
    throw new Error(`保存图片失败（${details}）`);
  }

  return appPath;
}

export async function saveBatchMetadataToPhone(
  records: FruitRecord[],
  batchName: string,
): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

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
  const jsonPath = `${APP_DATA_DIR}/${jsonName}`;
  await writeTextFileSafe(jsonPath, JSON.stringify(meta, null, 2), Directory.Data);

  const uri = await Filesystem.getUri({
    path: jsonPath,
    directory: Directory.Data,
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
    const displayName = record.fileName?.includes('.')
      ? record.fileName
      : `${record.fileName ?? record.id}.${ext}`;
    const savedPath = await withTimeout(
      savePhotoToPhone(record.photoDataUrl, displayName),
      '保存图片',
    );
    paths.push(savedPath);
    record.savedPath = savedPath;
  }

  if (Capacitor.isNativePlatform() && records.length > 0) {
    try {
      const batchName = `batch_${Date.now()}`;
      await withTimeout(saveBatchMetadataToPhone(records, batchName), '保存批次元数据');
    } catch (err) {
      console.warn('批次元数据保存失败', err);
    }
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

  for (const directory of [Directory.Data, Directory.External]) {
    try {
      const file = await Filesystem.readFile({ path: savedPath, directory });
      const ext = savedPath.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
      return `data:image/${ext};base64,${file.data}`;
    } catch {
      // 尝试下一个目录（兼容旧版 External 路径）
    }
  }
  return null;
}

export function getPhoneSaveHint(): string {
  return Capacitor.isNativePlatform()
    ? `图片将保存到手机相册「${PHONE_ALBUM_NAME}」，可在图库中查看`
    : '浏览器环境将触发文件下载';
}
