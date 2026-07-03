import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { FruitRecord } from './types';

function dataUrlToBase64(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(',');
  return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
}

function getMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);/);
  return match?.[1] ?? 'image/jpeg';
}

function getExtension(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
}

export interface ExportMetaItem {
  id: string;
  imageFile: string;
  fruitName: string;
  category: string;
  weight?: number;
  color?: string;
  ripeness?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExportBundle {
  version: '1.0';
  exportedAt: string;
  totalRecords: number;
  records: ExportMetaItem[];
}

export async function buildExportBundle(records: FruitRecord[]): Promise<ExportBundle> {
  const exportedAt = new Date().toISOString();
  const exportRecords: ExportMetaItem[] = records.map((record, index) => {
    const mime = getMimeType(record.photoDataUrl);
    const ext = getExtension(mime);
    const imageFile = `images/${String(index + 1).padStart(4, '0')}_${record.id.slice(0, 8)}.${ext}`;

    return {
      id: record.id,
      imageFile,
      fruitName: record.fruitName,
      category: record.category,
      weight: record.weight,
      color: record.color,
      ripeness: record.ripeness,
      notes: record.notes,
      latitude: record.latitude,
      longitude: record.longitude,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  });

  return {
    version: '1.0',
    exportedAt,
    totalRecords: records.length,
    records: exportRecords,
  };
}

export async function exportDatasetNative(records: FruitRecord[]): Promise<string> {
  const bundle = await buildExportBundle(records);
  const folderName = `fruit_dataset_${Date.now()}`;

  await Filesystem.mkdir({
    path: folderName,
    directory: Directory.Cache,
    recursive: true,
  });

  await Filesystem.mkdir({
    path: `${folderName}/images`,
    directory: Directory.Cache,
    recursive: true,
  });

  await Filesystem.writeFile({
    path: `${folderName}/dataset.json`,
    data: JSON.stringify(bundle, null, 2),
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const meta = bundle.records[i];
    await Filesystem.writeFile({
      path: `${folderName}/${meta.imageFile}`,
      data: dataUrlToBase64(record.photoDataUrl),
      directory: Directory.Cache,
    });
  }

  const csvHeader =
    'id,imageFile,fruitName,category,weight,color,ripeness,notes,latitude,longitude,createdAt,updatedAt';
  const csvRows = bundle.records.map((item) =>
    [
      item.id,
      item.imageFile,
      item.fruitName,
      item.category,
      item.weight ?? '',
      item.color ?? '',
      item.ripeness ?? '',
      (item.notes ?? '').replace(/"/g, '""'),
      item.latitude ?? '',
      item.longitude ?? '',
      item.createdAt,
      item.updatedAt,
    ]
      .map((v) => `"${String(v)}"`)
      .join(','),
  );

  await Filesystem.writeFile({
    path: `${folderName}/dataset.csv`,
    data: [csvHeader, ...csvRows].join('\n'),
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });

  const jsonUri = await Filesystem.getUri({
    path: `${folderName}/dataset.json`,
    directory: Directory.Cache,
  });

  await Share.share({
    title: '热带水果数据集',
    text: `已导出 ${records.length} 条记录，包含 JSON、CSV 和图片文件`,
    url: jsonUri.uri,
    dialogTitle: '分享数据集',
  });

  return jsonUri.uri;
}

export async function exportDatasetWeb(records: FruitRecord[]): Promise<void> {
  const bundle = await buildExportBundle(records);
  const exportData = {
    ...bundle,
    records: bundle.records.map((meta, index) => ({
      ...meta,
      imageBase64: dataUrlToBase64(records[index].photoDataUrl),
    })),
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `tropical_fruit_dataset_${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportDataset(records: FruitRecord[]): Promise<void> {
  if (records.length === 0) {
    throw new Error('没有可导出的数据');
  }

  if (Capacitor.isNativePlatform()) {
    await exportDatasetNative(records);
    return;
  }

  await exportDatasetWeb(records);
}

export async function takePhoto(): Promise<string> {
  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

  const photo = await Camera.getPhoto({
    quality: 85,
    allowEditing: false,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Prompt,
    saveToGallery: false,
    promptLabelHeader: '选择图片来源',
    promptLabelPhoto: '从相册选择',
    promptLabelPicture: '拍照',
    promptLabelCancel: '取消',
  });

  if (!photo.dataUrl) {
    throw new Error('未获取到照片');
  }

  return photo.dataUrl;
}

export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    return null;
  }
}
