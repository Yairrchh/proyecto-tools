import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { unzipSync } from 'fflate';

const fixture = (name: string) => path.join(__dirname, '..', 'fixtures', name);
const rows = (page: Page) => page.getByTestId('result-row');
const doneRows = (page: Page) => page.locator('[data-testid="result-row"][data-status="done"]');

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
