import { describe, expect, it } from 'vitest';
import { chooseResult, savingsPercent } from '@/lib/savings';

describe('savingsPercent', () => {
  it('calcula el porcentaje ahorrado', () => expect(savingsPercent(4_200_000, 1_100_000)).toBe(74));
  it('nunca es negativo', () => expect(savingsPercent(100, 120)).toBe(0));
  it('original 0 devuelve 0', () => expect(savingsPercent(0, 0)).toBe(0));
});

describe('chooseResult', () => {
  it('usa el comprimido si es más pequeño', () => {
    const original = new Blob([new Uint8Array(100)]);
    const compressed = new Blob([new Uint8Array(60)]);
    const r = chooseResult(original, compressed);
    expect(r.blob).toBe(compressed);
    expect(r.keptOriginal).toBe(false);
  });
  it('conserva el original si el comprimido es más grande', () => {
    const original = new Blob([new Uint8Array(100)]);
    const compressed = new Blob([new Uint8Array(140)]);
    const r = chooseResult(original, compressed);
    expect(r.blob).toBe(original);
    expect(r.keptOriginal).toBe(true);
  });
  it('conserva el original si pesan lo mismo', () => {
    const original = new Blob([new Uint8Array(100)]);
    const compressed = new Blob([new Uint8Array(100)]);
    expect(chooseResult(original, compressed).keptOriginal).toBe(true);
  });
});
