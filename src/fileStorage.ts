import { Media } from '@capacitor-community/media';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import type { FruitRecord } from './types';

export const PHONE_ALBUM_NAME = 'FruitCollector';
export const PHONE_SAVE_DIR = PHONE_ALBUM_NAME;

const METADATA_DIR = PHONE_SAVE_DIR;

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

async function ensureMetadataDir(): Promise<void> {
  await Filesystem.mkdir({
    path: METADATA_DIR,
    directory: Directory.External,
    recursive: true,
  });
}

let albumIdCache: string | null = null;

async function ensureAlbum(): Promise<string> {
  if (albumIdCache) return albumIdCache;

  const { albums } = await Media.getAlbums();
  const existing = albums.find((album) => album.name === PHONE_ALBUM_NAME);
  if (existing) {
    albumIdCache = existing.identifier;
    return albumIdCache;
  }

  await Media.createAlbum({ name: PHONE_ALBUM_NAME });
  const { albums: updated } = await Media.getAlbums();
  const created = updated.find((album) => album.name === PHONE_ALBUM_NAME);
  if (!created) {
    throw new Error(`无法创建相册「${PHONE_ALBUM_NAME}」`);
  }

  albumIdCache = created.identifier;
  return albumIdCache;
}

async function savePhotoToGallery(dataUrl: string, safeName: string): Promise<void> {
  const albumId = await ensureAlbum();
  const baseName = safeName.replace(/\.[^.]+$/, '');
  await Media.savePhoto({
    path: dataUrl,
    albumIdentifier: albumId,
    fileName: baseName,
  });
}

async function savePhotoToAppDir(dataUrl: string, safeName: string): Promise<string> {
  await ensureMetadataDir();
  await Filesystem.writeFile({
    path: `${METADATA_DIR}/${safeName}`,
    data: dataUrlToBase64(dataUrl),
    directory: Directory.External,
  });

  const uri = await Filesystem.getUri({
    path: `${METADATA_DIR}/${safeName}`,
    directory: Directory.External,
  });
  return uri.uri;
}

export async function savePhotoToPhone(dataUrl: string, fileName: string): Promise<string> {
  const safeName = fileName.includes('.') ? fileName : `${fileName}.jpg`;

  if (Capacitor.isNativePlatform()) {
    try {
      await savePhotoToGallery(dataUrl, safeName);
      return `Pictures/${PHONE_ALBUM_NAME}/${safeName}`;
    } catch {
      return savePhotoToAppDir(dataUrl, safeName);
    }
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
    const savedPath = await savePhotoToPhone(record.photoDataUrl, fileName);
    paths.push(savedPath);
    record.savedPath = savedPath;
    record.fileName = fileName.split('/').pop() ?? fileName;
  }

  if (Capacitor.isNativePlatform() && records.length > 0) {
    const batchName = `batch_${Date.now()}`;
    await saveBatchMetadataToPhone(records, batchName);
  }

  return {
    savedCount: records.length,
    folder: PHONE_ALBUM_NAME,
    paths,
  };
}

export function getPhoneSaveHint(): string {
  return Capacitor.isNativePlatform()
    ? `图片将保存到手机相册「${PHONE_ALBUM_NAME}」，可在图库中查看`
    : '浏览器环境将触发文件下载';
}
