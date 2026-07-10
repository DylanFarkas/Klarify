import { expect, type Page, test } from '@playwright/test';

/**
 * Pipeline autenticado completo:
 * crear proyecto → Agente 1 (texto o archivo) → 2 → 3 → 4 → 5 → dashboard
 *
 * Requiere:
 *   npm run test:e2e:login   (sesión en e2e/.auth/user.json)
 *   Preferible sin GEMINI_API_KEY / OPENAI_API_KEY (mocks deterministas)
 *
 * Ejecutar:
 *   npm run test:e2e:auth
 */

const LONG_CONTEXT =
  'Quiero una app de gestión de proyectos con tablero Kanban, comentarios en tareas, ' +
  'prioridades, reportes de sprint, integraciones con Calendar y Slack, y acceso móvil ' +
  'para que el equipo colabore en tiempo real desde cualquier lugar.';

async function freeProjectSlotIfNeeded(page: Page) {
  const createButton = page.getByRole('button', { name: 'Crear proyecto' });
  if (await createButton.isEnabled()) return;

  // Libera cupo borrando proyectos E2E previos
  while (true) {
    const deleteButton = page.getByRole('button', { name: /Eliminar E2E (Pipeline|Upload)/i }).first();
    if ((await deleteButton.count()) === 0) break;

    page.once('dialog', (dialog) => dialog.accept());
    await deleteButton.click();
    await expect(createButton).toBeEnabled({ timeout: 15_000 }).catch(() => undefined);
    if (await createButton.isEnabled()) return;
    await page.waitForTimeout(500);
  }

  if (!(await createButton.isEnabled())) {
    throw new Error(
      'No se puede crear proyecto: límite del plan alcanzado. ' +
        'Elimina un proyecto manualmente en /agentes/proyectos y reintenta.'
    );
  }
}

async function waitAgentHero(page: Page, title: string) {
  await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 45_000 });
}

async function createProjectAndOpenAgent1(page: Page, projectName: string) {
  await page.goto('/agentes/proyectos');
  await expect(page.getByRole('heading', { name: 'Tus proyectos' })).toBeVisible({
    timeout: 30_000,
  });

  await freeProjectSlotIfNeeded(page);
  await page.getByPlaceholder('Nombre del proyecto (opcional)').fill(projectName);
  await page.getByRole('button', { name: 'Crear proyecto' }).click();
  await expect(page).toHaveURL(/\/agentes\/1/, { timeout: 45_000 });
  await waitAgentHero(page, 'Ingesta de Contexto');
}

/** Mock (≥80 chars / transcripción mock) va a deseos; Gemini real puede pedir clarificación. */
async function approveWishesAndContinueToAgent2(page: Page) {
  const wishesHeading = page.getByRole('heading', { name: 'Deseos del Cliente' });
  const skipClarification = page.getByRole('button', { name: 'Saltar preguntas' });

  await expect(wishesHeading.or(skipClarification)).toBeVisible({ timeout: 90_000 });

  if (await skipClarification.isVisible()) {
    await skipClarification.click();
  }

  await expect(wishesHeading).toBeVisible({ timeout: 90_000 });
  await expect(page.locator('#approve-button')).toBeEnabled({ timeout: 15_000 });

  await page.getByRole('button', { name: 'Aprobar deseos y continuar' }).click();
  await expect(page).toHaveURL(/\/agentes\/2/, { timeout: 45_000 });
}

