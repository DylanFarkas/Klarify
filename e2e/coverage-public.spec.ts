import { expect, test } from '@playwright/test';

test.describe('Funcionales — cobertura ampliada de rutas públicas y APIs', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('la sección de precios es alcanzable desde la landing', async ({ page }) => {
    await page.goto('/#pricing');
    await expect(page.locator('#pricing')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Free', exact: true })).toBeVisible();
  });

  test('CTA de plan Free en precios lleva a login', async ({ page }) => {
    await page.goto('/');
    await page.locator('#pricing').scrollIntoViewIfNeeded();
    await page.getByRole('link', { name: /Empezar gratis/i }).first().click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('protege dashboard y board sin sesión', async ({ page }) => {
    await page.goto('/agentes/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });

    await page.goto('/agentes/board');
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  });

  test('protege rutas de agentes 1-5 sin sesión', async ({ page }) => {
    for (const id of [1, 2, 3, 4, 5]) {
      await page.goto(`/agentes/${id}`);
      await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
    }
  });

  const protectedApis = [
    '/api/workspace',
    '/api/projects',
    '/api/github/connect',
    '/api/github/repos',
    '/api/github/projects',
    '/api/github/export',
    '/api/agentes/1/analyze',
    '/api/agentes/1/extract',
    '/api/agentes/1/upload',
    '/api/agentes/2/generate',
    '/api/agentes/3/estimate',
    '/api/agentes/4/prioritize',
    '/api/agentes/5/plan',
  ];

  for (const path of protectedApis) {
    test(`API ${path} responde 401 sin token`, async ({ request }) => {
      const method = path.includes('/github/export') || path.includes('/agentes/') ? 'post' : 'get';
      const response =
        method === 'post'
          ? await request.post(path, { data: {} })
          : await request.get(path);
      expect(response.status()).toBe(401);
    });
  }
});
