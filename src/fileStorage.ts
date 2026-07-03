import { Media } from '@capacitor-community/media';
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

async function savePhotoToGallery(dataUrl: string, storageName: string): Promise<void> {
  const tempName = `tmp_${Date.now()}_${storageName}`;
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

  const galleryName = storageName.replace(/\.[^.]+$/, '');
  await Media.savePhoto({
    path: uri,
    albumIdentifier: album.identifier,
    fileName: galleryName,
  });

  try {
    await Filesystem.deleteFile({ path: tempName, directory: Directory.Cache });
  } catch {
    // 临时文件清理失败不影响主流程
  }
}

export async function savePhotoToPhone(dataUrl: string, fileName: string): Promise<string> {
  const ext = getExtensionFromDataUrl(dataUrl);
  const storageName = makeStorageFileName(ext);

  if (Capacitor.isNativePlatform()) {
    try {
      const appPath = await savePhotoToAppDir(dataUrl, storageName);
      try {
        await savePhotoToGallery(dataUrl, storageName);
      } catch (galleryErr) {
        console.warn('相册保存失败，已保留应用目录副本', galleryErr);
      }
      return appPath;
    } catch (err) {
      throw new Error(`保存图片失败：${toErrorMessage(err)}`);
    }
  }

  const blob = await (await fetch(dataUrl)).blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName.includes('.') ? fileName : `${fileName}.${ext}`;
  anchor.click();
  URL.revokeObjectURL(url);
  return storageName;
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