test.describe('Pipeline autenticado — proyecto + agentes 1-5', () => {
  test.setTimeout(300_000);

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('crea proyecto por texto y completa el flujo de todos los agentes', async ({ page }) => {
    const projectName = `E2E Pipeline ${Date.now()}`;

    // ── 1. Crear proyecto ──────────────────────────────────────────
    await createProjectAndOpenAgent1(page, projectName);

    // ── 2. Agente 1 — texto ≥80 chars (sin clarificación) ──────────
    await page.locator('#write-text-button').click();
    await expect(page.getByRole('heading', { name: 'Escribe tus requerimientos' })).toBeVisible();

    expect(LONG_CONTEXT.length).toBeGreaterThanOrEqual(80);
    await page.getByPlaceholder(/Ejemplo: Quiero una app/).fill(LONG_CONTEXT);
    await page.getByRole('button', { name: 'Analizar contexto' }).click();
    await approveWishesAndContinueToAgent2(page);

    // ── 3. Agente 2 — backlog ──────────────────────────────────────
    await waitAgentHero(page, 'Backlog Inicial');
    await page.getByRole('button', { name: 'Generar Backlog' }).click();
    await expect(page.getByRole('button', { name: 'Aprobar Backlog y Continuar' })).toBeEnabled({
      timeout: 120_000,
    });

    await page.getByRole('button', { name: 'Aprobar Backlog y Continuar' }).click();
    await expect(page.getByText('Backlog aprobado')).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Continuar al Agente 3' }).click();
    await expect(page).toHaveURL(/\/agentes\/3/, { timeout: 30_000 });

    // ── 4. Agente 3 — estimación ───────────────────────────────────
    await waitAgentHero(page, 'Estimación en Story Points');
    await page.getByRole('button', { name: 'Sugerir Story Points con IA' }).click();
    await expect(page.getByRole('button', { name: 'Consolidar Backlog Estimado' })).toBeEnabled({
      timeout: 120_000,
    });
    await page.getByRole('button', { name: 'Consolidar Backlog Estimado' }).click();
    await expect(page.getByText('Backlog estimado')).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Continuar al Agente 4' }).click();
    await expect(page).toHaveURL(/\/agentes\/4/, { timeout: 30_000 });

    // ── 5. Agente 4 — priorización ─────────────────────────────────
    await waitAgentHero(page, 'Priorización del Backlog');
    await page.getByRole('button', { name: /Sugerir priorización/i }).click();
    await expect(page.getByRole('button', { name: 'Consolidar Backlog Priorizado' })).toBeEnabled({
      timeout: 120_000,
    });
    await page.getByRole('button', { name: 'Consolidar Backlog Priorizado' }).click();
    await expect(page.getByText('Backlog priorizado')).toBeVisible({ timeout: 30_000 });
    await page.getByRole('link', { name: 'Continuar al Agente 5' }).click();
    await expect(page).toHaveURL(/\/agentes\/5/, { timeout: 30_000 });

    // ── 6. Agente 5 — sprints ──────────────────────────────────────
    await waitAgentHero(page, 'Planificación de Sprints');
    await page.getByRole('button', { name: 'Generar plan de sprints' }).click();
    await expect(page.getByRole('button', { name: 'Consolidar Plan de Sprints' })).toBeEnabled({
      timeout: 120_000,
    });
    await page.getByRole('button', { name: 'Consolidar Plan de Sprints' }).click();
    await expect(page.getByText('Plan de Sprints consolidado')).toBeVisible({ timeout: 30_000 });

    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/agentes\/dashboard/, { timeout: 30_000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('ingresa contexto al Agente 1 subiendo un archivo .txt', async ({ page }) => {
    const projectName = `E2E Upload ${Date.now()}`;

    await createProjectAndOpenAgent1(page, projectName);

    await expect(page.getByRole('heading', { name: /Arrastra tu archivo aquí/i })).toBeVisible();

    const uploadResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/agentes/1/upload') && response.request().method() === 'POST'
    );

    await page.locator('input[type="file"]').setInputFiles({
      name: 'contexto-e2e.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(LONG_CONTEXT, 'utf8'),
    });

    await expect(page.getByText('Procesando archivo...')).toBeVisible({ timeout: 15_000 });
    const response = await uploadResponse;
    expect(response.status()).toBe(200);

    await approveWishesAndContinueToAgent2(page);
    await waitAgentHero(page, 'Backlog Inicial');
  });
});
