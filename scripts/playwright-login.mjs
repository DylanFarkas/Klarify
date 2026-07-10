/**
 * Login interactivo para E2E autenticados.
 *
 * Firebase guarda la sesión en IndexedDB; por eso usamos storageState con indexedDB: true.
 *
 * Uso:
 *   1. npm run dev
 *   2. npm run test:e2e:login
 *   3. En el navegador: Continuar con Google o GitHub
 *   4. Cuando llegues a /agentes/*, se guarda e2e/.auth/user.json
 *
 * Alternativa CLI (codegen):
 *   npx playwright codegen --save-storage=e2e/.auth/user.json http://localhost:3000/login
 *   (si la sesión no persiste, usa este script: Firebase necesita IndexedDB)
 */

import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const authFile = join(root, 'e2e', '.auth', 'user.json');
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const timeoutMs = Number(process.env.PLAYWRIGHT_LOGIN_TIMEOUT_MS ?? 5 * 60 * 1000);

async function assertServerUp() {
  try {
    const response = await fetch(baseURL, { signal: AbortSignal.timeout(5000) });
    if (!response.ok && response.status >= 500) {
      throw new Error(`Servidor respondió ${response.status}`);
    }
  } catch {
    throw new Error(
      `No hay servidor en ${baseURL}.\n` +
        'Arranca la app en otra terminal: npm run dev\n' +
        'Luego vuelve a ejecutar: npm run test:e2e:login'
    );
  }
}

async function main() {
  await assertServerUp();
  mkdirSync(dirname(authFile), { recursive: true });

  console.log('Abriendo navegador para login...');
  console.log('1) Inicia sesión con Google o GitHub');
  console.log('2) Espera a entrar en /agentes/...');
  console.log(`Timeout: ${Math.round(timeoutMs / 1000)}s\n`);

  const browser = await chromium.launch({ headless: false, channel: undefined });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' });

  try {
    await page.waitForURL(/\/agentes(\/|$)/, { timeout: timeoutMs });
  } catch {
    await browser.close();
    throw new Error(
      'No se detectó redirección a /agentes/.\n' +
        'Completa el login en el navegador (Google/GitHub) y vuelve a intentar.'
    );
  }

  // Dar tiempo a que Firebase persista tokens en IndexedDB
  await page.waitForTimeout(1500);
  await context.storageState({ path: authFile, indexedDB: true });
  await browser.close();

  console.log(`\nSesión guardada en: ${authFile}`);
  console.log('Siguiente paso: npm run test:e2e:auth');
  console.log('Para grabar más tests: npm run test:e2e:codegen');
}

main().catch((error) => {
  console.error('\n' + (error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
