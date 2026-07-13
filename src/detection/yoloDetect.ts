type OrtModule = typeof import('onnxruntime-web');
import {
  TOMATO_CLASS_IDS,
  TOMATO_CLASS_NAMES,
  TOMATO_INPUT_SIZE,
  TOMATO_MODEL_ONNX_URL,
  labelZh,
} from './tomatoClasses';

export interface DetectBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  score: number;
  classId: number;
  className: string;
  label: string;
}

export interface DetectResult {
  boxes: DetectBox[];
  top?: DetectBox;
  inferenceMs: number;
  annotatedDataUrl?: string;
}

let ortModule: OrtModule | null = null;
let sessionPromise: Promise<import('onnxruntime-web').InferenceSession> | null = null;

async function loadOrt(): Promise<OrtModule> {
  if (!ortModule) {
    ortModule = await import('onnxruntime-web');
    ortModule.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/';
    ortModule.env.wasm.numThreads = 1;
  }
  return ortModule;
}

async function getSession() {
  if (!sessionPromise) {
    const ort = await loadOrt();
    sessionPromise = ort.InferenceSession.create(TOMATO_MODEL_ONNX_URL, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
  }
  return sessionPromise;
}

function letterbox(
  source: HTMLCanvasElement | HTMLImageElement,
  size: number,
): { canvas: HTMLCanvasElement; scale: number; padX: number; padY: number } {
  const sw = 'naturalWidth' in source ? source.naturalWidth || source.width : source.width;
  const sh = 'naturalHeight' in source ? source.naturalHeight || source.height : source.height;
  const scale = Math.min(size / sw, size / sh);
  const nw = Math.round(sw * scale);
  const nh = Math.round(sh * scale);
  const padX = Math.floor((size - nw) / 2);
  const padY = Math.floor((size - nh) / 2);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#114';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(source, padX, padY, nw, nh);
  return { canvas, scale, padX, padY };
}

function canvasToTensor(canvas: HTMLCanvasElement, OrtTensor: OrtModule['Tensor']) {
  const size = canvas.width;
  const ctx = canvas.getContext('2d')!;
  const { data } = ctx.getImageData(0, 0, size, size);
  const float = new Float32Array(3 * size * size);
  const plane = size * size;
  for (let i = 0; i < plane; i++) {
    float[i] = data[i * 4] / 255;
    float[plane + i] = data[i * 4 + 1] / 255;
    float[plane * 2 + i] = data[i * 4 + 2] / 255;
  }
  return new OrtTensor('float32', float, [1, 3, size, size]);
}

function iou(a: DetectBox, b: DetectBox): number {
  const x1 = Math.max(a.x1, b.x1);
  const y1 = Math.max(a.y1, b.y1);
  const x2 = Math.min(a.x2, b.x2);
  const y2 = Math.min(a.y2, b.y2);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = Math.max(0, a.x2 - a.x1) * Math.max(0, a.y2 - a.y1);
  const areaB = Math.max(0, b.x2 - b.x1) * Math.max(0, b.y2 - b.y1);
  return inter / (areaA + areaB - inter + 1e-6);
}

function nms(boxes: DetectBox[], iouThresh = 0.45): DetectBox[] {
  const sorted = [...boxes].sort((a, b) => b.score - a.score);
  const kept: DetectBox[] = [];
  for (const box of sorted) {
    if (kept.every((k) => iou(k, box) < iouThresh)) {
      kept.push(box);
    }
  }
  return kept;
}

function decodeYoloOutput(
  output: { data: Float32Array | Uint8Array | Int32Array | BigInt64Array; dims: readonly number[] },
  meta: { scale: number; padX: number; padY: number; imgW: number; imgH: number },
  confThresh: number,
  tomatoOnly: boolean,
): DetectBox[] {
  // YOLOv8 export: [1, 4+nc, 8400]
  const data = output.data as Float32Array;
  const dims = output.dims;
  const channels = dims[1];
  const anchors = dims[2];
  const numClasses = channels - 4;
  const allowed = new Set(tomatoOnly ? TOMATO_CLASS_IDS : Object.keys(TOMATO_CLASS_NAMES).map(Number));

  const raw: DetectBox[] = [];
  for (let i = 0; i < anchors; i++) {
    let bestCls = 0;
    let bestScore = -1;
    for (let c = 0; c < numClasses; c++) {
      const score = data[(4 + c) * anchors + i];
      if (score > bestScore) {
        bestScore = score;
        bestCls = c;
      }
    }
    if (bestScore < confThresh || !allowed.has(bestCls)) {
      continue;
    }

    const cx = data[0 * anchors + i];
    const cy = data[1 * anchors + i];
    const w = data[2 * anchors + i];
    const h = data[3 * anchors + i];

    let x1 = (cx - w / 2 - meta.padX) / meta.scale;
    let y1 = (cy - h / 2 - meta.padY) / meta.scale;
    let x2 = (cx + w / 2 - meta.padX) / meta.scale;
    let y2 = (cy + h / 2 - meta.padY) / meta.scale;

    x1 = Math.max(0, Math.min(meta.imgW, x1));
    y1 = Math.max(0, Math.min(meta.imgH, y1));
    x2 = Math.max(0, Math.min(meta.imgW, x2));
    y2 = Math.max(0, Math.min(meta.imgH, y2));

    const className = TOMATO_CLASS_NAMES[bestCls] ?? `class_${bestCls}`;
    raw.push({
      x1,
      y1,
      x2,
      y2,
      score: bestScore,
      classId: bestCls,
      className,
      label: labelZh(className),
    });
  }

  return nms(raw);
}

function drawBoxes(img: HTMLImageElement, boxes: DetectBox[]): string {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  for (const box of boxes) {
    ctx.strokeStyle = '#f77f00';
    ctx.lineWidth = Math.max(2, canvas.width / 200);
    ctx.strokeRect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1);

    const text = `${box.label} ${(box.score * 100).toFixed(0)}%`;
    ctx.font = `${Math.max(14, canvas.width / 40)}px sans-serif`;
    const tw = ctx.measureText(text).width;
    const th = Math.max(18, canvas.width / 35);
    ctx.fillStyle = 'rgba(247, 127, 0, 0.9)';
    ctx.fillRect(box.x1, Math.max(0, box.y1 - th), tw + 8, th);
    ctx.fillStyle = '#fff';
    ctx.fillText(text, box.x1 + 4, Math.max(th - 4, box.y1 - 4));
  }

  return canvas.toDataURL('image/jpeg', 0.9);
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = dataUrl;
  });
}

