const THUMB_MAX_WIDTH = 480;
const THUMB_QUALITY = 0.72;

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = dataUrl;
  });
}

export async function compressPhotoForStorage(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith('data:image')) {
    return dataUrl;
  }

  try {
    const img = await loadImage(dataUrl);
    const scale = Math.min(1, THUMB_MAX_WIDTH / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return dataUrl;
    }

    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', THUMB_QUALITY);
  } catch {
    return dataUrl;
  }
}

export async function compressRecordsForStorage<T extends { photoDataUrl: string }>(
  records: T[],
): Promise<T[]> {
  return Promise.all(
    records.map(async (record) => ({
      ...record,
      photoDataUrl: await compressPhotoForStorage(record.photoDataUrl),
    })),
  );
}
