import { ANIMATED_WEBP } from './errors';
import { QUALITY_LEVELS } from './quality';
import type { ImageFormat, QualityLevel } from './types';
import { isAnimatedWebp } from './webp';

async function toImageData(buffer: ArrayBuffer, mime: string): Promise<ImageData> {
  const bitmap = await createImageBitmap(new Blob([buffer], { type: mime }));
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo preparar la imagen.');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export async function compressBuffer(
  buffer: ArrayBuffer,
  format: ImageFormat,
  level: QualityLevel,
  mime: string,
): Promise<ArrayBuffer> {
  const preset = QUALITY_LEVELS[level];

  if (format === 'png') {
    const { optimise } = await import('@jsquash/oxipng');
    return optimise(buffer, { level: preset.pngLevel });
  }

  if (format === 'webp' && isAnimatedWebp(buffer)) throw new Error(ANIMATED_WEBP);

  const imageData = await toImageData(buffer, mime);
  if (format === 'jpeg') {
    const { encode } = await import('@jsquash/jpeg');
    return encode(imageData, { quality: preset.jpeg });
  }
  const { encode } = await import('@jsquash/webp');
  return encode(imageData, { quality: preset.webp });
}
