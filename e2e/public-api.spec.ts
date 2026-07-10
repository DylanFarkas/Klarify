import { expect, test } from '@playwright/test';

test.describe('Funcionales — Navegación pública', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('FAQ de la landing responde qué es Klarify', async ({ page }) => {
    await page.goto('/');

    const faqQuestion = page.getByText(/Qué es Klarify/i).first();
    await faqQuestion.scrollIntoViewIfNeeded();
    await expect(faqQuestion).toBeVisible();
  });

  test('footer muestra copyright de Klarify', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.getByText(/Klarify ©/i)).toBeVisible();
  });

  test('API projects sin token responde 401', async ({ request }) => {
    const response = await request.get('/api/projects');
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toMatch(/autorizado/i);
  });

  test('API workspace sin token responde 401', async ({ request }) => {
    const response = await request.get('/api/workspace');
    expect(response.status()).toBe(401);
  });
});
