import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'tests', 'fixtures');
await mkdir(dir, { recursive: true });

const noise = (width, height) =>
  sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
      noise: { type: 'gaussian', mean: 128, sigma: 40 },
    },
  });

await noise(2000, 1500).jpeg({ quality: 100 }).toFile(path.join(dir, 'photo.jpg'));
await noise(1600, 1200).webp({ quality: 100 }).toFile(path.join(dir, 'photo.webp'));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
  <rect width="100%" height="100%" fill="#eef"/>
  <circle cx="600" cy="400" r="300" fill="#36c"/>
  <circle cx="600" cy="400" r="150" fill="#fc3"/>
</svg>`;
await sharp(Buffer.from(svg)).png({ compressionLevel: 0 }).toFile(path.join(dir, 'graphic.png'));

await writeFile(path.join(dir, 'broken.jpg'), 'esto no es una imagen');
await writeFile(path.join(dir, 'empty.jpg'), '');
await writeFile(path.join(dir, 'notes.txt'), 'texto de prueba');

console.log('Fixtures generados en', dir);
