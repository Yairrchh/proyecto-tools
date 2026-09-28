import { describe, expect, it } from 'vitest';
import { DEFAULT_QUALITY, QUALITY_LEVELS, QUALITY_ORDER } from '@/lib/quality';

describe('QUALITY_LEVELS', () => {
  it('el nivel por defecto es equilibrado', () => expect(DEFAULT_QUALITY).toBe('balanced'));
  it('tiene los tres niveles en orden', () => expect(QUALITY_ORDER).toEqual(['high', 'balanced', 'max']));
  it('la calidad baja al comprimir más', () => {
    const [high, balanced, max] = QUALITY_ORDER.map((l) => QUALITY_LEVELS[l]);
    expect(high.jpeg).toBeGreaterThan(balanced.jpeg);
    expect(balanced.jpeg).toBeGreaterThan(max.jpeg);
    expect(high.webp).toBeGreaterThan(max.webp);
    expect(high.pngLevel).toBeLessThan(max.pngLevel);
  });
  it('los valores están en rango', () => {
    for (const l of QUALITY_ORDER) {
      const p = QUALITY_LEVELS[l];
      expect(p.jpeg).toBeGreaterThanOrEqual(1);
      expect(p.jpeg).toBeLessThanOrEqual(100);
      expect(p.pngLevel).toBeGreaterThanOrEqual(0);
      expect(p.pngLevel).toBeLessThanOrEqual(6);
    }
  });
});
