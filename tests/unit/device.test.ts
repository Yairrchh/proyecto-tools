import { describe, expect, it } from 'vitest';
import { pickConcurrency } from '@/lib/device';

describe('pickConcurrency', () => {
  it('móvil (puntero táctil) usa 1', () => expect(pickConcurrency({ coarsePointer: true, cores: 8 })).toBe(1));
  it('escritorio con 8 núcleos usa 3', () => expect(pickConcurrency({ coarsePointer: false, cores: 8 })).toBe(3));
  it('escritorio con 4 núcleos usa 2', () => expect(pickConcurrency({ coarsePointer: false, cores: 4 })).toBe(2));
  it('nunca baja de 1', () => {
    expect(pickConcurrency({ coarsePointer: false, cores: 1 })).toBe(1);
    expect(pickConcurrency({ coarsePointer: false, cores: 2 })).toBe(1);
  });
});
