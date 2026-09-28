import { describe, expect, it } from 'vitest';
import { unzipSync } from 'fflate';
import { buildZip } from '@/lib/zip';

describe('buildZip', () => {
  it('empaqueta los archivos con su contenido', async () => {
    const zip = await buildZip([
      { name: 'a-comprimido.jpg', blob: new Blob([new Uint8Array([1, 2, 3])]) },
      { name: 'b-comprimido.png', blob: new Blob([new Uint8Array([4, 5])]) },
    ]);
    expect(zip.type).toBe('application/zip');
    const files = unzipSync(new Uint8Array(await zip.arrayBuffer()));
    expect(Object.keys(files).sort()).toEqual(['a-comprimido.jpg', 'b-comprimido.png']);
    expect(Array.from(files['a-comprimido.jpg'])).toEqual([1, 2, 3]);
  });

  it('falla si hay nombres duplicados en vez de sobrescribir', async () => {
    const blob = new Blob([new Uint8Array([1])]);
    await expect(
      buildZip([
        { name: 'x.jpg', blob },
        { name: 'x.jpg', blob },
      ]),
    ).rejects.toThrow(/duplicad/i);
  });
});
