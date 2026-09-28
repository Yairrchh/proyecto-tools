# Compresor de imágenes online — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una web que comprime imágenes JPG, PNG y WebP íntegramente en el navegador, con páginas SEO por formato y descarga individual o en ZIP.

**Architecture:** Next.js (App Router) con páginas estáticas. La lógica pura (validación, nombres, cola, reducer de trabajos, ZIP) vive en `src/lib` y se prueba con Vitest. La compresión corre en Web Workers con códecs WASM de jSquash cargados bajo demanda. La interfaz React consume un hook que orquesta cola, workers y estado. Playwright verifica el flujo real en escritorio y móvil.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, `@jsquash/jpeg`, `@jsquash/webp`, `@jsquash/oxipng`, `fflate`, Vitest, Playwright, sharp (solo para generar fixtures de prueba).

**Spec:** `docs/superpowers/specs/2026-09-28-image-compressor-design.md`

## Global Constraints

- Todo el procesamiento ocurre en el navegador. Sin backend, sin base de datos, sin subida de archivos.
- Formatos soportados: JPG, PNG y WebP.
- Tres niveles de calidad: alta calidad, equilibrada (por defecto) y máxima compresión.
- Textos de la interfaz y del SEO solo en español.
- Sin registro, cuentas, pagos, publicidad, API, conversión de formatos, redimensionado ni comparador antes/después.
- Los códecs WASM se cargan bajo demanda, nunca al abrir la página.
- Móvil primero; límite de trabajos simultáneos más bajo en móvil.
- Rutas: `/` es la herramienta; rutas SEO `/comprimir-jpg`, `/comprimir-png`, `/comprimir-webp` reutilizan el mismo componente.
- Stack fijado: Next.js + TypeScript + Tailwind, jSquash, Web Workers, fflate, Vitest, Playwright.
- Modo claro/oscuro según la preferencia del sistema (sin selector manual).
- Mensaje de privacidad visible: "Tus imágenes no salen de tu dispositivo."
- Si el comprimido pesa igual o más que el original, se conserva el original.
- Cada mensaje de commit termina con el trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

**Decisiones fijadas por este plan** (las que el spec §9 dejaba pendientes):
- Máximo 25 MB por archivo y 20 imágenes por lote.
- Calidades: alta = JPEG 85 / WebP 85 / oxipng nivel 2; equilibrada = 75 / 75 / nivel 3; máxima = 60 / 60 / nivel 4. PNG se comprime sin pérdida (solo oxipng), por lo que su ahorro es menor.
- Nombre de trabajo del producto: "Compresor de imágenes" (una constante en `src/lib/site.ts`, fácil de cambiar).
- Hosting y analítica quedan fuera de este plan (se deciden al publicar).

## Review Focus

Entradas que el spec implica pero que ninguna tarea prueba por sí sola; cada una tiene su prueba en la tarea indicada.

1. Archivo corrupto o vacío (0 bytes, o bytes basura con extensión `.jpg`): esa fila muestra error y las demás imágenes del lote siguen (Tarea 3 unit + Tarea 10 e2e).
2. Dos archivos con el mismo nombre (p. ej. `IMG_0001.jpg` de carpetas distintas): el ZIP no sobrescribe ninguno, los nombres salen únicos (Tarea 2 unit + Tarea 4 unit + Tarea 10 e2e).
3. Imagen ya optimizada o PNG casi incompresible: nunca se entrega algo más grande que el original; se conserva el original (Tarea 2 unit).
4. Tipos no soportados (HEIC, GIF, SVG, PDF, TXT) o más de 20 archivos: mensaje claro por archivo y el resto sigue (Tarea 3 unit + Tarea 10 e2e).
5. Cambiar el nivel de calidad con trabajos en curso: los resultados de la ejecución anterior no pisan a los nuevos (Tarea 5 unit + Tarea 10 e2e).

---

### Task 1: Andamiaje del proyecto y herramientas de prueba

**Files:**
- Create (generados): `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/*`, etc.
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts), `.gitignore`, `src/app/layout.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: alias `@/` → `src/`; scripts `npm test`, `npm run typecheck`, `npm run test:e2e`; dependencias `@jsquash/jpeg`, `@jsquash/webp`, `@jsquash/oxipng`, `fflate`, `vitest`, `@playwright/test`, `sharp`.

- [ ] **Step 1: Crear el proyecto Next.js en la carpeta actual**

```bash
cd /home/yairrchh/Carpetapersonal/proyecto-tool
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```

Expected: se crean `package.json`, `src/app/page.tsx`, `src/app/layout.tsx`, etc. La carpeta `docs/` y `.git` se conservan. Si el comando se niega por archivos existentes, generar en `../scaffold-tmp` con las mismas opciones y copiar todo (excepto `.git`) a esta carpeta.

- [ ] **Step 2: Instalar dependencias**

```bash
npm install @jsquash/jpeg @jsquash/webp @jsquash/oxipng fflate
npm install -D vitest @playwright/test sharp
npx playwright install chromium
```

Expected: sin errores.

- [ ] **Step 3: Crear la configuración de Vitest**

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Añadir scripts, ignorar artefactos de prueba y fijar el idioma**

```bash
npm pkg set scripts.test="vitest run"
npm pkg set scripts.typecheck="tsc --noEmit"
npm pkg set scripts.pretest:e2e="node scripts/make-fixtures.mjs"
npm pkg set scripts.test:e2e="playwright test"
printf '\n# tests\n/tests/fixtures/\n/playwright-report/\n/test-results/\n' >> .gitignore
sed -i 's/lang="en"/lang="es"/' src/app/layout.tsx
grep -n 'lang=' src/app/layout.tsx
```

Expected: el `grep` muestra `lang="es"`.

- [ ] **Step 5: Verificar que todo compila**

Run: `npx vitest run --passWithNoTests && npm run typecheck && npm run build`
Expected: Vitest sin tests y sin error; typecheck y build terminan sin errores.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with Vitest and Playwright deps" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Lógica pura — tipos, formato de tamaños, ahorro y nombres de salida

**Files:**
- Create: `src/lib/types.ts`, `src/lib/format.ts`, `src/lib/savings.ts`, `src/lib/names.ts`
- Test: `tests/unit/format.test.ts`, `tests/unit/savings.test.ts`, `tests/unit/names.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `types.ts`: `type ImageFormat = 'jpeg' | 'png' | 'webp'`; `type QualityLevel = 'high' | 'balanced' | 'max'`; `MIME_BY_FORMAT: Record<ImageFormat, string>`; `EXTENSION_BY_FORMAT: Record<ImageFormat, string>`.
  - `format.ts`: `formatBytes(bytes: number): string`.
  - `savings.ts`: `savingsPercent(original: number, compressed: number): number`; `chooseResult(original: Blob, compressed: Blob): { blob: Blob; keptOriginal: boolean }`.
  - `names.ts`: `outputName(originalName: string, format: ImageFormat, taken: Set<string>): string` (muta `taken`).

- [ ] **Step 1: Escribir los tests que fallan**

`tests/unit/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatBytes } from '@/lib/format';

describe('formatBytes', () => {
  it('muestra bytes', () => expect(formatBytes(500)).toBe('500 B'));
  it('muestra cero', () => expect(formatBytes(0)).toBe('0 B'));
  it('usa coma decimal en KB', () => expect(formatBytes(1536)).toBe('1,5 KB'));
  it('usa coma decimal en MB', () => expect(formatBytes(4404019)).toBe('4,2 MB'));
  it('sin decimales desde 100', () => expect(formatBytes(819200)).toBe('800 KB'));
});
```

`tests/unit/savings.test.ts`:

```ts
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
```

`tests/unit/names.test.ts`:

```ts
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
```

- [ ] **Step 2: Ejecutar y comprobar que fallan**

Run: `npm test`
Expected: FAIL — no se pueden resolver `@/lib/format`, `@/lib/savings`, `@/lib/names`.

- [ ] **Step 3: Implementar**

`src/lib/types.ts`:

```ts
export type ImageFormat = 'jpeg' | 'png' | 'webp';
export type QualityLevel = 'high' | 'balanced' | 'max';

export const MIME_BY_FORMAT: Record<ImageFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export const EXTENSION_BY_FORMAT: Record<ImageFormat, string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
};
```

`src/lib/format.ts`:

```ts
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  const decimals = value >= 100 ? 0 : 1;
  return `${value.toFixed(decimals).replace('.', ',')} ${units[unit]}`;
}
```

`src/lib/savings.ts`:

```ts
export function savingsPercent(original: number, compressed: number): number {
  if (original <= 0) return 0;
  return Math.max(0, Math.round((1 - compressed / original) * 100));
}

export function chooseResult(
  original: Blob,
  compressed: Blob,
): { blob: Blob; keptOriginal: boolean } {
  if (compressed.size < original.size) return { blob: compressed, keptOriginal: false };
  return { blob: original, keptOriginal: true };
}
```

`src/lib/names.ts`:

