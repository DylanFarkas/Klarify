import { expect, test } from '@playwright/test';

test.describe('Flujo autenticado — proyectos y agentes', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('entra al hub de proyectos con sesión válida', async ({ page }) => {
    await page.goto('/agentes/proyectos');

    await expect(page).not.toHaveURL(/\/login/);
    await expect(
      page.getByText(/Nuevo proyecto|Continuar donde lo dejaste/i).first()
    ).toBeVisible({ timeout: 30_000 });
  });

  test('API /api/projects responde 200 con el token de la sesión', async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/projects') &&
        response.request().method() === 'GET' &&
        response.status() !== 307
    );

    await page.goto('/agentes/proyectos');
    const response = await responsePromise;

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('projects');
    expect(body).toHaveProperty('plan');
  });

  test('API /api/workspace responde 200 con el token de la sesión', async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/workspace') &&
        response.request().method() === 'GET'
    );

    await page.goto('/agentes/proyectos');
    const response = await responsePromise;

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('workspace');
  });

  test('puede abrir el agente 1 sin redirigir a login', async ({ page }) => {
    await page.goto('/agentes/1');

    await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
    await expect(page).toHaveURL(/\/agentes\/1/);
  });

  test('navegación entre agentes 1-3 mantiene la sesión', async ({ page }) => {
    for (const id of [1, 2, 3]) {
      await page.goto(`/agentes/${id}`);
      await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
      await expect(page).toHaveURL(new RegExp(`/agentes/${id}`));
    }
  });

  test('dashboard autenticado carga sin redirigir a login', async ({ page }) => {
    await page.goto('/agentes/dashboard');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
    await expect(page).toHaveURL(/\/agentes\/dashboard/);
  });
});
