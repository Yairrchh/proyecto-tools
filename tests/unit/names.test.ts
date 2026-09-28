import { describe, expect, it } from 'vitest';
import { outputName } from '@/lib/names';

describe('outputName', () => {
  it('añade -comprimido y normaliza la extensión', () => {
    expect(outputName('foto.jpeg', 'jpeg', new Set())).toBe('foto-comprimido.jpg');
  });
  it('respeta puntos dentro del nombre', () => {
    expect(outputName('mi.foto.final.png', 'png', new Set())).toBe('mi.foto.final-comprimido.png');
  });
  it('usa "imagen" si no hay nombre base', () => {
    expect(outputName('.jpg', 'jpeg', new Set())).toBe('imagen-comprimido.jpg');
  });
  it('genera nombres únicos para archivos repetidos', () => {
    const taken = new Set<string>();
    expect(outputName('IMG_0001.JPG', 'jpeg', taken)).toBe('IMG_0001-comprimido.jpg');
    expect(outputName('IMG_0001.JPG', 'jpeg', taken)).toBe('IMG_0001-comprimido-2.jpg');
    expect(outputName('IMG_0001.JPG', 'jpeg', taken)).toBe('IMG_0001-comprimido-3.jpg');
  });
  it('trata mayúsculas y minúsculas como el mismo nombre', () => {
    const taken = new Set<string>();
    expect(outputName('A.jpg', 'jpeg', taken)).toBe('A-comprimido.jpg');
    expect(outputName('a.jpg', 'jpeg', taken)).toBe('a-comprimido-2.jpg');
  });
  it('reemplaza separadores de ruta', () => {
    expect(outputName('a/b\\c.png', 'png', new Set())).toBe('a_b_c-comprimido.png');
  });
});
