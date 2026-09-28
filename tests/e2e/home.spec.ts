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