```ts
import { EXTENSION_BY_FORMAT, type ImageFormat } from './types';

export function outputName(
  originalName: string,
  format: ImageFormat,
  taken: Set<string>,
): string {
  const safe = originalName.replace(/[\\/]/g, '_');
  const dot = safe.lastIndexOf('.');
  const base = (dot > 0 ? safe.slice(0, dot) : dot === 0 ? '' : safe).trim() || 'imagen';
  const ext = EXTENSION_BY_FORMAT[format];

  let candidate = `${base}-comprimido.${ext}`;
  let n = 2;
  while (taken.has(candidate.toLowerCase())) {
    candidate = `${base}-comprimido-${n}.${ext}`;
    n++;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasan**

Run: `npm test`
Expected: PASS — 14 tests en 3 archivos.

- [ ] **Step 5: Commit**

```bash
git add src/lib tests/unit
git commit -m "feat: add byte formatting, savings and output-name helpers" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Niveles de calidad y validación de archivos

**Files:**
- Create: `src/lib/quality.ts`, `src/lib/validate.ts`
- Test: `tests/unit/quality.test.ts`, `tests/unit/validate.test.ts`

**Interfaces:**
- Consumes: `ImageFormat`, `QualityLevel` de `src/lib/types.ts`.
- Produces:
  - `quality.ts`: `interface QualityPreset { label: string; description: string; jpeg: number; webp: number; pngLevel: number }`; `QUALITY_LEVELS: Record<QualityLevel, QualityPreset>`; `QUALITY_ORDER: QualityLevel[]`; `DEFAULT_QUALITY: QualityLevel`.
  - `validate.ts`: `MAX_FILE_MB = 25`; `MAX_FILE_BYTES`; `MAX_FILES_PER_BATCH = 20`; `type FileLike = { name: string; type: string; size: number }`; `type ValidationResult = { ok: true; format: ImageFormat } | { ok: false; reason: string }`; `validateFile(file: FileLike): ValidationResult`; `acceptFiles<T extends FileLike>(files: T[], existingCount: number): { accepted: { file: T; format: ImageFormat }[]; rejected: { name: string; reason: string }[] }`.

- [ ] **Step 1: Escribir los tests que fallan**

`tests/unit/quality.test.ts`:

```ts
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
```

`tests/unit/validate.test.ts`:

```ts
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
```

- [ ] **Step 2: Ejecutar y comprobar que fallan**

Run: `npm test`
Expected: FAIL — no se pueden resolver `@/lib/quality` ni `@/lib/validate`.

- [ ] **Step 3: Implementar**

`src/lib/quality.ts`:

```ts
import type { QualityLevel } from './types';

export interface QualityPreset {
  label: string;
  description: string;
  jpeg: number;
  webp: number;
  pngLevel: number;
}

export const QUALITY_LEVELS: Record<QualityLevel, QualityPreset> = {
  high: { label: 'Alta calidad', description: 'Casi sin diferencia visible', jpeg: 85, webp: 85, pngLevel: 2 },
  balanced: { label: 'Equilibrada', description: 'La mejor relación tamaño/calidad', jpeg: 75, webp: 75, pngLevel: 3 },
  max: { label: 'Máxima compresión', description: 'El archivo más pequeño posible', jpeg: 60, webp: 60, pngLevel: 4 },
};

export const QUALITY_ORDER: QualityLevel[] = ['high', 'balanced', 'max'];
export const DEFAULT_QUALITY: QualityLevel = 'balanced';
```

`src/lib/validate.ts`:

```ts
import type { ImageFormat } from './types';

export const MAX_FILE_MB = 25;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
export const MAX_FILES_PER_BATCH = 20;

export type FileLike = { name: string; type: string; size: number };
export type ValidationResult = { ok: true; format: ImageFormat } | { ok: false; reason: string };

const FORMAT_BY_MIME: Record<string, ImageFormat> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const FORMAT_BY_EXTENSION: Record<string, ImageFormat> = {
  jpg: 'jpeg',
  jpeg: 'jpeg',
  png: 'png',
  webp: 'webp',
};

function detectFormat(file: FileLike): ImageFormat | null {
  if (file.type) return FORMAT_BY_MIME[file.type] ?? null;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return FORMAT_BY_EXTENSION[ext] ?? null;
}

export function validateFile(file: FileLike): ValidationResult {
  if (file.size === 0) return { ok: false, reason: `"${file.name}" está vacío.` };
  const format = detectFormat(file);
  if (!format) {
    return { ok: false, reason: `"${file.name}" no es compatible. Usa JPG, PNG o WebP.` };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, reason: `"${file.name}" pesa más de ${MAX_FILE_MB} MB.` };
  }
  return { ok: true, format };
}

export function acceptFiles<T extends FileLike>(
  files: T[],
  existingCount: number,
): {
  accepted: { file: T; format: ImageFormat }[];
  rejected: { name: string; reason: string }[];
} {
  const accepted: { file: T; format: ImageFormat }[] = [];
  const rejected: { name: string; reason: string }[] = [];

  for (const file of files) {
    const result = validateFile(file);
    if (!result.ok) {
      rejected.push({ name: file.name, reason: result.reason });
    } else if (existingCount + accepted.length >= MAX_FILES_PER_BATCH) {
      rejected.push({
        name: file.name,
        reason: `"${file.name}" no se añadió: el máximo es ${MAX_FILES_PER_BATCH} imágenes.`,
      });
    } else {
      accepted.push({ file, format: result.format });
    }
  }
  return { accepted, rejected };
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasan**

Run: `npm test`
Expected: PASS — todos los tests de Tareas 2 y 3.

- [ ] **Step 5: Commit**

```bash
git add src/lib tests/unit
git commit -m "feat: add quality presets and file validation" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Cola de trabajos, concurrencia por dispositivo y ZIP

**Files:**
- Create: `src/lib/queue.ts`, `src/lib/device.ts`, `src/lib/zip.ts`
- Test: `tests/unit/queue.test.ts`, `tests/unit/device.test.ts`, `tests/unit/zip.test.ts`

**Interfaces:**
- Consumes: nada de tareas anteriores.
- Produces:
  - `queue.ts`: `createQueue(concurrency: number): <T>(task: () => Promise<T>) => Promise<T>`.
  - `device.ts`: `pickConcurrency(input: { coarsePointer: boolean; cores: number }): number`; `detectConcurrency(): number`.
  - `zip.ts`: `buildZip(entries: { name: string; blob: Blob }[]): Promise<Blob>` (lanza `Error` si hay nombres duplicados).

- [ ] **Step 1: Escribir los tests que fallan**

`tests/unit/queue.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createQueue } from '@/lib/queue';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('createQueue', () => {
  it('nunca supera el límite de concurrencia', async () => {
    const add = createQueue(2);
    let active = 0;
    let max = 0;
    const task = () => async () => {
      active++;
      max = Math.max(max, active);
      await sleep(10);
      active--;
    };
    await Promise.all(Array.from({ length: 6 }, () => add(task())));
    expect(max).toBe(2);
  });

  it('devuelve el valor de cada tarea', async () => {
    const add = createQueue(1);
    const values = await Promise.all([add(async () => 1), add(async () => 2)]);
    expect(values).toEqual([1, 2]);
  });

  it('sigue con las demás tareas si una falla', async () => {
    const add = createQueue(1);
    const results = await Promise.allSettled([
      add(async () => {
        throw new Error('boom');
      }),
      add(async () => 'ok'),
    ]);
    expect(results[0].status).toBe('rejected');
    expect(results[1]).toEqual({ status: 'fulfilled', value: 'ok' });
  });

  it('trata una excepción síncrona como rechazo', async () => {
    const add = createQueue(1);
    const p = add(() => {
      throw new Error('sync');
    });
    await expect(p).rejects.toThrow('sync');
    await expect(add(async () => 'next')).resolves.toBe('next');
  });
});
```

`tests/unit/device.test.ts`:

```ts
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
```

`tests/unit/zip.test.ts`:

```ts
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
```

- [ ] **Step 2: Ejecutar y comprobar que fallan**

Run: `npm test`
Expected: FAIL — no se pueden resolver `@/lib/queue`, `@/lib/device`, `@/lib/zip`.

- [ ] **Step 3: Implementar**

`src/lib/queue.ts`:

```ts
export function createQueue(concurrency: number) {
  let active = 0;
  const pending: Array<() => void> = [];

  const next = () => {
    if (active >= concurrency) return;
    const run = pending.shift();
    if (!run) return;
    active++;
    run();
  };

  return function add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      pending.push(() => {
        Promise.resolve()
          .then(task)
          .then(resolve, reject)
          .finally(() => {
            active--;
            next();
          });
      });
      next();
    });
  };
}
```

`src/lib/device.ts`:

```ts
export function pickConcurrency({
  coarsePointer,
  cores,
}: {
  coarsePointer: boolean;
  cores: number;
}): number {
  if (coarsePointer) return 1;
  return Math.max(1, Math.min(3, Math.floor(cores / 2)));
}

export function detectConcurrency(): number {
  const coarsePointer =
    typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2;
  return pickConcurrency({ coarsePointer, cores });
}
```

