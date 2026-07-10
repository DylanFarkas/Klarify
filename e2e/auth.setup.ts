import { existsSync } from 'node:fs';
import { test as setup, expect } from '@playwright/test';
import { AUTH_FILE } from './auth-path';

setup('verificar sesión autenticada', async ({ browser, baseURL }) => {
  if (!existsSync(AUTH_FILE)) {
    throw new Error(
      [
        'No hay sesión de Playwright guardada.',
        '',
        'Con el servidor en marcha (npm run dev), ejecuta:',
        '  npm run test:e2e:login',
        '',
        'Inicia sesión con Google/GitHub en el navegador que se abre.',
        'Luego:',
        '  npm run test:e2e:auth',
        '',
        'Para grabar más pasos con el CLI:',
        '  npm run test:e2e:codegen',
      ].join('\n')
    );
  }

  const context = await browser.newContext({
    baseURL,
    storageState: AUTH_FILE,
  });
  const page = await context.newPage();

  await page.goto('/agentes/proyectos');
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Tus proyectos' })).toBeVisible({
    timeout: 30_000,
  });

  await context.storageState({ path: AUTH_FILE, indexedDB: true });
  await context.close();
});
