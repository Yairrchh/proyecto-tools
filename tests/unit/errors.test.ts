import { describe, expect, it } from 'vitest';
import { ANIMATED_WEBP, friendlyError } from '@/lib/errors';

describe('friendlyError', () => {
  it('explica el caso del WebP animado', () => {
    expect(friendlyError(ANIMATED_WEBP)).toContain('animado');
  });
  it('usa un mensaje genérico para cualquier otro error técnico', () => {
    expect(friendlyError('RuntimeError: memory access out of bounds')).toBe('No se pudo procesar esta imagen.');
  });
});
