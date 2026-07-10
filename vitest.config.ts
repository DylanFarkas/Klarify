import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    reporters: ['default', 'json', 'junit'],
    outputFile: {
      json: 'test-results/vitest-report.json',
      junit: 'test-results/vitest-junit.xml',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'test-results/coverage',
      include: ['lib/**/*.ts'],
      exclude: ['lib/mock/**', 'lib/adapters/**/Gemini*.ts', 'lib/adapters/**/OpenAI*.ts'],
    },
  },
});
