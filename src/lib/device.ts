export function pickConcurrency({
  coarsePointer,
  cores,
}: {
  coarsePointer: boolean;
  cores: number;
}): number {
  if (coarsePointer) return 1;
  return Math.max(1, Math.min(3, Math.floor(cores / 2)));
}

export function detectConcurrency(): number {
  const coarsePointer =
    typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2;
  return pickConcurrency({ coarsePointer, cores });
}