`src/lib/zip.ts`:

```ts
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
```

- [ ] **Step 4: Ejecutar y comprobar que pasan**

Run: `npm test`
Expected: PASS — todos los tests de Tareas 2 a 4.

- [ ] **Step 5: Commit**

```bash
git add src/lib tests/unit
git commit -m "feat: add job queue, concurrency detection and zip builder" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Estado de los trabajos (reducer y resumen)

**Files:**
- Create: `src/lib/jobs.ts`
- Test: `tests/unit/jobs.test.ts`

**Interfaces:**
- Consumes: `ImageFormat` (`types.ts`), `savingsPercent` (`savings.ts`).
- Produces:
  - `type JobStatus = 'queued' | 'processing' | 'done' | 'error'`.
  - `interface Job { id: string; file: File; format: ImageFormat; status: JobStatus; attempt: number; originalSize: number; compressedSize?: number; blob?: Blob; keptOriginal?: boolean; error?: string }`.
  - `type JobAction = { type: 'add'; jobs: Job[] } | { type: 'start'; id: string; attempt: number } | { type: 'done'; id: string; attempt: number; blob: Blob; keptOriginal: boolean } | { type: 'fail'; id: string; attempt: number; error: string } | { type: 'requeue' } | { type: 'remove'; id: string } | { type: 'clear' }`.
  - `jobsReducer(state: Job[], action: JobAction): Job[]`.
  - `summarize(jobs: Job[]): { doneCount: number; pendingCount: number; originalTotal: number; compressedTotal: number; percent: number }`.

- [ ] **Step 1: Escribir los tests que fallan**

`tests/unit/jobs.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { jobsReducer, summarize, type Job } from '@/lib/jobs';

const makeJob = (id: string, size = 1000): Job => ({
  id,
  file: { name: `${id}.jpg`, size, type: 'image/jpeg' } as unknown as File,
  format: 'jpeg',
  status: 'queued',
  attempt: 0,
  originalSize: size,
});

const blobOf = (n: number) => new Blob([new Uint8Array(n)]);

describe('jobsReducer', () => {
  it('añade trabajos', () => {
    const state = jobsReducer([], { type: 'add', jobs: [makeJob('a'), makeJob('b')] });
    expect(state.map((j) => j.id)).toEqual(['a', 'b']);
  });

  it('pasa por start → done y guarda el resultado', () => {
    let state = jobsReducer([], { type: 'add', jobs: [makeJob('a', 1000)] });
    state = jobsReducer(state, { type: 'start', id: 'a', attempt: 0 });
    expect(state[0].status).toBe('processing');
    state = jobsReducer(state, { type: 'done', id: 'a', attempt: 0, blob: blobOf(400), keptOriginal: false });
    expect(state[0].status).toBe('done');
    expect(state[0].compressedSize).toBe(400);
    expect(state[0].keptOriginal).toBe(false);
  });

  it('marca error sin afectar a los demás', () => {
    let state = jobsReducer([], { type: 'add', jobs: [makeJob('a'), makeJob('b')] });
    state = jobsReducer(state, { type: 'fail', id: 'a', attempt: 0, error: 'roto' });
    expect(state[0]).toMatchObject({ status: 'error', error: 'roto' });
    expect(state[1].status).toBe('queued');
  });

  it('requeue sube el intento, limpia resultados y vuelve a poner en cola', () => {
    let state = jobsReducer([], { type: 'add', jobs: [makeJob('a')] });
    state = jobsReducer(state, { type: 'done', id: 'a', attempt: 0, blob: blobOf(300), keptOriginal: false });
    state = jobsReducer(state, { type: 'requeue' });
    expect(state[0]).toMatchObject({ status: 'queued', attempt: 1 });
    expect(state[0].blob).toBeUndefined();
    expect(state[0].compressedSize).toBeUndefined();
  });

  it('ignora resultados de un intento anterior (cambio de calidad en curso)', () => {
    let state = jobsReducer([], { type: 'add', jobs: [makeJob('a')] });
    state = jobsReducer(state, { type: 'requeue' }); // ahora attempt = 1
    state = jobsReducer(state, { type: 'done', id: 'a', attempt: 0, blob: blobOf(300), keptOriginal: false });
    expect(state[0].status).toBe('queued');
    state = jobsReducer(state, { type: 'fail', id: 'a', attempt: 0, error: 'viejo' });
    expect(state[0].status).toBe('queued');
    state = jobsReducer(state, { type: 'done', id: 'a', attempt: 1, blob: blobOf(200), keptOriginal: false });
    expect(state[0]).toMatchObject({ status: 'done', compressedSize: 200 });
  });

  it('elimina y limpia', () => {
    let state = jobsReducer([], { type: 'add', jobs: [makeJob('a'), makeJob('b')] });
    state = jobsReducer(state, { type: 'remove', id: 'a' });
    expect(state.map((j) => j.id)).toEqual(['b']);
    expect(jobsReducer(state, { type: 'clear' })).toEqual([]);
  });
});

describe('summarize', () => {
  it('suma solo los trabajos terminados y cuenta los pendientes', () => {
    let state = jobsReducer([], { type: 'add', jobs: [makeJob('a', 1000), makeJob('b', 3000), makeJob('c', 500)] });
    state = jobsReducer(state, { type: 'done', id: 'a', attempt: 0, blob: blobOf(250), keptOriginal: false });
    state = jobsReducer(state, { type: 'done', id: 'b', attempt: 0, blob: blobOf(750), keptOriginal: false });
    state = jobsReducer(state, { type: 'start', id: 'c', attempt: 0 });
    expect(summarize(state)).toEqual({
      doneCount: 2,
      pendingCount: 1,
      originalTotal: 4000,
      compressedTotal: 1000,
      percent: 75,
    });
  });

  it('con lista vacía devuelve ceros', () => {
    expect(summarize([])).toEqual({ doneCount: 0, pendingCount: 0, originalTotal: 0, compressedTotal: 0, percent: 0 });
  });
});
```

- [ ] **Step 2: Ejecutar y comprobar que fallan**

Run: `npm test -- jobs`
Expected: FAIL — no se puede resolver `@/lib/jobs`.

- [ ] **Step 3: Implementar**

`src/lib/jobs.ts`:

```ts
import { savingsPercent } from './savings';
import type { ImageFormat } from './types';

export type JobStatus = 'queued' | 'processing' | 'done' | 'error';

export interface Job {
  id: string;
  file: File;
  format: ImageFormat;
  status: JobStatus;
  attempt: number;
  originalSize: number;
  compressedSize?: number;
  blob?: Blob;
  keptOriginal?: boolean;
  error?: string;
}

export type JobAction =
  | { type: 'add'; jobs: Job[] }
  | { type: 'start'; id: string; attempt: number }
  | { type: 'done'; id: string; attempt: number; blob: Blob; keptOriginal: boolean }
  | { type: 'fail'; id: string; attempt: number; error: string }
  | { type: 'requeue' }
  | { type: 'remove'; id: string }
  | { type: 'clear' };

function update(state: Job[], id: string, attempt: number, fn: (job: Job) => Job): Job[] {
  return state.map((job) => (job.id === id && job.attempt === attempt ? fn(job) : job));
}

export function jobsReducer(state: Job[], action: JobAction): Job[] {
  switch (action.type) {
    case 'add':
      return [...state, ...action.jobs];
    case 'start':
      return update(state, action.id, action.attempt, (j) => ({ ...j, status: 'processing' }));
    case 'done':
      return update(state, action.id, action.attempt, (j) => ({
        ...j,
        status: 'done',
        blob: action.blob,
        compressedSize: action.blob.size,
        keptOriginal: action.keptOriginal,
        error: undefined,
      }));
    case 'fail':
      return update(state, action.id, action.attempt, (j) => ({
        ...j,
        status: 'error',
        error: action.error,
      }));
    case 'requeue':
      return state.map((j) => ({
        ...j,
        status: 'queued',
        attempt: j.attempt + 1,
        blob: undefined,
        compressedSize: undefined,
        keptOriginal: undefined,
        error: undefined,
      }));
    case 'remove':
      return state.filter((j) => j.id !== action.id);
    case 'clear':
      return [];
  }
}

