import type { FruitFormData, NamingField, NamingSettings } from './types';

export const DEFAULT_NAMING_SETTINGS: NamingSettings = {
  fields: ['category', 'color', 'ripeness', 'index'],
  customPrefix: '',
  customSuffix: '',
  separator: '_',
};

export function sanitizeFileName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 120);
}

function padIndex(index: number): string {
  return String(index).padStart(3, '0');
}

function formatTimestamp(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}_${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
}

function getFieldValue(field: NamingField, form: FruitFormData, index: number): string {
  switch (field) {
    case 'category':
      return form.category;
    case 'fruitName':
      return form.fruitName.trim();
    case 'color':
      return form.color;
    case 'ripeness':
      return form.ripeness;
    case 'weight':
      return form.weight ? `${form.weight}g` : '';
    case 'index':
      return padIndex(index);
    case 'timestamp':
      return formatTimestamp();
    default:
      return '';
  }
}

export function buildPhotoFileName(
  form: FruitFormData,
  index: number,
  settings: NamingSettings,
  ext = 'jpg',
): string {
  if (form.customFileName.trim()) {
    const base = sanitizeFileName(form.customFileName.trim());
    const suffix = settings.customSuffix ? settings.separator + sanitizeFileName(settings.customSuffix) : '';
    return `${base}${settings.separator}${padIndex(index)}${suffix}.${ext}`;
  }

  const parts: string[] = [];
  if (settings.customPrefix.trim()) {
    parts.push(sanitizeFileName(settings.customPrefix.trim()));
  }

  for (const field of settings.fields) {
    const value = getFieldValue(field, form, index);
    if (value) {
      parts.push(sanitizeFileName(value));
    }
  }

  if (!settings.fields.includes('index')) {
    parts.push(padIndex(index));
  }

  if (settings.customSuffix.trim() && !form.customFileName.trim()) {
    parts.push(sanitizeFileName(settings.customSuffix.trim()));
  }

  const base = parts.filter(Boolean).join(settings.separator) || `sample_${padIndex(index)}`;
  return `${base}.${ext}`;
}

export function previewFileName(
  form: FruitFormData,
  settings: NamingSettings,
  index = 1,
): string {
  return buildPhotoFileName(form, index, settings);
}

export const NAMING_FIELD_LABELS: Record<NamingField, string> = {
  category: '种类',
  fruitName: '样本名',
  color: '颜色',
  ripeness: '成熟度',
  weight: '重量',
  index: '序号',
  timestamp: '时间戳',
};
