import { LAST_DISEASE_KEY, STORAGE_KEY } from './constants';
import type { FruitRecord } from './types';

export function loadRecords(): FruitRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FruitRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecords(records: FruitRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    throw new Error('本地存储空间不足，请导出后删除部分旧记录');
  }
}

export function loadLastDisease(): string | null {
  return localStorage.getItem(LAST_DISEASE_KEY);
}

export function saveLastDisease(disease: string | undefined): void {
  if (disease) {
    localStorage.setItem(LAST_DISEASE_KEY, disease);
  }
}

export function addRecords(newRecords: FruitRecord[]): FruitRecord[] {
  const records = loadRecords();
  const next = [...newRecords, ...records];
  saveRecords(next);
  const latestDisease = newRecords.find((r) => r.disease)?.disease;
  saveLastDisease(latestDisease);
  return next;
}

export function addRecord(record: FruitRecord): FruitRecord[] {
  const records = loadRecords();
  const next = [record, ...records];
  saveRecords(next);
  saveLastDisease(record.disease);
  return next;
}

export function updateRecord(record: FruitRecord): FruitRecord[] {
  const records = loadRecords();
  const next = records.map((item) => (item.id === record.id ? record : item));
  saveRecords(next);
  return next;
}

export function deleteRecord(id: string): FruitRecord[] {
  const records = loadRecords();
  const next = records.filter((item) => item.id !== id);
  saveRecords(next);
  return next;
}

export function getRecordById(id: string): FruitRecord | undefined {
  return loadRecords().find((item) => item.id === id);
}

export function getStats(records: FruitRecord[]) {
  const categories = new Set(records.map((r) => r.category));
  const withLocation = records.filter(
    (r) => r.latitude != null && r.longitude != null,
  ).length;
  const withPhoto = records.filter((r) => r.photoDataUrl).length;

  return {
    total: records.length,
    categories: categories.size,
    withLocation,
    withPhoto,
  };
}
