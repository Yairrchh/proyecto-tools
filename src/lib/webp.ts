// Un WebP animado lleva un chunk VP8X con la bandera de animación (0x02) en el byte 20.
export function isAnimatedWebp(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 21) return false;
  const tag = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  if (tag(0) !== 'RIFF' || tag(8) !== 'WEBP' || tag(12) !== 'VP8X') return false;
  return (bytes[20] & 0x02) !== 0;
}
