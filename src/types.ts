export type Ripeness = '未熟' | '半熟' | '成熟' | '过熟';

export type NamingField =
  | 'category'
  | 'fruitName'
  | 'disease'
  | 'color'
  | 'ripeness'
  | 'weight'
  | 'index'
  | 'timestamp';

export interface NamingSettings {
  fields: NamingField[];
  customPrefix: string;
  customSuffix: string;
  separator: string;
}

export interface AnnotationBox {
  id: string;
  className: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FruitRecord {
  id: string;
  fruitName: string;
  category: string;
  photoDataUrl: string;
  fileName?: string;
  savedPath?: string;
  weight?: number;
  color?: string;
  ripeness?: Ripeness;
  disease?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  batchId?: string;
  annotations?: AnnotationBox[];
  imageWidth?: number;
  imageHeight?: number;
  createdAt: string;
  updatedAt: string;
}

export type TabId = 'home' | 'collect' | 'detect' | 'list' | 'export';

export interface FruitFormData {
  fruitName: string;
  category: string;
  photoDataUrl: string;
  customFileName: string;
  weight: string;
  color: string;
  ripeness: Ripeness | '';
  disease: string;
  notes: string;
  latitude?: number;
  longitude?: number;
}

export interface SessionPhoto {
  id: string;
  dataUrl: string;
  fileName: string;
  index: number;
  annotations?: AnnotationBox[];
  imageWidth?: number;
  imageHeight?: number;
}

export const EMPTY_FORM: FruitFormData = {
  fruitName: '',
  category: '',
  photoDataUrl: '',
  customFileName: '',
  weight: '',
  color: '',
  ripeness: '',
  disease: '',
  notes: '',
};
