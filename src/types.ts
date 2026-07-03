export type Ripeness = '未熟' | '半熟' | '成熟' | '过熟';

export interface FruitRecord {
  id: string;
  fruitName: string;
  category: string;
  photoDataUrl: string;
  weight?: number;
  color?: string;
  ripeness?: Ripeness;
  notes?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}

export type TabId = 'home' | 'collect' | 'list' | 'export';

export interface FruitFormData {
  fruitName: string;
  category: string;
  photoDataUrl: string;
  weight: string;
  color: string;
  ripeness: Ripeness | '';
  notes: string;
  latitude?: number;
  longitude?: number;
}

export const EMPTY_FORM: FruitFormData = {
  fruitName: '',
  category: '',
  photoDataUrl: '',
  weight: '',
  color: '',
  ripeness: '',
  notes: '',
};