export function summarize(jobs: Job[]) {
  const done = jobs.filter((j) => j.status === 'done' && j.blob);
  const originalTotal = done.reduce((sum, j) => sum + j.originalSize, 0);
  const compressedTotal = done.reduce((sum, j) => sum + (j.compressedSize ?? 0), 0);
  return {
    doneCount: done.length,
    pendingCount: jobs.filter((j) => j.status === 'queued' || j.status === 'processing').length,
    originalTotal,
    compressedTotal,
    percent: savingsPercent(originalTotal, compressedTotal),
  };
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasan**

Run: `npm test`
Expected: PASS — todos los tests de Tareas 2 a 5.

- [ ] **Step 5: Commit**

```bash
git add src/lib tests/unit
git commit -m "feat: add job state reducer and summary" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Infraestructura E2E y fixtures de imágenes

**Files:**
- Create: `playwright.config.ts`, `scripts/make-fixtures.mjs`, `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: scripts de la Tarea 1.
- Produces: `npm run test:e2e` (genera fixtures, compila y sirve la app en el puerto 3100, ejecuta proyectos `desktop` y `mobile`). Fixtures en `tests/fixtures/`: `photo.jpg` (ruido, 2000×1500, calidad 100), `photo.webp` (ruido, 1600×1200), `graphic.png` (PNG sin comprimir con áreas planas), `broken.jpg` (texto, no es imagen), `empty.jpg` (0 bytes), `notes.txt`.

- [ ] **Step 1: Crear el generador de fixtures**

`scripts/make-fixtures.mjs`:

```js
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
```

- [ ] **Step 2: Crear la configuración de Playwright**

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npx next start -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
```

- [ ] **Step 3: Escribir un test mínimo que prueba la infraestructura**

`tests/e2e/home.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('la página principal carga', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.+/);
});
```

- [ ] **Step 4: Ejecutar y comprobar que funciona**

Run: `npm run test:e2e`
Expected: se generan los fixtures, se compila, y `2 passed` (un test por proyecto `desktop` y `mobile`). Comprobar además: `ls -la tests/fixtures` muestra `photo.jpg` de varios MB, `photo.webp`, `graphic.png`, `broken.jpg`, `empty.jpg` (0 bytes) y `notes.txt`.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts scripts tests/e2e package.json
git commit -m "test: add Playwright setup and image fixtures generator" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Motor de compresión (códecs WASM, worker y cliente) con prueba real en navegador

**Files:**
- Create: `src/lib/worker-protocol.ts`, `src/lib/codecs.ts`, `src/workers/compress.worker.ts`, `src/lib/compress-client.ts`
- Create (temporal): `src/app/spike/page.tsx`, `tests/e2e/spike.spec.ts`

**Interfaces:**
- Consumes: `ImageFormat`, `QualityLevel`, `MIME_BY_FORMAT` (`types.ts`); `QUALITY_LEVELS` (`quality.ts`); `createQueue` (`queue.ts`); `validateFile` (`validate.ts`).
- Produces:
  - `worker-protocol.ts`: `interface WorkerRequest { id: number; buffer: ArrayBuffer; format: ImageFormat; level: QualityLevel; mime: string }`; `type WorkerResponse = { id: number; ok: true; buffer: ArrayBuffer } | { id: number; ok: false; error: string }`.
  - `codecs.ts`: `compressBuffer(buffer: ArrayBuffer, format: ImageFormat, level: QualityLevel, mime: string): Promise<ArrayBuffer>`.
  - `compress-client.ts`: `interface Compressor { compress(file: File, format: ImageFormat, level: QualityLevel): Promise<Blob>; dispose(): void }`; `createCompressor(concurrency: number): Compressor`.

Nota: JPEG y WebP se decodifican con `createImageBitmap` + `OffscreenCanvas` (aplica la orientación EXIF y elimina los metadatos al recodificar). PNG se optimiza directamente con oxipng, sin pérdida.

- [ ] **Step 1: Crear el protocolo del worker**

`src/lib/worker-protocol.ts`:

```ts
import type { ImageFormat, QualityLevel } from './types';

export interface WorkerRequest {
  id: number;
  buffer: ArrayBuffer;
  format: ImageFormat;
  level: QualityLevel;
  mime: string;
}

export type WorkerResponse =
  | { id: number; ok: true; buffer: ArrayBuffer }
  | { id: number; ok: false; error: string };
```

- [ ] **Step 2: Crear los códecs (carga bajo demanda)**

`src/lib/codecs.ts`:

```ts
import { QUALITY_LEVELS } from './quality';
import type { ImageFormat, QualityLevel } from './types';

async function toImageData(buffer: ArrayBuffer, mime: string): Promise<ImageData> {
  const bitmap = await createImageBitmap(new Blob([buffer], { type: mime }));
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo preparar la imagen.');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export async function compressBuffer(
  buffer: ArrayBuffer,
  format: ImageFormat,
  level: QualityLevel,
  mime: string,
): Promise<ArrayBuffer> {
  const preset = QUALITY_LEVELS[level];

  if (format === 'png') {
    const { optimise } = await import('@jsquash/oxipng');
    return optimise(buffer, { level: preset.pngLevel });
  }

  const imageData = await toImageData(buffer, mime);
  if (format === 'jpeg') {
    const { encode } = await import('@jsquash/jpeg');
    return encode(imageData, { quality: preset.jpeg });
  }
  const { encode } = await import('@jsquash/webp');
  return encode(imageData, { quality: preset.webp });
}
```

- [ ] **Step 3: Crear el worker**

`src/workers/compress.worker.ts`:

```ts
import { compressBuffer } from '@/lib/codecs';
import type { WorkerRequest, WorkerResponse } from '@/lib/worker-protocol';

const post = (message: WorkerResponse, transfer: Transferable[] = []) =>
  (self as unknown as Worker).postMessage(message, transfer);

self.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  const { id, buffer, format, level, mime } = event.data;
  try {
    const out = await compressBuffer(buffer, format, level, mime);
    post({ id, ok: true, buffer: out }, [out]);
  } catch (err) {
    post({ id, ok: false, error: err instanceof Error ? err.message : 'Error desconocido' });
  }
});
```

- [ ] **Step 4: Crear el cliente (pool de workers reutilizables + cola)**

`src/lib/compress-client.ts`:

```ts
import { createQueue } from './queue';
import { MIME_BY_FORMAT, type ImageFormat, type QualityLevel } from './types';
import type { WorkerRequest, WorkerResponse } from './worker-protocol';

export interface Compressor {
  compress(file: File, format: ImageFormat, level: QualityLevel): Promise<Blob>;
  dispose(): void;
}

let nextId = 1;

function callWorker(worker: Worker, request: Omit<WorkerRequest, 'id'>): Promise<ArrayBuffer> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
    };
    const onMessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.id !== id) return;
      cleanup();
      if (event.data.ok) resolve(event.data.buffer);
      else reject(new Error(event.data.error));
    };
    const onError = (event: ErrorEvent) => {
      cleanup();
      reject(new Error(event.message || 'Error en el procesador de imágenes'));
    };
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    worker.postMessage({ id, ...request } satisfies WorkerRequest, [request.buffer]);
  });
}

export function createCompressor(concurrency: number): Compressor {
  const enqueue = createQueue(concurrency);
  const idle: Worker[] = [];

  return {
    compress(file, format, level) {
      return enqueue(async () => {
        const worker =
          idle.pop() ??
          new Worker(new URL('../workers/compress.worker.ts', import.meta.url), { type: 'module' });
        try {
          const buffer = await file.arrayBuffer();
          const out = await callWorker(worker, { buffer, format, level, mime: file.type || MIME_BY_FORMAT[format] });
          idle.push(worker);
          return new Blob([out], { type: MIME_BY_FORMAT[format] });
        } catch (err) {
          worker.terminate();
          throw err;
        }
      });
    },
    dispose() {
      idle.splice(0).forEach((w) => w.terminate());
    },
  };
}
```

- [ ] **Step 5: Crear la página temporal de prueba y su test**

`src/app/spike/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { createCompressor } from '@/lib/compress-client';
import { validateFile } from '@/lib/validate';

export default function SpikePage() {
  const [result, setResult] = useState('');

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const validation = validateFile(file);
    if (!validation.ok) {
      setResult(validation.reason);
      return;
    }
    const compressor = createCompressor(1);
    try {
      const blob = await compressor.compress(file, validation.format, 'balanced');
      setResult(JSON.stringify({ original: file.size, compressed: blob.size }));
    } catch (err) {
      setResult(`error: ${(err as Error).message}`);
    } finally {
      compressor.dispose();
    }
  }

  return (
    <main className="p-8">
      <input data-testid="spike-input" type="file" onChange={onChange} />
      <output data-testid="spike-result">{result}</output>
    </main>
  );
}
```

`tests/e2e/spike.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

