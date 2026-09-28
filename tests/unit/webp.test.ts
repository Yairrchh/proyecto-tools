import { describe, expect, it } from 'vitest';
import { isAnimatedWebp } from '@/lib/webp';

function webpHeader(chunk: string, flags: number): ArrayBuffer {
  const bytes = new Uint8Array(30);
  const put = (offset: number, text: string) => [...text].forEach((c, i) => (bytes[offset + i] = c.charCodeAt(0)));
  put(0, 'RIFF');
  put(8, 'WEBP');
  put(12, chunk);
  bytes[20] = flags;
  return bytes.buffer;
}

describe('isAnimatedWebp', () => {
  it('detecta la bandera de animación en VP8X', () => expect(isAnimatedWebp(webpHeader('VP8X', 0x02))).toBe(true));
  it('detecta la animación aunque haya otras banderas', () => expect(isAnimatedWebp(webpHeader('VP8X', 0x12))).toBe(true));
  it('un VP8X sin animación no lo es', () => expect(isAnimatedWebp(webpHeader('VP8X', 0x10))).toBe(false));
  it('un WebP simple (VP8 ) no es animado', () => expect(isAnimatedWebp(webpHeader('VP8 ', 0x02))).toBe(false));
  it('datos que no son WebP o demasiado cortos no lo son', () => {
    expect(isAnimatedWebp(new Uint8Array(5).buffer)).toBe(false);
    expect(isAnimatedWebp(new TextEncoder().encode('esto no es un webp, ni de lejos').buffer as ArrayBuffer)).toBe(false);
  });
});
