import { EXTENSION_BY_FORMAT, type ImageFormat } from './types';

export function outputName(
  originalName: string,
  format: ImageFormat,
  taken: Set<string>,
): string {
  const safe = originalName.replace(/[\\/]/g, '_');
  const dot = safe.lastIndexOf('.');
  const base = (dot > 0 ? safe.slice(0, dot) : dot === 0 ? '' : safe).trim() || 'imagen';
  const ext = EXTENSION_BY_FORMAT[format];

  let candidate = `${base}-comprimido.${ext}`;
  let n = 2;
  while (taken.has(candidate.toLowerCase())) {
    candidate = `${base}-comprimido-${n}.${ext}`;
    n++;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}