for (const name of ['photo.jpg', 'photo.webp', 'graphic.png']) {
  test(`el motor comprime ${name} en el navegador`, async ({ page }) => {
    await page.goto('/spike');
    await page.getByTestId('spike-input').setInputFiles(`tests/fixtures/${name}`);
    const output = page.getByTestId('spike-result');
    await expect(output).toContainText('"compressed"', { timeout: 45_000 });
    const { original, compressed } = JSON.parse((await output.textContent()) ?? '{}');
    expect(compressed).toBeGreaterThan(0);
    expect(compressed).toBeLessThan(original);
  });
}
```

- [ ] **Step 6: Ejecutar la prueba real en el navegador**

Run: `npm run test:e2e -- spike`
Expected: `6 passed` (3 archivos × 2 proyectos). Si aparece un error de WASM (`.wasm` no encontrado, `WebAssembly.instantiate` o similar): primero probar compilar con webpack cambiando los scripts a `next build --webpack` y `next dev --webpack` (`npm pkg set scripts.build="next build --webpack" scripts.dev="next dev --webpack"`) y repetir. Si sigue fallando, **detenerse y reportar el error exacto** en lugar de improvisar otra solución: este paso valida la decisión técnica central del proyecto.

- [ ] **Step 7: Eliminar la página y el test temporales, y hacer commit**

```bash
git rm -f --ignore-unmatch src/app/spike/page.tsx tests/e2e/spike.spec.ts
rm -rf src/app/spike tests/e2e/spike.spec.ts
npm run typecheck
git add -A
git commit -m "feat: add WASM compression engine with worker pool" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

Expected: el typecheck no da errores y el commit no incluye la carpeta `spike`.

---

### Task 8: Interfaz de la herramienta (hook, componentes y página principal)

**Files:**
- Create: `src/lib/download.ts`, `src/hooks/use-compressor.ts`, `src/components/Dropzone.tsx`, `src/components/QualitySelector.tsx`, `src/components/ResultRow.tsx`, `src/components/DownloadAllButton.tsx`, `src/components/ImageCompressor.tsx`, `src/components/ToolPage.tsx`
- Modify: `src/app/page.tsx`, `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `createCompressor`/`Compressor` (`compress-client.ts`), `detectConcurrency` (`device.ts`), `jobsReducer`/`summarize`/`Job` (`jobs.ts`), `chooseResult` (`savings.ts`), `acceptFiles` (`validate.ts`), `QUALITY_LEVELS`/`QUALITY_ORDER`/`DEFAULT_QUALITY` (`quality.ts`), `formatBytes` (`format.ts`), `outputName` (`names.ts`), `buildZip` (`zip.ts`).
- Produces:
  - `download.ts`: `downloadBlob(blob: Blob, filename: string): void`.
  - `use-compressor.ts`: `useCompressor()` devuelve `{ jobs: Job[]; level: QualityLevel; rejected: { name: string; reason: string }[]; addFiles(files: File[]): void; changeLevel(level: QualityLevel): void; removeJob(id: string): void; clear(): void; dismissRejected(): void }`.
  - `ToolPage`: props `{ h1: string; intro: string; children?: ReactNode }` (componente de servidor que envuelve `<ImageCompressor />` y el contenido opcional debajo).
  - Atributos de prueba: `data-testid="file-input"`, `"result-row"` (con `data-status`, `data-original-size`, `data-compressed-size`), `"rejected-list"`, botón "Descargar todo".

- [ ] **Step 1: Crear la utilidad de descarga**

`src/lib/download.ts`:

```ts
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
```

- [ ] **Step 2: Crear el hook que orquesta todo**

`src/hooks/use-compressor.ts`:

```ts
'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { createCompressor, type Compressor } from '@/lib/compress-client';
import { detectConcurrency } from '@/lib/device';
import { jobsReducer, type Job } from '@/lib/jobs';
import { DEFAULT_QUALITY } from '@/lib/quality';
import { chooseResult } from '@/lib/savings';
import type { QualityLevel } from '@/lib/types';
import { acceptFiles } from '@/lib/validate';

export function useCompressor() {
  const [jobs, dispatch] = useReducer(jobsReducer, [] as Job[]);
  const [level, setLevel] = useState<QualityLevel>(DEFAULT_QUALITY);
  const [rejected, setRejected] = useState<{ name: string; reason: string }[]>([]);

  const levelRef = useRef<QualityLevel>(DEFAULT_QUALITY);
  const compressorRef = useRef<Compressor | null>(null);
  const startedRef = useRef(new Set<string>());
  const idCounterRef = useRef(0);

  // Lanza la compresión de cada trabajo en cola exactamente una vez por intento.
  useEffect(() => {
    for (const job of jobs) {
      if (job.status !== 'queued') continue;
      const key = `${job.id}:${job.attempt}`;
      if (startedRef.current.has(key)) continue;
      startedRef.current.add(key);

      compressorRef.current ??= createCompressor(detectConcurrency());
      dispatch({ type: 'start', id: job.id, attempt: job.attempt });
      compressorRef.current
        .compress(job.file, job.format, levelRef.current)
        .then((compressed) => {
          const { blob, keptOriginal } = chooseResult(job.file, compressed);
          dispatch({ type: 'done', id: job.id, attempt: job.attempt, blob, keptOriginal });
        })
        .catch((err) => {
          console.error(err);
          dispatch({
            type: 'fail',
            id: job.id,
            attempt: job.attempt,
            error: 'No se pudo procesar esta imagen.',
          });
        });
    }
  }, [jobs]);

  useEffect(() => () => compressorRef.current?.dispose(), []);

  const jobsCount = jobs.length;

  const addFiles = useCallback(
    (files: File[]) => {
      const { accepted, rejected: notAccepted } = acceptFiles(files, jobsCount);
      setRejected(notAccepted);
      dispatch({
        type: 'add',
        jobs: accepted.map(({ file, format }) => ({
          id: `job-${idCounterRef.current++}`,
          file,
          format,
          status: 'queued' as const,
          attempt: 0,
          originalSize: file.size,
        })),
      });
    },
    [jobsCount],
  );

  const changeLevel = useCallback((next: QualityLevel) => {
    if (next === levelRef.current) return;
    levelRef.current = next;
    setLevel(next);
    dispatch({ type: 'requeue' });
  }, []);

  return {
    jobs,
    level,
    rejected,
    addFiles,
    changeLevel,
    removeJob: (id: string) => dispatch({ type: 'remove', id }),
    clear: () => dispatch({ type: 'clear' }),
    dismissRejected: () => setRejected([]),
  };
}
```

- [ ] **Step 3: Crear Dropzone y QualitySelector**

`src/components/Dropzone.tsx`:

```tsx
'use client';

import { useRef, useState } from 'react';

export function Dropzone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Seleccionar imágenes para comprimir"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        onFiles(Array.from(e.dataTransfer.files));
      }}
      className={`flex min-h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
        dragging
          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
          : 'border-neutral-300 hover:border-blue-500 dark:border-neutral-700'
      }`}
    >
      <input
        ref={inputRef}
        data-testid="file-input"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        tabIndex={-1}
        className="sr-only"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          onFiles(files);
        }}
      />
      <p className="text-lg font-medium">Arrastra tus imágenes aquí</p>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">o toca para seleccionarlas</p>
      <p className="text-xs text-neutral-500">JPG · PNG · WebP — hasta 25 MB cada una</p>
    </div>
  );
}
```

`src/components/QualitySelector.tsx`:

```tsx
'use client';

import { QUALITY_LEVELS, QUALITY_ORDER } from '@/lib/quality';
import type { QualityLevel } from '@/lib/types';

export function QualitySelector({
  value,
  onChange,
}: {
  value: QualityLevel;
  onChange: (level: QualityLevel) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Nivel de compresión" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {QUALITY_ORDER.map((level) => {
        const preset = QUALITY_LEVELS[level];
        const active = level === value;
        return (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(level)}
            className={`rounded-xl border p-3 text-left transition-colors ${
              active
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                : 'border-neutral-300 hover:border-blue-400 dark:border-neutral-700'
            }`}
          >
            <span className="block font-medium">{preset.label}</span>
            <span className="block text-xs text-neutral-600 dark:text-neutral-400">{preset.description}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Crear ResultRow y DownloadAllButton**

`src/components/ResultRow.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { downloadBlob } from '@/lib/download';
import { formatBytes } from '@/lib/format';
import type { Job } from '@/lib/jobs';
import { savingsPercent } from '@/lib/savings';

export function ResultRow({
  job,
  outputName,
  onRemove,
}: {
  job: Job;
  outputName: string;
  onRemove: () => void;
}) {
  const [thumb, setThumb] = useState<string>();

  useEffect(() => {
    const url = URL.createObjectURL(job.file);
    setThumb(url);
    return () => URL.revokeObjectURL(url);
  }, [job.file]);

  const working = job.status === 'queued' || job.status === 'processing';

  return (
    <li
      data-testid="result-row"
      data-status={job.status}
      data-original-size={job.originalSize}
      data-compressed-size={job.compressedSize}
      className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {thumb ? <img src={thumb} alt="" className="size-14 shrink-0 rounded-lg object-cover" /> : <div className="size-14 shrink-0" />}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{job.file.name}</p>
        {working && (
          <>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">Comprimiendo…</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-blue-600" />
            </div>
          </>
        )}
        {job.status === 'error' && <p className="text-xs text-red-600 dark:text-red-400">{job.error}</p>}
        {job.status === 'done' && (
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            {formatBytes(job.originalSize)} → {formatBytes(job.compressedSize ?? 0)}{' '}
            {job.keptOriginal ? (
              <span className="font-medium">· Ya estaba optimizada</span>
            ) : (
              <span className="font-medium text-green-700 dark:text-green-400">
                −{savingsPercent(job.originalSize, job.compressedSize ?? 0)}%
              </span>
            )}
          </p>
        )}
      </div>

      {job.status === 'done' && job.blob && (
        <button
          type="button"
          onClick={() => downloadBlob(job.blob!, outputName)}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Descargar
        </button>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar ${job.file.name}`}
        className="rounded-lg px-2 py-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        ✕
      </button>
    </li>
  );
}
```

`src/components/DownloadAllButton.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { downloadBlob } from '@/lib/download';
import type { Job } from '@/lib/jobs';
import { buildZip } from '@/lib/zip';

