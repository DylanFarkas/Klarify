import { expect, test } from '@playwright/test';

test.describe('Funcionales — Landing y autenticación', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('la landing muestra la marca Klarify y el CTA principal', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Klarify').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Empezar gratis' }).first()).toBeVisible();
  });

  test('el CTA de la landing lleva a /login sin sesión', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Empezar gratis' }).first().click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /Bienvenido de nuevo/i })).toBeVisible();
  });

  test('la página de login ofrece Google y GitHub', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /Bienvenido de nuevo/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('button', { name: /Continuar con Google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continuar con GitHub/i })).toBeVisible();
  });

  test('rutas de agentes sin sesión redirigen a login', async ({ page }) => {
    await page.goto('/agentes/proyectos');
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: /Bienvenido de nuevo/i })).toBeVisible();
  });

  test('la sección de precios está disponible en la landing', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Free', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Starter', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pro', exact: true })).toBeVisible();
  });
});