export async function preloadTomatoModel(): Promise<void> {
  await getSession();
}

export async function detectTomatoDisease(
  imageDataUrl: string,
  options?: { conf?: number; tomatoOnly?: boolean },
): Promise<DetectResult> {
  const conf = options?.conf ?? 0.25;
  const tomatoOnly = options?.tomatoOnly ?? true;
  const img = await loadImage(imageDataUrl);
  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;

  const { canvas, scale, padX, padY } = letterbox(img, TOMATO_INPUT_SIZE);
  const ort = await loadOrt();
  const tensor = canvasToTensor(canvas, ort.Tensor);
  const session = await getSession();
  const inputName = session.inputNames[0];

  const t0 = performance.now();
  const feeds: Record<string, InstanceType<OrtModule['Tensor']>> = { [inputName]: tensor };
  const outputs = await session.run(feeds);
  const inferenceMs = performance.now() - t0;

  const out = outputs[session.outputNames[0]];
  const boxes = decodeYoloOutput(out, { scale, padX, padY, imgW, imgH }, conf, tomatoOnly);
  const annotatedDataUrl = boxes.length > 0 ? drawBoxes(img, boxes) : imageDataUrl;

  return {
    boxes,
    top: boxes[0],
    inferenceMs,
    annotatedDataUrl,
  };
}
