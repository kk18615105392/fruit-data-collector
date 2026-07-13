import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import {
  buildClassList,
  buildClassificationTargets,
  buildCocoDataset,
  labelBaseName,
  loadImageSize,
  toDataYaml,
  toLabelImgXml,
  toYoloLabelLines,
  type AnnotationBox,
} from './annotation';
import { readPhotoFromSavedPath } from './fileStorage';
import { mkdirSafe } from './fsUtils';
import { base64ToU8, createZip, strToU8, type ZipFileEntry } from './zipUtils';
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
  fileName?: string;
  savedPath?: string;
  fruitName: string;
  category: string;
  weight?: number;
  color?: string;
  ripeness?: string;
  disease?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  annotations?: AnnotationBox[];
  imageWidth?: number;
  imageHeight?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExportBundle {
  version: '1.0';
  datasetName: string;
  exportedAt: string;
  totalRecords: number;
  records: ExportMetaItem[];
}

export interface ExportOptions {
  datasetName: string;
  records: FruitRecord[];
}

export function sanitizeExportName(name: string): string {
  return (
    name
      .trim()
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 80) || `fruit_dataset_${Date.now()}`
  );
}

export async function buildExportBundle(records: FruitRecord[], datasetName: string): Promise<ExportBundle> {
  const exportedAt = new Date().toISOString();
  const exportRecords: ExportMetaItem[] = records.map((record, index) => {
    const mime = getMimeType(record.photoDataUrl);
    const ext = getExtension(mime);
    const imageFile = record.fileName
      ? `images/${record.fileName}`
      : `images/${String(index + 1).padStart(4, '0')}_${record.id.slice(0, 8)}.${ext}`;

    return {
      id: record.id,
      imageFile,
      fileName: record.fileName,
      savedPath: record.savedPath,
      fruitName: record.fruitName,
      category: record.category,
      weight: record.weight,
      color: record.color,
      ripeness: record.ripeness,
      disease: record.disease,
      notes: record.notes,
      latitude: record.latitude,
      longitude: record.longitude,
      annotations: record.annotations,
      imageWidth: record.imageWidth,
      imageHeight: record.imageHeight,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  });

  return {
    version: '1.0',
    datasetName,
    exportedAt,
    totalRecords: records.length,
    records: exportRecords,
  };
}

async function resolveRecordPhoto(record: FruitRecord): Promise<string> {
  if (record.savedPath && Capacitor.isNativePlatform()) {
    const fromDisk = await readPhotoFromSavedPath(record.savedPath);
    if (fromDisk) {
      return fromDisk;
    }
  }
  return record.photoDataUrl;
}

async function resolveRecordImageSize(record: FruitRecord, photoDataUrl: string): Promise<{ width: number; height: number }> {
  if (record.imageWidth && record.imageHeight) {
    return { width: record.imageWidth, height: record.imageHeight };
  }
  return loadImageSize(photoDataUrl);
}

async function buildAnnotationSidecars(
  records: FruitRecord[],
  bundle: ExportBundle,
  photoUrls: string[],
): Promise<ZipFileEntry[]> {
  const classNames = buildClassList(records);
  if (classNames.length === 0) {
    return [];
  }
  const classMap = new Map(classNames.map((name, index) => [name, index]));
  const files: ZipFileEntry[] = [
    { name: 'classes.txt', data: strToU8(classNames.join('\n') + '\n') },
    { name: 'data.yaml', data: strToU8(toDataYaml(classNames)) },
  ];

  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    const meta = bundle.records[i];
    const boxes = record.annotations ?? [];
    if (boxes.length === 0) {
      continue;
    }
    const { width, height } = await resolveRecordImageSize(record, photoUrls[i]);
    const imageName = meta.imageFile.replace(/^images\//, '');
    const base = labelBaseName(meta.imageFile);
    files.push({
      name: `labels/${base}.txt`,
      data: strToU8(toYoloLabelLines(boxes, classMap) + '\n'),
    });
    files.push({
      name: `annotations/${base}.xml`,
      data: strToU8(toLabelImgXml(imageName, 'images', width, height, boxes)),
    });
  }
  return files;
}

const CLASSIFICATION_README = `ImageFolder 分类目录（classification/）
=====================================
每个子文件夹名为一个类别，内含属于该类别的图片副本。

类别判定优先级：
1. 记录中的病害类型
2. 标注框上的类别名
3. 水果种类

适用于 PyTorch ImageFolder、TensorFlow image_dataset_from_directory、Keras flow_from_directory 等图像分类训练。
`;

async function buildCocoSidecar(
  records: FruitRecord[],
  bundle: ExportBundle,
  photoUrls: string[],
): Promise<ZipFileEntry | null> {
  const items = [];
  for (let i = 0; i < records.length; i += 1) {
    const { width, height } = await resolveRecordImageSize(records[i], photoUrls[i]);
    items.push({
      imageFile: bundle.records[i].imageFile,
      imageWidth: width,
      imageHeight: height,
      annotations: records[i].annotations,
    });
  }
  const coco = buildCocoDataset(items, bundle.datasetName);
  if (coco.images.length === 0) {
    return null;
  }
  return {
    name: 'coco/annotations.json',
    data: strToU8(JSON.stringify(coco, null, 2)),
  };
}

function buildClassificationSidecars(
  records: FruitRecord[],
  bundle: ExportBundle,
  imageDataList: Uint8Array[],
): ZipFileEntry[] {
  const files: ZipFileEntry[] = [
    { name: 'classification/README.txt', data: strToU8(CLASSIFICATION_README) },
  ];
  const added = new Set<string>();

  records.forEach((record, index) => {
    const meta = bundle.records[index];
    const imageData = imageDataList[index];
    if (!imageData) {
      return;
    }
    const targets = buildClassificationTargets(meta.imageFile, record);
    for (const target of targets) {
      if (added.has(target.zipPath)) {
        continue;
      }
      added.add(target.zipPath);
      files.push({ name: target.zipPath, data: imageData });
    }
  });

  return files;
}

function uint8ToBase64(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i += 1) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

export async function exportDatasetNative(options: ExportOptions): Promise<string> {
  const { records, datasetName } = options;
  const safeName = sanitizeExportName(datasetName);
  const bundle = await buildExportBundle(records, safeName);
  const folderName = safeName;

  await mkdirSafe(folderName, Directory.Cache);
  await mkdirSafe(`${folderName}/images`, Directory.Cache);
  await mkdirSafe(`${folderName}/labels`, Directory.Cache);
  await mkdirSafe(`${folderName}/annotations`, Directory.Cache);
  await mkdirSafe(`${folderName}/coco`, Directory.Cache);
  await mkdirSafe(`${folderName}/classification`, Directory.Cache);

  const photoUrls: string[] = [];
  const imageDataList: Uint8Array[] = [];
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const meta = bundle.records[i];
    const photoDataUrl = await resolveRecordPhoto(record);
    photoUrls.push(photoDataUrl);
    const imageData = base64ToU8(dataUrlToBase64(photoDataUrl));
    imageDataList.push(imageData);
    await Filesystem.writeFile({
      path: `${folderName}/${meta.imageFile}`,
      data: dataUrlToBase64(photoDataUrl),
      directory: Directory.Cache,
    });
  }

  const annotationFiles = await buildAnnotationSidecars(records, bundle, photoUrls);
  for (const file of annotationFiles) {
    await Filesystem.writeFile({
      path: `${folderName}/${file.name}`,
      data: new TextDecoder().decode(file.data),
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
  }

  const cocoFile = await buildCocoSidecar(records, bundle, photoUrls);
  if (cocoFile) {
    await Filesystem.writeFile({
      path: `${folderName}/${cocoFile.name}`,
      data: new TextDecoder().decode(cocoFile.data),
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
  }

  const classificationFiles = buildClassificationSidecars(records, bundle, imageDataList);
  for (const file of classificationFiles) {
    if (file.name.endsWith('.txt')) {
      await Filesystem.writeFile({
        path: `${folderName}/${file.name}`,
        data: new TextDecoder().decode(file.data),
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
    } else {
      await Filesystem.writeFile({
        path: `${folderName}/${file.name}`,
        data: uint8ToBase64(file.data),
        directory: Directory.Cache,
      });
    }
  }

  await Filesystem.writeFile({
    path: `${folderName}/dataset.json`,
    data: JSON.stringify(bundle, null, 2),
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });

  const csvHeader =
    'id,imageFile,fruitName,category,weight,color,ripeness,disease,notes,latitude,longitude,createdAt,updatedAt';
  const csvRows = bundle.records.map((item) =>
    [
      item.id,
      item.imageFile,
      item.fruitName,
      item.category,
      item.weight ?? '',
      item.color ?? '',
      item.ripeness ?? '',
      item.disease ?? '',
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

  await shareExport({
    title: safeName,
    text: `已导出「${safeName}」共 ${records.length} 条记录，含 YOLO/LabelImg/COCO/分类目录`,
    url: jsonUri.uri,
  });

  return jsonUri.uri;
}

async function shareExport(options: {
  title: string;
  text: string;
  url: string;
}): Promise<void> {
  const canShare = await Share.canShare();
  if (!canShare.value) {
    throw new Error('当前设备不支持分享，导出文件已写入应用缓存');
  }

  try {
    await Promise.race([
      Share.share({
        title: options.title,
        text: options.text,
        url: options.url,
        dialogTitle: '分享数据集',
      }),
      new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('SHARE_TIMEOUT')), 90_000);
      }),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message === 'SHARE_TIMEOUT' ||
      /cancel|dismiss|abort|closed|user/i.test(message)
    ) {
      return;
    }
    throw err;
  }
}

export async function exportDatasetWeb(options: ExportOptions): Promise<void> {
  const { records, datasetName } = options;
  const safeName = sanitizeExportName(datasetName);
  const bundle = await buildExportBundle(records, safeName);
  const zipFiles: ZipFileEntry[] = [
    { name: 'dataset.json', data: strToU8(JSON.stringify(bundle, null, 2)) },
    { name: 'dataset.csv', data: strToU8(buildCsvContent(bundle)) },
  ];

  const photoUrls: string[] = [];
  const imageDataList: Uint8Array[] = [];
  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    const meta = bundle.records[i];
    const photoDataUrl = await resolveRecordPhoto(record);
    photoUrls.push(photoDataUrl);
    const imageData = base64ToU8(dataUrlToBase64(photoDataUrl));
    imageDataList.push(imageData);
    zipFiles.push({
      name: meta.imageFile,
      data: imageData,
    });
  }

  const annotationFiles = await buildAnnotationSidecars(records, bundle, photoUrls);
  zipFiles.push(...annotationFiles);

  const cocoFile = await buildCocoSidecar(records, bundle, photoUrls);
  if (cocoFile) {
    zipFiles.push(cocoFile);
  }

  zipFiles.push(...buildClassificationSidecars(records, bundle, imageDataList));

  const zipBuffer = createZip(zipFiles);
  const blob = new Blob([new Uint8Array(zipBuffer)], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeName}.zip`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildCsvContent(bundle: ExportBundle): string {
  const csvHeader =
    'id,imageFile,fruitName,category,weight,color,ripeness,disease,notes,latitude,longitude,createdAt,updatedAt';
  const csvRows = bundle.records.map((item) =>
    [
      item.id,
      item.imageFile,
      item.fruitName,
      item.category,
      item.weight ?? '',
      item.color ?? '',
      item.ripeness ?? '',
      item.disease ?? '',
      (item.notes ?? '').replace(/"/g, '""'),
      item.latitude ?? '',
      item.longitude ?? '',
      item.createdAt,
      item.updatedAt,
    ]
      .map((v) => `"${String(v)}"`)
      .join(','),
  );
  return [csvHeader, ...csvRows].join('\n');
}

export async function exportDataset(options: ExportOptions): Promise<void> {
  const { records, datasetName } = options;

  if (!datasetName.trim()) {
    throw new Error('请输入导出数据集名称');
  }

  if (records.length === 0) {
    throw new Error('请至少选择一个数据集');
  }

  if (Capacitor.isNativePlatform()) {
    await exportDatasetNative(options);
    return;
  }

  await exportDatasetWeb(options);
}

export async function takePhoto(source: 'prompt' | 'camera' = 'prompt'): Promise<string> {
  const e2e = globalThis as { __E2E_PHOTO_URL__?: string; __E2E_PHOTO_QUEUE__?: string[] };
  if (e2e.__E2E_PHOTO_QUEUE__ && e2e.__E2E_PHOTO_QUEUE__.length > 0) {
    const next = e2e.__E2E_PHOTO_QUEUE__.shift();
    if (next) {
      return next;
    }
  }
  if (e2e.__E2E_PHOTO_URL__) {
    return e2e.__E2E_PHOTO_URL__;
  }

  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

  const photo = await Promise.race([
    Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Prompt,
      saveToGallery: false,
      promptLabelHeader: '选择图片来源',
      promptLabelPhoto: '从相册选择',
      promptLabelPicture: '拍照',
      promptLabelCancel: '取消',
    }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('拍照超时，请重试')), 60_000);
    }),
  ]);

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
