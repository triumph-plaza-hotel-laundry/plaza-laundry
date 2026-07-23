const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const MAX_OUTPUT_WIDTH = 1920;
const WEBP_QUALITY = 0.86;

export type OptimizedImage = {
  dataUrl: string;
  width: number;
  height: number;
  bytesApprox: number;
  mimeType: 'image/webp' | 'image/png';
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Failed to read image file.'));
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Invalid image file.'));
    image.src = src;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Failed to encode optimized image.'));
    };
    reader.onerror = () => reject(new Error('Failed to encode optimized image.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert uploaded/pasted images to lightweight WebP (PNG fallback if WebP
 * encoding fails or transparency requires it). Caps width at ~1920px.
 */
export async function optimizeTrainingImage(file: File): Promise<OptimizedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed.');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('Image is too large. Maximum upload size is 8 MB.');
  }

  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(originalDataUrl);
  const scale =
    image.width > MAX_OUTPUT_WIDTH ? MAX_OUTPUT_WIDTH / image.width : 1;
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize image optimizer.');
  }
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  const webpBlob = await canvasToBlob(canvas, 'image/webp', WEBP_QUALITY);
  if (webpBlob && webpBlob.size > 0) {
    const dataUrl = await blobToDataUrl(webpBlob);
    return {
      dataUrl,
      width,
      height,
      bytesApprox: webpBlob.size,
      mimeType: 'image/webp',
    };
  }

  // Preserve transparency when WebP is unavailable in the browser.
  const pngBlob = await canvasToBlob(canvas, 'image/png');
  if (!pngBlob) {
    throw new Error('Could not optimize image.');
  }
  const dataUrl = await blobToDataUrl(pngBlob);
  return {
    dataUrl,
    width,
    height,
    bytesApprox: pngBlob.size,
    mimeType: 'image/png',
  };
}

export async function optimizeTrainingImageFromDataUrl(
  dataUrl: string,
): Promise<OptimizedImage> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const file = new File([blob], 'pasted-image.png', {
    type: blob.type || 'image/png',
  });
  return optimizeTrainingImage(file);
}
