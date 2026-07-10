import { defineConfig, devices } from '@playwright/test';
import { AUTH_FILE } from './e2e/auth-path';

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results/playwright-artifacts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/playwright-report.json' }],
    ['junit', { outputFile: 'test-results/playwright-junit.xml' }],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-public',
      testIgnore: [/auth\.setup\.ts/, /auth-path\.ts/, /authenticated-/],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-auth',
      testMatch: /authenticated-/,
      dependencies: ['setup'],
      timeout: 300_000,
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Fuerza mocks deterministas cuando Playwright arranca el servidor.
    // Si reutilizas un `npm run dev` con GEMINI_API_KEY, el pipeline usará LLM real.
    env: {
      ...process.env,
      GEMINI_API_KEY: '',
      OPENAI_API_KEY: '',
    },
  },
});
