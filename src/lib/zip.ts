import { zipSync } from 'fflate';

export async function buildZip(entries: { name: string; blob: Blob }[]): Promise<Blob> {
  const files: Record<string, Uint8Array> = {};
  for (const { name, blob } of entries) {
    if (name in files) throw new Error(`Nombre duplicado en el ZIP: ${name}`);
    files[name] = new Uint8Array(await blob.arrayBuffer());
  }
  // Las imágenes ya están comprimidas: se almacenan sin recomprimir (level 0).
  const zipped = zipSync(files, { level: 0 });
  return new Blob([zipped as BlobPart], { type: 'application/zip' });
}
