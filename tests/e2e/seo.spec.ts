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