export function DownloadAllButton({ jobs, names }: { jobs: Job[]; names: Map<string, string> }) {
  const [busy, setBusy] = useState(false);
  const ready = jobs.filter((j) => j.status === 'done' && j.blob);

  async function onClick() {
    setBusy(true);
    try {
      const zip = await buildZip(ready.map((j) => ({ name: names.get(j.id)!, blob: j.blob! })));
      downloadBlob(zip, 'imagenes-comprimidas.zip');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={ready.length === 0 || busy}
      onClick={onClick}
      className="rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? 'Preparando…' : `Descargar todo (${ready.length})`}
    </button>
  );
}
```

- [ ] **Step 5: Crear el componente de la herramienta y el contenedor de página**

`src/components/ImageCompressor.tsx`:

```tsx
'use client';

import { useMemo } from 'react';
import { useCompressor } from '@/hooks/use-compressor';
import { formatBytes } from '@/lib/format';
import { summarize } from '@/lib/jobs';
import { outputName } from '@/lib/names';
import { DownloadAllButton } from './DownloadAllButton';
import { Dropzone } from './Dropzone';
import { QualitySelector } from './QualitySelector';
import { ResultRow } from './ResultRow';

export function ImageCompressor() {
  const { jobs, level, rejected, addFiles, changeLevel, removeJob, clear, dismissRejected } = useCompressor();

  const names = useMemo(() => {
    const taken = new Set<string>();
    return new Map(jobs.map((j) => [j.id, outputName(j.file.name, j.format, taken)]));
  }, [jobs]);

  const summary = summarize(jobs);

  return (
    <section className="flex flex-col gap-5">
      <QualitySelector value={level} onChange={changeLevel} />
      <Dropzone onFiles={addFiles} />

      {rejected.length > 0 && (
        <div
          data-testid="rejected-list"
          className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
        >
          <ul className="list-inside list-disc">
            {rejected.map((r, i) => (
              <li key={`${r.name}-${i}`}>{r.reason}</li>
            ))}
          </ul>
          <button type="button" onClick={dismissRejected} className="mt-2 text-xs underline">
            Cerrar
          </button>
        </div>
      )}

      {jobs.length > 0 && (
        <>
          <ul className="flex flex-col gap-2">
            {jobs.map((job) => (
              <ResultRow key={job.id} job={job} outputName={names.get(job.id)!} onRemove={() => removeJob(job.id)} />
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {summary.doneCount > 0 &&
                `Total: ${formatBytes(summary.originalTotal)} → ${formatBytes(summary.compressedTotal)} (−${summary.percent}%)`}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={clear}
                className="rounded-xl border border-neutral-300 px-4 py-3 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Limpiar
              </button>
              <DownloadAllButton jobs={jobs} names={names} />
            </div>
          </div>
        </>
      )}

      <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
        🔒 Tus imágenes no salen de tu dispositivo.
      </p>
    </section>
  );
}
```

`src/components/ToolPage.tsx`:

```tsx
import type { ReactNode } from 'react';
import { ImageCompressor } from './ImageCompressor';

export function ToolPage({ h1, intro, children }: { h1: string; intro: string; children?: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{h1}</h1>
        <p className="text-neutral-600 dark:text-neutral-400">{intro}</p>
      </header>
      <ImageCompressor />
      {children}
    </main>
  );
}
```

`src/app/page.tsx` (reemplazar todo el contenido):

```tsx
import { ToolPage } from '@/components/ToolPage';

export default function Home() {
  return (
    <ToolPage
      h1="Comprime tus imágenes gratis"
      intro="Reduce el peso de tus JPG, PNG y WebP en segundos, sin registrarte y sin subir nada."
    />
  );
}
```

- [ ] **Step 6: Ampliar el test e2e de la página principal**

`tests/e2e/home.spec.ts` (reemplazar):

```ts
import { expect, test } from '@playwright/test';

test('la página principal carga', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.+/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Comprime tus imágenes');
});

test('comprime una imagen desde la interfaz', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('file-input').setInputFiles('tests/fixtures/photo.jpg');
  const row = page.getByTestId('result-row');
  await expect(row).toHaveAttribute('data-status', 'done', { timeout: 45_000 });
  const original = Number(await row.getAttribute('data-original-size'));
  const compressed = Number(await row.getAttribute('data-compressed-size'));
  expect(compressed).toBeLessThan(original);
});
```

- [ ] **Step 7: Verificar tipos, lint, build y e2e**

Run: `npm run typecheck && npm run lint && npm test && npm run test:e2e -- home`
Expected: sin errores; `4 passed` en e2e (2 tests × 2 proyectos). Si `npm run lint` marca reglas de `react-hooks` en el hook, corregir el código sin desactivar reglas (salvo el comentario `eslint-disable-next-line` ya incluido para `<img>`).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add compressor UI with drag-and-drop, quality levels and downloads" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: SEO — páginas por formato, contenido, sitemap y robots

**Files:**
- Create: `src/lib/site.ts`, `src/lib/tools.ts`, `src/components/ToolContent.tsx`, `src/app/[tool]/page.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`
- Modify: `src/app/page.tsx`, `src/app/layout.tsx`
- Test: `tests/unit/tools.test.ts`

**Interfaces:**
- Consumes: `ToolPage` (Tarea 8).
- Produces:
  - `site.ts`: `SITE_NAME: string`; `SITE_URL: string` (lee `NEXT_PUBLIC_SITE_URL`, por defecto `http://localhost:3000`).
  - `tools.ts`: `interface ToolConfig { slug: string; h1: string; title: string; description: string; intro: string; steps: string[]; faq: { question: string; answer: string }[] }`; `HOME_TOOL: ToolConfig` (slug `''`); `FORMAT_TOOLS: ToolConfig[]`; `getToolBySlug(slug: string): ToolConfig | undefined`.
  - `ToolContent`: props `{ tool: ToolConfig }`.

- [ ] **Step 1: Escribir el test que falla**

`tests/unit/tools.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { FORMAT_TOOLS, HOME_TOOL, getToolBySlug } from '@/lib/tools';

const all = [HOME_TOOL, ...FORMAT_TOOLS];

describe('configuración SEO de las herramientas', () => {
  it('tiene las rutas por formato esperadas', () => {
    expect(FORMAT_TOOLS.map((t) => t.slug)).toEqual(['comprimir-jpg', 'comprimir-png', 'comprimir-webp']);
  });
  it('los slugs son únicos', () => {
    const slugs = all.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it.each(all.map((t) => [t.slug || '(inicio)', t] as const))('%s tiene metadatos válidos', (_name, t) => {
    expect(t.title.length).toBeGreaterThan(10);
    expect(t.title.length).toBeLessThanOrEqual(60);
    expect(t.description.length).toBeGreaterThan(50);
    expect(t.description.length).toBeLessThanOrEqual(160);
    expect(t.steps.length).toBeGreaterThanOrEqual(3);
    expect(t.faq.length).toBeGreaterThanOrEqual(3);
  });
  it('getToolBySlug encuentra y rechaza', () => {
    expect(getToolBySlug('comprimir-png')?.slug).toBe('comprimir-png');
    expect(getToolBySlug('comprimir-gif')).toBeUndefined();
    expect(getToolBySlug('')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npm test -- tools`
Expected: FAIL — no se puede resolver `@/lib/tools`.

- [ ] **Step 3: Implementar la configuración**

`src/lib/site.ts`:

```ts
export const SITE_NAME = 'Compresor de imágenes';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
```

`src/lib/tools.ts`:

```ts
export interface ToolConfig {
  slug: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
  steps: string[];
  faq: { question: string; answer: string }[];
}

const commonSteps = [
  'Arrastra tus imágenes a la zona de arriba o pulsa para seleccionarlas.',
  'Elige el nivel de compresión: alta calidad, equilibrada o máxima compresión.',
  'Descarga cada imagen o todas juntas en un ZIP.',
];

const privacyFaq = {
  question: '¿Se suben mis imágenes a algún servidor?',
  answer:
    'No. La compresión se hace directamente en tu navegador, así que tus imágenes no salen de tu dispositivo.',
};

const metadataFaq = {
  question: '¿Se conservan los datos EXIF como la ubicación o la cámara?',
  answer:
    'Al comprimir JPG y WebP se eliminan los metadatos, incluida la ubicación GPS. Es una ventaja si vas a compartir la foto.',
};

export const HOME_TOOL: ToolConfig = {
  slug: '',
  h1: 'Comprime tus imágenes gratis',
  title: 'Comprimir imágenes online (JPG, PNG, WebP) gratis',
  description:
    'Reduce el peso de tus imágenes JPG, PNG y WebP en segundos, gratis, sin registro y sin subir tus archivos: todo se procesa en tu navegador.',
  intro: 'Reduce el peso de tus JPG, PNG y WebP en segundos, sin registrarte y sin subir nada.',
  steps: commonSteps,
  faq: [
    privacyFaq,
    {
      question: '¿Qué formatos puedo comprimir?',
      answer: 'JPG, PNG y WebP, hasta 25 MB por imagen y 20 imágenes a la vez.',
    },
    {
      question: '¿Cuánto se reduce el tamaño?',
      answer:
        'Depende de la imagen y del nivel elegido. En fotos JPG es habitual ahorrar más de la mitad del peso sin diferencias visibles.',
    },
    metadataFaq,
  ],
};

export const FORMAT_TOOLS: ToolConfig[] = [
  {
    slug: 'comprimir-jpg',
    h1: 'Comprimir JPG online gratis',
    title: 'Comprimir JPG online gratis y sin subir archivos',
    description:
      'Reduce el tamaño de tus fotos JPG online, gratis y sin registro. Se comprimen en tu navegador, así que tus imágenes no salen de tu dispositivo.',
    intro: 'Reduce el peso de tus fotos JPG para enviarlas por WhatsApp o correo, o para subirlas a tu web.',
    steps: commonSteps,
    faq: [
      privacyFaq,
      {
        question: '¿Se nota la pérdida de calidad al comprimir un JPG?',
        answer:
          'Con la calidad equilibrada la diferencia es prácticamente invisible en la mayoría de las fotos. Puedes probar los tres niveles y comparar el tamaño resultante.',
      },
      {
        question: '¿Cómo reducir un JPG para enviarlo por WhatsApp o correo?',
        answer:
          'Sube la foto, elige "Máxima compresión" y descárgala. Suele bajar a una fracción del tamaño original.',
      },
      metadataFaq,
    ],
  },
  {
    slug: 'comprimir-png',
    h1: 'Comprimir PNG online gratis',
    title: 'Comprimir PNG online gratis, sin perder calidad',
    description:
      'Optimiza tus imágenes PNG online sin perder calidad, gratis y sin registro. Todo se procesa en tu navegador y no subes ningún archivo.',
    intro: 'Optimiza tus PNG sin pérdida de calidad: mismos píxeles, menos peso.',
    steps: commonSteps,
    faq: [
      privacyFaq,
      {
        question: '¿Comprimir un PNG reduce su calidad?',
        answer:
          'No. Los PNG se optimizan sin pérdida: la imagen es idéntica píxel a píxel, solo cambia cómo se guarda.',
      },
      {
        question: '¿Por qué mi PNG casi no se reduce?',
        answer:
          'El ahorro en PNG suele ser menor que en JPG, sobre todo en fotografías o si la imagen ya estaba optimizada. En ese caso se conserva el original.',
      },
    ],
  },
  {
    slug: 'comprimir-webp',
    h1: 'Comprimir WebP online gratis',
    title: 'Comprimir WebP online gratis y privado',
    description:
      'Reduce el tamaño de tus imágenes WebP online, gratis y sin registro. La compresión ocurre en tu navegador: tus archivos no se suben a ningún servidor.',
    intro: 'Reduce aún más el peso de tus imágenes WebP, directamente en tu navegador.',
    steps: commonSteps,
    faq: [
      privacyFaq,
      {
        question: '¿Se puede comprimir un WebP que ya es ligero?',
        answer:
          'Sí, pero el ahorro será menor. Si no se consigue reducir, se conserva el original para que nunca pese más.',
      },
      {
        question: '¿Qué nivel de compresión me conviene?',
        answer:
          'Para web, "Equilibrada" suele ser suficiente. Si necesitas el archivo más pequeño posible, prueba "Máxima compresión".',
      },
      metadataFaq,
    ],
  },
];

export function getToolBySlug(slug: string): ToolConfig | undefined {
  return FORMAT_TOOLS.find((t) => t.slug === slug);
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `npm test`
Expected: PASS — todos los tests, incluidos los de `tools`. Si un título o descripción supera el límite, acortar el texto.

- [ ] **Step 5: Crear el contenido SEO, las rutas, el sitemap y el robots**

`src/components/ToolContent.tsx`:

```tsx
import type { ToolConfig } from '@/lib/tools';

export function ToolContent({ tool }: { tool: ToolConfig }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: tool.faq.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="como-se-usa">
        <h2 id="como-se-usa" className="mb-3 text-xl font-semibold">
          Cómo se usa
        </h2>
        <ol className="list-inside list-decimal space-y-1 text-neutral-700 dark:text-neutral-300">
          {tool.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="preguntas">
        <h2 id="preguntas" className="mb-3 text-xl font-semibold">
          Preguntas frecuentes
        </h2>
        <div className="flex flex-col gap-2">
          {tool.faq.map((f) => (
            <details key={f.question} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
              <summary className="cursor-pointer font-medium">{f.question}</summary>
              <p className="mt-2 text-neutral-700 dark:text-neutral-300">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
    </div>
  );
}
```

`src/app/[tool]/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ToolContent } from '@/components/ToolContent';
import { ToolPage } from '@/components/ToolPage';
import { FORMAT_TOOLS, getToolBySlug } from '@/lib/tools';

export const dynamicParams = false;

export function generateStaticParams() {
  return FORMAT_TOOLS.map((t) => ({ tool: t.slug }));
}

type Props = { params: Promise<{ tool: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tool } = await params;
  const config = getToolBySlug(tool);
  if (!config) return {};
  return {
    title: config.title,
    description: config.description,
    alternates: { canonical: `/${config.slug}` },
    openGraph: { title: config.title, description: config.description, url: `/${config.slug}`, type: 'website' },
  };
}

export default async function FormatToolPage({ params }: Props) {
  const { tool } = await params;
  const config = getToolBySlug(tool);
  if (!config) notFound();
  return (
    <ToolPage h1={config.h1} intro={config.intro}>
      <ToolContent tool={config} />
    </ToolPage>
  );
}
```

`src/app/page.tsx` (reemplazar):

```tsx
import type { Metadata } from 'next';
import { ToolContent } from '@/components/ToolContent';
import { ToolPage } from '@/components/ToolPage';
import { HOME_TOOL } from '@/lib/tools';

export const metadata: Metadata = {
  title: HOME_TOOL.title,
  description: HOME_TOOL.description,
  alternates: { canonical: '/' },
  openGraph: { title: HOME_TOOL.title, description: HOME_TOOL.description, url: '/', type: 'website' },
};

export default function Home() {
  return (
    <ToolPage h1={HOME_TOOL.h1} intro={HOME_TOOL.intro}>
      <ToolContent tool={HOME_TOOL} />
    </ToolPage>
  );
}
```

`src/app/sitemap.ts`:

```ts
import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { FORMAT_TOOLS } from '@/lib/tools';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, priority: 1 },
    ...FORMAT_TOOLS.map((t) => ({ url: `${SITE_URL}/${t.slug}`, priority: 0.8 })),
  ];
}
```

`src/app/robots.ts`:

```ts
import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
```

En `src/app/layout.tsx`, reemplazar el `export const metadata` generado por lo siguiente y añadir los imports arriba del archivo:

```tsx
import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  applicationName: SITE_NAME,
};
```

(Si el archivo ya importa `Metadata`, no duplicar el import.)

- [ ] **Step 6: Verificar build y contenido generado**

```bash
npm run typecheck && npm run lint && npm run build
npx next start -p 3100 &
sleep 4
curl -s localhost:3100/comprimir-jpg | grep -o '<title>[^<]*'
curl -s localhost:3100/comprimir-jpg | grep -c 'application/ld+json'
curl -s -o /dev/null -w "%{http_code}\n" localhost:3100/comprimir-gif
curl -s localhost:3100/sitemap.xml | grep -o 'comprimir-[a-z]*'
curl -s localhost:3100/robots.txt
kill %1
```

Expected: el build lista `/comprimir-jpg`, `/comprimir-png`, `/comprimir-webp` como estáticas; el título es `Comprimir JPG online gratis y sin subir archivos | Compresor de imágenes`; el `grep -c` da `1`; `/comprimir-gif` devuelve `404`; el sitemap muestra las tres rutas; `robots.txt` incluye `Sitemap:`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add SEO pages per format, FAQ content, sitemap and robots" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Pruebas E2E completas (flujo, errores, ZIP, calidad, SEO, móvil)

**Files:**
- Create: `tests/e2e/compress.spec.ts`, `tests/e2e/seo.spec.ts`

**Interfaces:**
- Consumes: atributos `data-testid`/`data-*` y textos de la Tarea 8; fixtures de la Tarea 6.
- Produces: suite E2E que corre en `desktop` y `mobile`.

- [ ] **Step 1: Escribir los tests de compresión**

`tests/e2e/compress.spec.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { unzipSync } from 'fflate';

