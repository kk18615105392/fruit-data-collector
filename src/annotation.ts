export interface AnnotationBox {
  id: string;
  className: string;
  /** YOLO 归一化中心 x (0–1) */
  x: number;
  /** YOLO 归一化中心 y (0–1) */
  y: number;
  /** YOLO 归一化宽 (0–1) */
  w: number;
  /** YOLO 归一化高 (0–1) */
  h: number;
}

export interface AnnotatedImageMeta {
  annotations?: AnnotationBox[];
  imageWidth?: number;
  imageHeight?: number;
}

export function pixelBoxToNormalized(
  xmin: number,
  ymin: number,
  xmax: number,
  ymax: number,
  imgW: number,
  imgH: number,
): Pick<AnnotationBox, 'x' | 'y' | 'w' | 'h'> {
  const w = Math.max(0, xmax - xmin);
  const h = Math.max(0, ymax - ymin);
  return {
    x: (xmin + w / 2) / imgW,
    y: (ymin + h / 2) / imgH,
    w: w / imgW,
    h: h / imgH,
  };
}

export function normalizedToPixelBox(
  box: Pick<AnnotationBox, 'x' | 'y' | 'w' | 'h'>,
  imgW: number,
  imgH: number,
): { xmin: number; ymin: number; xmax: number; ymax: number } {
  const bw = box.w * imgW;
  const bh = box.h * imgH;
  const cx = box.x * imgW;
  const cy = box.y * imgH;
  return {
    xmin: Math.round(cx - bw / 2),
    ymin: Math.round(cy - bh / 2),
    xmax: Math.round(cx + bw / 2),
    ymax: Math.round(cy + bh / 2),
  };
}

export function buildClassList(records: AnnotatedImageMeta[]): string[] {
  const set = new Set<string>();
  for (const record of records) {
    for (const box of record.annotations ?? []) {
      if (box.className.trim()) {
        set.add(box.className.trim());
      }
    }
  }
  return Array.from(set).sort();
}

export function toYoloLabelLines(
  boxes: AnnotationBox[],
  classMap: Map<string, number>,
): string {
  return boxes
    .map((box) => {
      const classId = classMap.get(box.className.trim());
      if (classId === undefined) {
        return null;
      }
      return `${classId} ${box.x.toFixed(6)} ${box.y.toFixed(6)} ${box.w.toFixed(6)} ${box.h.toFixed(6)}`;
    })
    .filter((line): line is string => line !== null)
    .join('\n');
}

