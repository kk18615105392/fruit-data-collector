/** 番茄病害检测：YOLOv8s best.pt → ONNX */

export const TOMATO_MODEL_ONNX_URL = '/models/tomato-disease/yolov8s-tomato-disease-best.onnx';
export const TOMATO_MODEL_META_URL = '/models/tomato-disease/model.json';
export const TOMATO_INPUT_SIZE = 640;

/** Ultralytics 类别 id -> 英文名 */
export const TOMATO_CLASS_NAMES: Record<number, string> = {
  0: 'Pepper__bell___Bacterial_spot',
  1: 'Pepper__bell___healthy',
  2: 'Potato___Early_blight',
  3: 'Potato___Late_blight',
  4: 'Potato___healthy',
  5: 'Tomato_Bacterial_spot',
  6: 'Tomato_Early_blight',
  7: 'Tomato_Late_blight',
  8: 'Tomato_Leaf_Mold',
  9: 'Tomato_Septoria_leaf_spot',
  10: 'Tomato_Spider_mites_Two_spotted_spider_mite',
  11: 'Tomato__Target_Spot',
  12: 'Tomato__Tomato_YellowLeaf__Curl_Virus',
  13: 'Tomato__Tomato_mosaic_virus',
  14: 'Tomato_healthy',
};

export const TOMATO_LABELS_ZH: Record<string, string> = {
  Pepper__bell___Bacterial_spot: '辣椒细菌性斑点病',
  Pepper__bell___healthy: '辣椒健康',
  Potato___Early_blight: '马铃薯早疫病',
  Potato___Late_blight: '马铃薯晚疫病',
  Potato___healthy: '马铃薯健康',
  Tomato_Bacterial_spot: '番茄细菌性斑点病',
  Tomato_Early_blight: '番茄早疫病',
  Tomato_Late_blight: '番茄晚疫病',
  Tomato_Leaf_Mold: '番茄叶霉病',
  Tomato_Septoria_leaf_spot: '番茄斑枯病',
  Tomato_Spider_mites_Two_spotted_spider_mite: '番茄红蜘蛛（二斑叶螨）',
  Tomato__Target_Spot: '番茄靶斑病',
  Tomato__Tomato_YellowLeaf__Curl_Virus: '番茄黄化曲叶病毒病',
  Tomato__Tomato_mosaic_virus: '番茄花叶病毒病',
  Tomato_healthy: '番茄健康',
};

/** 默认仅展示番茄类别 */
export const TOMATO_CLASS_IDS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;

/** 写入采集表单用的中文病害名（去掉「番茄」前缀） */
export const TOMATO_DISEASE_OPTIONS = [
  '细菌性斑点病',
  '早疫病',
  '晚疫病',
  '叶霉病',
  '斑枯病',
  '红蜘蛛',
  '靶斑病',
  '黄化曲叶病毒病',
  '花叶病毒病',
  '健康',
] as const;

export function toCollectDiseaseLabel(enName: string): string {
  const zh = TOMATO_LABELS_ZH[enName] ?? enName;
  return zh.replace(/^番茄/, '').replace(/^辣椒/, '').replace(/^马铃薯/, '') || zh;
}

export function labelZh(enName: string): string {
  return TOMATO_LABELS_ZH[enName] ?? enName;
}
