import { FRUIT_DISEASES, PREVIOUS_DISEASE_VALUE } from './constants';
import type { FruitFormData } from './types';

export function getDiseasesForFruit(category: string): readonly string[] {
  return FRUIT_DISEASES[category] ?? FRUIT_DISEASES['其他'] ?? ['健康'];
}

export function resolveDisease(formDisease: string, lastDisease: string | null): string | undefined {
  if (formDisease === PREVIOUS_DISEASE_VALUE) {
    return lastDisease ?? undefined;
  }
  return formDisease || undefined;
}

/** 用于命名预览与文件名生成，将「上一个病害」解析为实际值 */
export function resolveFormForNaming(form: FruitFormData, lastDisease: string | null): FruitFormData {
  const disease = resolveDisease(form.disease, lastDisease);
  return {
    ...form,
    disease: disease ?? '',
  };
}

export function formatPreviousDiseaseLabel(lastDisease: string | null): string {
  if (lastDisease) {
    return `上一个病害（${lastDisease}）`;
  }
  return '上一个病害（暂无记录）';
}
