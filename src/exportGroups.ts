import type { FruitRecord } from './types';

export interface ExportDataset {
  id: string;
  label: string;
  subtitle: string;
  records: FruitRecord[];
}

export function groupRecordsIntoDatasets(records: FruitRecord[]): ExportDataset[] {
  const groups = new Map<string, FruitRecord[]>();

  for (const record of records) {
    const key = record.batchId ?? `single-${record.id}`;
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(record);
    } else {
      groups.set(key, [record]);
    }
  }

  return Array.from(groups.entries())
    .map(([id, batchRecords]) => {
      const sorted = [...batchRecords].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const first = sorted[0];
      const disease = first.disease ? ` · ${first.disease}` : '';
      const date = new Date(first.createdAt).toLocaleString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      return {
        id,
        label: `${first.fruitName || first.category}${disease}`,
        subtitle: `${sorted.length} 张 · ${date}`,
        records: sorted,
      };
    })
    .sort((a, b) => b.records[0].createdAt.localeCompare(a.records[0].createdAt));
}

export function pickRecordsFromDatasets(
  datasets: ExportDataset[],
  selectedIds: Set<string>,
): FruitRecord[] {
  return datasets.filter((item) => selectedIds.has(item.id)).flatMap((item) => item.records);
}

export function defaultExportName(): string {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `热带水果采集APP_${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}`;
}