const fixture = (name: string) => path.join(__dirname, '..', 'fixtures', name);
const rows = (page: import('@playwright/test').Page) => page.getByTestId('result-row');
const doneRows = (page: import('@playwright/test').Page) =>
  page.locator('[data-testid="result-row"][data-status="done"]');

test('comprime JPG, PNG y WebP y muestra el ahorro', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('file-input').setInputFiles([fixture('photo.jpg'), fixture('graphic.png'), fixture('photo.webp')]);

  await expect(doneRows(page)).toHaveCount(3, { timeout: 60_000 });

  for (let i = 0; i < 3; i++) {
    const row = rows(page).nth(i);
    const original = Number(await row.getAttribute('data-original-size'));
    const compressed = Number(await row.getAttribute('data-compressed-size'));
    expect(compressed).toBeGreaterThan(0);
    expect(compressed).toBeLessThan(original);
    await expect(row).toContainText('%');
  }
});

test('un archivo corrupto muestra error y no detiene a los demás', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('file-input').setInputFiles([fixture('broken.jpg'), fixture('photo.jpg')]);

  await expect(page.locator('[data-testid="result-row"][data-status="error"]')).toHaveCount(1, { timeout: 45_000 });
  await expect(doneRows(page)).toHaveCount(1, { timeout: 45_000 });
});

