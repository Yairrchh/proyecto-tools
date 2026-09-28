import { describe, expect, it } from 'vitest';
import { formatBytes } from '@/lib/format';

describe('formatBytes', () => {
  it('muestra bytes', () => expect(formatBytes(500)).toBe('500 B'));
  it('muestra cero', () => expect(formatBytes(0)).toBe('0 B'));
  it('usa coma decimal en KB', () => expect(formatBytes(1536)).toBe('1,5 KB'));
  it('usa coma decimal en MB', () => expect(formatBytes(4404019)).toBe('4,2 MB'));
  it('sin decimales desde 100', () => expect(formatBytes(819200)).toBe('800 KB'));
});