export function toLabelImgXml(
  filename: string,
  folder: string,
  width: number,
  height: number,
  boxes: AnnotationBox[],
): string {
  const objects = boxes
    .map((box) => {
      const { xmin, ymin, xmax, ymax } = normalizedToPixelBox(box, width, height);
      return `  <object>
    <name>${escapeXml(box.className)}</name>
    <pose>Unspecified</pose>
    <truncated>0</truncated>
    <difficult>0</difficult>
    <bndbox>
      <xmin>${xmin}</xmin>
      <ymin>${ymin}</ymin>
      <xmax>${xmax}</xmax>
      <ymax>${ymax}</ymax>
    </bndbox>
  </object>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<annotation>
  <folder>${escapeXml(folder)}</folder>
  <filename>${escapeXml(filename)}</filename>
  <path>${escapeXml(`${folder}/${filename}`)}</path>
  <source>
    <database>Tropical Fruit Collector</database>
  </source>
  <size>
    <width>${width}</width>
    <height>${height}</height>
    <depth>3</depth>
  </size>
  <segmented>0</segmented>
${objects}
</annotation>
`;
}

export function sanitizeClassDirName(name: string): string {
  return (
    (name || '未分类')
      .trim()
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 80) || '未分类'
  );
}

export function resolveAllClassLabels(record: {
  category?: string;
  fruitName?: string;
  disease?: string;
  annotations?: AnnotationBox[];
}): string[] {
  const set = new Set<string>();
  if (record.disease?.trim()) {
    set.add(record.disease.trim());
  }
  for (const box of record.annotations ?? []) {
    if (box.className?.trim()) {
      set.add(box.className.trim());
    }
  }
  if (set.size > 0) {
    return Array.from(set);
  }
  return [record.category?.trim() || record.fruitName?.trim() || '未分类'];
}

export interface CocoImage {
  id: number;
  file_name: string;
  width: number;
  height: number;
}

export interface CocoCategory {
  id: number;
  name: string;
  supercategory: string;
}

export interface CocoAnnotation {
  id: number;
  image_id: number;
  category_id: number;
  bbox: [number, number, number, number];
  area: number;
  iscrowd: 0;
}

export interface CocoDataset {
  info: {
    description: string;
    version: string;
    year: number;
    contributor: string;
    date_created: string;
  };
  licenses: { id: number; name: string; url: string }[];
  images: CocoImage[];
  annotations: CocoAnnotation[];
  categories: CocoCategory[];
}

export interface CocoBuildInput {
  imageFile: string;
  imageWidth: number;
  imageHeight: number;
  annotations?: AnnotationBox[];
}

export function buildCocoDataset(
  items: CocoBuildInput[],
  datasetName: string,
): CocoDataset {
  const classNames = buildClassList(items);
  const classMap = new Map(classNames.map((name, index) => [name, index + 1]));
  const categories: CocoCategory[] = classNames.map((name, index) => ({
    id: index + 1,
    name,
    supercategory: name.split('-')[0] || 'fruit',
  }));

  const images: CocoImage[] = [];
  const annotations: CocoAnnotation[] = [];
  let imageId = 0;
  let annId = 1;

  for (const item of items) {
    const boxes = item.annotations ?? [];
    if (boxes.length === 0) {
      continue;
    }
    imageId += 1;
    const fileName = item.imageFile.replace(/^images\//, '');
    images.push({
      id: imageId,
      file_name: fileName,
      width: item.imageWidth,
      height: item.imageHeight,
    });

    for (const box of boxes) {
      const categoryId = classMap.get(box.className.trim());
      if (!categoryId) {
        continue;
      }
      const { xmin, ymin, xmax, ymax } = normalizedToPixelBox(
        box,
        item.imageWidth,
        item.imageHeight,
      );
      const bw = Math.max(0, xmax - xmin);
      const bh = Math.max(0, ymax - ymin);
      annotations.push({
        id: annId,
        image_id: imageId,
        category_id: categoryId,
        bbox: [xmin, ymin, bw, bh],
        area: bw * bh,
        iscrowd: 0,
      });
      annId += 1;
    }
  }

  return {
    info: {
      description: datasetName,
      version: '1.0',
      year: new Date().getFullYear(),
      contributor: 'Tropical Fruit Collector',
      date_created: new Date().toISOString(),
    },
    licenses: [{ id: 1, name: 'Unknown', url: '' }],
    images,
    annotations,
    categories,
  };
}

export interface ClassificationCopyTarget {
  classDir: string;
  zipPath: string;
}

export function buildClassificationTargets(
  imageFile: string,
  record: {
    category?: string;
    fruitName?: string;
    disease?: string;
    annotations?: AnnotationBox[];
  },
): ClassificationCopyTarget[] {
  const fileName = imageFile.replace(/^images\//, '');
  return resolveAllClassLabels(record).map((label) => ({
    classDir: sanitizeClassDirName(label),
    zipPath: `classification/${sanitizeClassDirName(label)}/${fileName}`,
  }));
}

export function toDataYaml(classNames: string[]): string {
  const namesBlock = classNames
    .map((name, index) => `  ${index}: ${name}`)
    .join('\n');
  return `path: .
train: images
val: images
nc: ${classNames.length}
names:
${namesBlock}
`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function labelBaseName(imageFile: string): string {
  const name = imageFile.replace(/^images\//, '');
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

export async function loadImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('无法读取图片尺寸'));
    img.src = src;
  });
}