test('rechaza vacíos y tipos no soportados con mensajes claros', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('file-input').setInputFiles([fixture('empty.jpg'), fixture('notes.txt'), fixture('photo.jpg')]);

  const list = page.getByTestId('rejected-list');
  await expect(list).toContainText('empty.jpg');
  await expect(list).toContainText('vacío');
  await expect(list).toContainText('notes.txt');
  await expect(list).toContainText('JPG, PNG o WebP');
  await expect(doneRows(page)).toHaveCount(1, { timeout: 45_000 });
  await expect(rows(page)).toHaveCount(1);
});

test('el ZIP tiene nombres únicos aunque los archivos se llamen igual', async ({ page }) => {
  await page.goto('/');
  const buffer = fs.readFileSync(fixture('photo.jpg'));
  await page.getByTestId('file-input').setInputFiles([
    { name: 'IMG_0001.jpg', mimeType: 'image/jpeg', buffer },
    { name: 'IMG_0001.jpg', mimeType: 'image/jpeg', buffer },
  ]);
  await expect(doneRows(page)).toHaveCount(2, { timeout: 60_000 });

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Descargar todo/ }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('imagenes-comprimidas.zip');

  const zipPath = await download.path();
  const entries = unzipSync(new Uint8Array(fs.readFileSync(zipPath)));
  expect(Object.keys(entries).sort()).toEqual(['IMG_0001-comprimido-2.jpg', 'IMG_0001-comprimido.jpg']);
});

test('cambiar la calidad recomprime y el resultado nuevo es más pequeño', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('file-input').setInputFiles(fixture('photo.jpg'));
  const row = rows(page).first();
  await expect(row).toHaveAttribute('data-status', 'done', { timeout: 45_000 });
  const balanced = Number(await row.getAttribute('data-compressed-size'));

  await page.getByRole('radio', { name: /Máxima compresión/ }).click();

  await expect
    .poll(
      async () => {
        const status = await row.getAttribute('data-status');
        const size = Number(await row.getAttribute('data-compressed-size'));
        return status === 'done' && size > 0 && size < balanced;
      },
      { timeout: 45_000 },
    )
    .toBe(true);
});

test('los códecs WASM solo se descargan al comprimir, no al abrir la página', async ({ page }) => {
  const wasmRequests: string[] = [];
  page.on('request', (req) => {
    if (req.url().endsWith('.wasm')) wasmRequests.push(req.url());
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(wasmRequests).toHaveLength(0);

  await page.getByTestId('file-input').setInputFiles(fixture('photo.jpg'));
  await expect(doneRows(page)).toHaveCount(1, { timeout: 45_000 });
  expect(wasmRequests.length).toBeGreaterThan(0);
});

test('no hay scroll horizontal', async ({ page }) => {
  await page.goto('/');
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflows).toBe(false);
});
```

- [ ] **Step 2: Escribir los tests de SEO**

`tests/e2e/seo.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

for (const [slug, word] of [
  ['comprimir-jpg', 'JPG'],
  ['comprimir-png', 'PNG'],
  ['comprimir-webp', 'WebP'],
]) {
  test(`/${slug} muestra la herramienta y su contenido`, async ({ page }) => {
    await page.goto(`/${slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(word);
    await expect(page.getByTestId('file-input')).toBeAttached();
    await expect(page.getByRole('heading', { name: 'Preguntas frecuentes' })).toBeVisible();
  });
}

test('una ruta inexistente devuelve 404', async ({ page }) => {
  const response = await page.goto('/comprimir-gif');
  expect(response?.status()).toBe(404);
});

test('el sitemap y el robots existen', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain('comprimir-png');
  const robots = await request.get('/robots.txt');
  expect(await robots.text()).toContain('Sitemap:');
});
```

- [ ] **Step 3: Ejecutar toda la suite**

Run: `npm run test:e2e`
Expected: todos los tests pasan en `desktop` y `mobile`. Si un test falla, analizar la causa con `npx playwright show-trace` sobre el trace guardado en `test-results/` antes de cambiar el código o el test; no relajar una aserción para hacerla pasar.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e
git commit -m "test: add end-to-end coverage for compression, errors, zip, quality and SEO" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Verificación final, rendimiento y README

**Files:**
- Create: `README.md` (si el generado por create-next-app existe, reemplazarlo)

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: proyecto verificado y documentado.

- [ ] **Step 1: Verificación completa automatizada**

Run: `npm run typecheck && npm run lint && npm test && npm run test:e2e`
Expected: todo en verde.

- [ ] **Step 2: Medir rendimiento y SEO con Lighthouse**

```bash
npm run build
npx next start -p 3100 &
sleep 4
npx lighthouse http://localhost:3100 --only-categories=performance,seo,accessibility --chrome-flags="--headless" --output=json --output-path=/tmp/lh.json --quiet
kill %1
node -e "const r=require('/tmp/lh.json');for(const [k,v] of Object.entries(r.categories))console.log(k,Math.round(v.score*100))"
```

Expected: `performance ≥ 90`, `seo ≥ 95`, `accessibility ≥ 90`. Si alguna puntuación queda por debajo, revisar las auditorías fallidas del JSON y corregir la causa concreta (contraste, etiquetas, tamaño de bundle) antes de continuar.

- [ ] **Step 3: Prueba manual en un móvil real (checklist)**

Con `npx next dev -H 0.0.0.0` y el móvil en la misma red Wi-Fi (abrir `http://<IP-del-PC>:3000`), comprobar:

- [ ] Al pulsar la zona de carga, el móvil ofrece galería y cámara.
- [ ] Una foto tomada en vertical sigue saliendo en vertical tras comprimir (orientación EXIF correcta).
- [ ] Una foto de 8–12 MP se comprime sin que la página se congele ni se cierre.
- [ ] Seleccionar 10 fotos a la vez no bloquea el navegador.
- [ ] El botón "Descargar" guarda el archivo y el ZIP se descarga.
- [ ] El diseño no tiene scroll horizontal y los botones son fáciles de tocar.
- [ ] En modo oscuro del sistema, todo se lee bien.

Anotar cualquier fallo como tarea nueva; no lo corrijas dentro de esta.

- [ ] **Step 4: Escribir el README**

`README.md`:

```markdown
# Compresor de imágenes

Comprime imágenes JPG, PNG y WebP directamente en el navegador: sin registro y sin subir archivos.

## Desarrollo

    npm install
    npm run dev          # http://localhost:3000
    npm test             # pruebas unitarias (Vitest)
    npm run test:e2e     # pruebas de navegador (Playwright, escritorio y móvil)

## Estructura

- `src/lib`: lógica pura (validación, nombres, cola, estado de trabajos, ZIP) y motor de compresión.
- `src/workers`: Web Worker que ejecuta los códecs WASM (jSquash).
- `src/hooks`, `src/components`: interfaz React.
- `src/app`: rutas (`/`, `/comprimir-jpg`, `/comprimir-png`, `/comprimir-webp`), sitemap y robots.
- `docs/superpowers`: especificación de diseño y plan de implementación.

## Configuración

- `NEXT_PUBLIC_SITE_URL`: URL pública del sitio (para sitemap, robots y metadatos). Por defecto `http://localhost:3000`.
- El nombre del producto está en `src/lib/site.ts`.
```

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add README" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
git log --oneline
```

Expected: el historial muestra un commit por tarea.
