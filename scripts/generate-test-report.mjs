/**
 * Genera el informe de ejecución de pruebas para la documentación de entrega.
 *
 * Uso: node scripts/generate-test-report.mjs
 * Requiere haber ejecutado antes: npm run test && npm run test:e2e
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const vitestPath = join(root, 'test-results', 'vitest-report.json');
const playwrightPath = join(root, 'test-results', 'playwright-report.json');
const outDir = join(root, 'documentacion', 'pruebas');
const outPath = join(outDir, 'informe-ejecucion-pruebas.md');

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function formatDuration(ms) {
  if (ms == null || Number.isNaN(ms)) return 'N/D';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  const rem = (seconds % 60).toFixed(0);
  return `${minutes} m ${rem} s`;
}

function summarizeVitest(report) {
  if (!report) {
    return { total: 0, passed: 0, failed: 0, skipped: 0, durationMs: 0, cases: [] };
  }

  const cases = [];
  for (const file of report.testResults ?? []) {
    for (const assertion of file.assertionResults ?? []) {
      cases.push({
        suite: 'Integración / unitarias (Vitest)',
        name: assertion.fullName || assertion.title,
        status: assertion.status === 'passed' ? 'PASS' : assertion.status === 'pending' ? 'SKIP' : 'FAIL',
        durationMs: assertion.duration ?? 0,
      });
    }
  }

  return {
    total: report.numTotalTests ?? cases.length,
    passed: report.numPassedTests ?? cases.filter((c) => c.status === 'PASS').length,
    failed: report.numFailedTests ?? cases.filter((c) => c.status === 'FAIL').length,
    skipped: report.numPendingTests ?? cases.filter((c) => c.status === 'SKIP').length,
    durationMs: report.startTime && report.testResults
      ? (report.testResults.reduce((max, f) => Math.max(max, f.endTime || 0), 0) - report.startTime)
      : cases.reduce((sum, c) => sum + (c.durationMs || 0), 0),
    cases,
  };
}

function summarizePlaywright(report) {
  if (!report) {
    return { total: 0, passed: 0, failed: 0, skipped: 0, durationMs: 0, cases: [] };
  }

  const cases = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let durationMs = 0;

  for (const suite of report.suites ?? []) {
    walkSuite(suite, cases);
  }

  for (const c of cases) {
    if (c.status === 'PASS') passed += 1;
    else if (c.status === 'SKIP') skipped += 1;
    else failed += 1;
    durationMs += c.durationMs || 0;
  }

  return {
    total: cases.length,
    passed,
    failed,
    skipped,
    durationMs: report.stats?.duration ?? durationMs,
    cases,
  };
}

function walkSuite(suite, cases, parentTitle = '') {
  const title = [parentTitle, suite.title].filter(Boolean).join(' › ');

  for (const spec of suite.specs ?? []) {
    const result = spec.tests?.[0]?.results?.[0];
    const statusRaw = result?.status ?? (spec.ok ? 'passed' : 'failed');
    const status =
      statusRaw === 'passed' || statusRaw === 'expected'
        ? 'PASS'
        : statusRaw === 'skipped'
          ? 'SKIP'
          : 'FAIL';

    cases.push({
      suite: 'Funcionales E2E (Playwright)',
      name: `${title} › ${spec.title}`.replace(/^ › /, ''),
      status,
      durationMs: result?.duration ?? 0,
    });
  }

  for (const child of suite.suites ?? []) {
    walkSuite(child, cases, title);
  }
}

const vitest = summarizeVitest(readJson(vitestPath));
const playwright = summarizePlaywright(readJson(playwrightPath));

const total = vitest.total + playwright.total;
const passed = vitest.passed + playwright.passed;
const failed = vitest.failed + playwright.failed;
const skipped = vitest.skipped + playwright.skipped;
const allCases = [...vitest.cases, ...playwright.cases];
const passRate = total === 0 ? 0 : Math.round((passed / total) * 100);
const executedAt = new Date().toISOString();

const caseRows = allCases
  .map(
    (c, index) =>
      `| ${index + 1} | ${c.suite} | ${c.name.replace(/\|/g, '\\|')} | ${c.status} | ${formatDuration(c.durationMs)} |`
  )
  .join('\n');

const markdown = `# Informe de ejecución de pruebas — Klarify

**Proyecto:** Klarify  
**Fecha de ejecución:** ${executedAt}  
**Entorno:** local (Node.js + Next.js)  
**Herramientas:** Vitest (unitarias / integración) · Playwright (funcionales E2E)  
**Objetivo:** Evidencia de pruebas para la documentación de entrega del proyecto.

## 1. Resumen ejecutivo

| Suite | Total | OK | Fallos | Omitidos | Duración |
|-------|------:|---:|-------:|---------:|---------:|
| Unitarias / integración (Vitest) | ${vitest.total} | ${vitest.passed} | ${vitest.failed} | ${vitest.skipped} | ${formatDuration(vitest.durationMs)} |
| Funcionales E2E (Playwright) | ${playwright.total} | ${playwright.passed} | ${playwright.failed} | ${playwright.skipped} | ${formatDuration(playwright.durationMs)} |
| **Total** | **${total}** | **${passed}** | **${failed}** | **${skipped}** | — |

**Tasa de éxito:** ${passRate}%  
**Resultado global:** ${failed === 0 && total > 0 ? 'PASS' : total === 0 ? 'SIN DATOS' : 'FAIL'}

## 2. Alcance de las pruebas

### 2.1 Pruebas unitarias e integración
- Política de suscripción y degradación de planes (\`subscription-policy\`)
- Límites de regeneración por plan (\`regeneration-policy\`)
- Ranking y validación de prioridades MoSCoW (\`priority-rank\`)
- Progreso del pipeline de agentes y rutas de entrada (\`project-progress\`)
- Límites de plan, truncate de backlog y slots (\`definitions\`, \`truncate-backlog\`, \`project-slot-selection\`)
- Guards de export, GitHub, tablero y regeneración IA
- Dependencias, fechas, asignación y mutaciones de sprints
- Formatos de exportación JSON/Markdown/CSV y resolve de payload
- Validadores de Agentes 1–5 (archivos, inputs, IDs)
- Mapeo de exportación a GitHub Issues/Milestones (\`export-mapper\`)
- Utilidades del tablero Kanban (\`board-utils\`)
- Normalización de errores HTTP de API (\`api-error\`)
- Endpoints \`/api/projects\` y \`/api/workspace\` con autenticación mockeada

### 2.2 Pruebas funcionales E2E — navegación sin autenticación
- Carga de landing y visibilidad de marca / CTA
- Navegación a login desde CTA y precios sin sesión
- Controles de autenticación (Google / GitHub)
- Protección de rutas \`/agentes/*\`, dashboard y board (redirigen a login)
- Secciones públicas (precios, FAQ, footer)
- APIs protegidas (projects, workspace, github, agentes) responden 401 sin token

### 2.3 Pruebas funcionales E2E — con autenticación y pipeline
- Hub de proyectos con sesión válida (Firebase storageState + IndexedDB)
- APIs \`/api/projects\` y \`/api/workspace\` responden 200 con token de sesión
- Navegación autenticada entre agentes 1–3 y dashboard sin redirigir a login
- Pipeline completo: crear proyecto por texto → Agentes 1–5 (ingesta, backlog, estimación, priorización, sprints) → dashboard
- Agente 1 por subida de archivo (\`.txt\`): upload → análisis → deseos → Agente 2

## 3. Casos ejecutados

| # | Suite | Caso | Resultado | Duración |
|--:|-------|------|-----------|----------|
${caseRows || '| — | — | No se encontraron reportes JSON. Ejecuta \`npm run test:all\` | — | — |'}

## 4. Defectos encontrados

${
  failed === 0
    ? 'No se registraron defectos en esta ejecución.'
    : allCases
        .filter((c) => c.status === 'FAIL')
        .map((c, i) => `${i + 1}. **${c.name}** (${c.suite})`)
        .join('\n')
}

## 5. Evidencias técnicas

| Artefacto | Ubicación |
|-----------|-----------|
| Reporte Vitest (JSON) | \`test-results/vitest-report.json\` |
| Reporte Vitest (JUnit) | \`test-results/vitest-junit.xml\` |
| Reporte Playwright (HTML) | \`playwright-report/index.html\` |
| Reporte Playwright (JSON) | \`test-results/playwright-report.json\` |
| Reporte Playwright (JUnit) | \`test-results/playwright-junit.xml\` |
| Este informe | \`documentacion/pruebas/informe-ejecucion-pruebas.md\` |

## 6. Herramientas utilizadas

| Herramienta | Rol en la suite |
|-------------|-----------------|
| **Vitest** | Pruebas unitarias e integración (lógica de negocio, guards, APIs mockeadas) |
| **Playwright** | Pruebas funcionales E2E en Chromium (navegación pública, sesión y pipeline) |
| **Next.js (dev server)** | App bajo prueba en \`localhost:3000\` (arrancado por Playwright o reutilizado) |
| **Firebase Auth** | Sesión real (Google/GitHub) persistida en \`e2e/.auth/user.json\` (IndexedDB) |
| **Mocks de agentes** | Sin \`GEMINI_API_KEY\`/\`OPENAI_API_KEY\` el pipeline usa respuestas deterministas |

## 7. Cómo reproducir

\`\`\`bash
npm install
npx playwright install chromium

# Unitarias + integración + E2E público + informe
npm run test:all

# E2E autenticados (requiere login previo una vez)
npm run test:e2e:login   # abre navegador; inicia sesión
npm run test:e2e:auth    # smoke + pipeline agentes 1-5

# Regenerar informe tras ambas suites E2E
npx playwright test --project=chromium-public --project=setup --project=chromium-auth
node scripts/generate-test-report.mjs
\`\`\`

## 8. Conclusión

Se ejecutaron **${total}** casos de prueba (${vitest.total} de integración/unitarias y ${playwright.total} funcionales E2E).  
La tasa de éxito fue del **${passRate}%**.  
${
  failed === 0 && total > 0
    ? 'El sistema cumple los criterios de aceptación cubiertos por esta suite (navegación pública, APIs, sesión autenticada y pipeline de agentes) para la entrega documental.'
    : total === 0
      ? 'No hay resultados disponibles: ejecuta las suites y regenera el informe.'
      : 'Existen fallos que deben corregirse antes de considerar la suite en verde para la entrega.'
}
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, markdown, 'utf8');
console.log(`Informe generado: ${outPath}`);
console.log(`Resumen: ${passed}/${total} OK (${passRate}%)`);
