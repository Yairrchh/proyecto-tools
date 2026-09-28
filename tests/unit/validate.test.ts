import { describe, expect, it } from 'vitest';
import { MAX_FILES_PER_BATCH, MAX_FILE_BYTES, acceptFiles, validateFile } from '@/lib/validate';

const file = (name: string, type: string, size = 1000) => ({ name, type, size });

describe('validateFile', () => {
  it('acepta JPG por tipo', () => expect(validateFile(file('a.jpg', 'image/jpeg'))).toEqual({ ok: true, format: 'jpeg' }));
  it('acepta PNG y WebP', () => {
    expect(validateFile(file('a.png', 'image/png'))).toEqual({ ok: true, format: 'png' });
    expect(validateFile(file('a.webp', 'image/webp'))).toEqual({ ok: true, format: 'webp' });
  });
  it('usa la extensión si el tipo viene vacío', () => {
    expect(validateFile(file('FOTO.JPEG', ''))).toEqual({ ok: true, format: 'jpeg' });
  });
  it('rechaza archivos vacíos', () => {
    const r = validateFile(file('vacio.jpg', 'image/jpeg', 0));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('vacío');
  });
  it('rechaza archivos demasiado grandes', () => {
    const r = validateFile(file('grande.jpg', 'image/jpeg', MAX_FILE_BYTES + 1));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('25 MB');
  });
  it.each([
    ['foto.heic', 'image/heic'],
    ['anim.gif', 'image/gif'],
    ['logo.svg', 'image/svg+xml'],
    ['doc.pdf', 'application/pdf'],
    ['notas.txt', 'text/plain'],
    ['engaño.jpg', 'image/gif'],
  ])('rechaza %s (%s)', (name, type) => {
    const r = validateFile(file(name, type));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('JPG, PNG o WebP');
  });
});

describe('acceptFiles', () => {
  it('separa aceptados y rechazados sin detener el resto', () => {
    const res = acceptFiles(
      [file('a.jpg', 'image/jpeg'), file('b.gif', 'image/gif'), file('c.png', 'image/png')],
      0,
    );
    expect(res.accepted.map((a) => a.file.name)).toEqual(['a.jpg', 'c.png']);
    expect(res.rejected).toHaveLength(1);
    expect(res.rejected[0].name).toBe('b.gif');
  });
  it('respeta el máximo por lote contando los ya existentes', () => {
    const files = Array.from({ length: 5 }, (_, i) => file(`f${i}.jpg`, 'image/jpeg'));
    const res = acceptFiles(files, MAX_FILES_PER_BATCH - 2);
    expect(res.accepted).toHaveLength(2);
    expect(res.rejected).toHaveLength(3);
    expect(res.rejected[0].reason).toContain('20');
  });
  it('los rechazados por formato no consumen cupo', () => {
    const res = acceptFiles([file('x.gif', 'image/gif'), file('y.jpg', 'image/jpeg')], MAX_FILES_PER_BATCH - 1);
    expect(res.accepted).toHaveLength(1);
  });
});
