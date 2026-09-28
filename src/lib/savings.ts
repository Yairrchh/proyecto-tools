export function savingsPercent(original: number, compressed: number): number {
  if (original <= 0) return 0;
  return Math.max(0, Math.round((1 - compressed / original) * 100));
}

export function chooseResult(
  original: Blob,
  compressed: Blob,
): { blob: Blob; keptOriginal: boolean } {
  if (compressed.size < original.size) return { blob: compressed, keptOriginal: false };
  return { blob: original, keptOriginal: true };
}
