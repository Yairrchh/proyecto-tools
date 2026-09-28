import type { ImageFormat } from './types';

export const MAX_FILE_MB = 25;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
export const MAX_FILES_PER_BATCH = 20;

export type FileLike = { name: string; type: string; size: number };
export type ValidationResult = { ok: true; format: ImageFormat } | { ok: false; reason: string };

const FORMAT_BY_MIME: Record<string, ImageFormat> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const FORMAT_BY_EXTENSION: Record<string, ImageFormat> = {
  jpg: 'jpeg',
  jpeg: 'jpeg',
  png: 'png',
  webp: 'webp',
};

function detectFormat(file: FileLike): ImageFormat | null {
  if (file.type) return FORMAT_BY_MIME[file.type] ?? null;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return FORMAT_BY_EXTENSION[ext] ?? null;
}

export function validateFile(file: FileLike): ValidationResult {
  if (file.size === 0) return { ok: false, reason: `"${file.name}" está vacío.` };
  const format = detectFormat(file);
  if (!format) {
    return { ok: false, reason: `"${file.name}" no es compatible. Usa JPG, PNG o WebP.` };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, reason: `"${file.name}" pesa más de ${MAX_FILE_MB} MB.` };
  }
  return { ok: true, format };
}

export function acceptFiles<T extends FileLike>(
  files: T[],
  existingCount: number,
): {
  accepted: { file: T; format: ImageFormat }[];
  rejected: { name: string; reason: string }[];
} {
  const accepted: { file: T; format: ImageFormat }[] = [];
  const rejected: { name: string; reason: string }[] = [];

  for (const file of files) {
    const result = validateFile(file);
    if (!result.ok) {
      rejected.push({ name: file.name, reason: result.reason });
    } else if (existingCount + accepted.length >= MAX_FILES_PER_BATCH) {
      rejected.push({
        name: file.name,
        reason: `"${file.name}" no se añadió: el máximo es ${MAX_FILES_PER_BATCH} imágenes.`,
      });
    } else {
      accepted.push({ file, format: result.format });
    }
  }
  return { accepted, rejected };
}
