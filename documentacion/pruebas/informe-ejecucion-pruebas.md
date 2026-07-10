# Informe de ejecución de pruebas — Klarify

**Proyecto:** Klarify  
**Fecha de ejecución:** 2026-07-10T22:24:49.952Z  
**Entorno:** local (Node.js + Next.js)  
**Herramientas:** Vitest (unitarias / integración) · Playwright (funcionales E2E)  
**Objetivo:** Evidencia de pruebas para la documentación de entrega del proyecto.

## 1. Resumen ejecutivo

| Suite | Total | OK | Fallos | Omitidos | Duración |
|-------|------:|---:|-------:|---------:|---------:|
| Unitarias / integración (Vitest) | 84 | 84 | 0 | 0 | 898 ms |
| Funcionales E2E (Playwright) | 35 | 34 | 1 | 0 | 1 m 40 s |
| **Total** | **119** | **118** | **1** | **0** | — |

**Tasa de éxito:** 99%  
**Resultado global:** FAIL

## 2. Alcance de las pruebas

### 2.1 Pruebas unitarias e integración
- Política de suscripción y degradación de planes (`subscription-policy`)
- Límites de regeneración por plan (`regeneration-policy`)
- Ranking y validación de prioridades MoSCoW (`priority-rank`)
- Progreso del pipeline de agentes y rutas de entrada (`project-progress`)
- Límites de plan, truncate de backlog y slots (`definitions`, `truncate-backlog`, `project-slot-selection`)
- Guards de export, GitHub, tablero y regeneración IA
- Dependencias, fechas, asignación y mutaciones de sprints
- Formatos de exportación JSON/Markdown/CSV y resolve de payload
- Validadores de Agentes 1–5 (archivos, inputs, IDs)
- Mapeo de exportación a GitHub Issues/Milestones (`export-mapper`)
- Utilidades del tablero Kanban (`board-utils`)
- Normalización de errores HTTP de API (`api-error`)
- Endpoints `/api/projects` y `/api/workspace` con autenticación mockeada

### 2.2 Pruebas funcionales E2E — navegación sin autenticación
- Carga de landing y visibilidad de marca / CTA
- Navegación a login desde CTA y precios sin sesión
- Controles de autenticación (Google / GitHub)
- Protección de rutas `/agentes/*`, dashboard y board (redirigen a login)
- Secciones públicas (precios, FAQ, footer)
- APIs protegidas (projects, workspace, github, agentes) responden 401 sin token

### 2.3 Pruebas funcionales E2E — con autenticación y pipeline
- Hub de proyectos con sesión válida (Firebase storageState + IndexedDB)
- APIs `/api/projects` y `/api/workspace` responden 200 con token de sesión
- Navegación autenticada entre agentes 1–3 y dashboard sin redirigir a login
- Pipeline completo: crear proyecto por texto → Agentes 1–5 (ingesta, backlog, estimación, priorización, sprints) → dashboard
- Agente 1 por subida de archivo (`.txt`): upload → análisis → deseos → Agente 2

## 3. Casos ejecutados

| # | Suite | Caso | Resultado | Duración |
|--:|-------|------|-----------|----------|
| 1 | Integración / unitarias (Vitest) | handleApiError (integración de respuestas API) responde 401 ante UNAUTHORIZED | PASS | 5 ms |
| 2 | Integración / unitarias (Vitest) | handleApiError (integración de respuestas API) permite mensaje 401 personalizado | PASS | 1 ms |
| 3 | Integración / unitarias (Vitest) | handleApiError (integración de respuestas API) responde 403 ante PlanLimitError | PASS | 1 ms |
| 4 | Integración / unitarias (Vitest) | handleApiError (integración de respuestas API) responde 404 ante NO_PROJECTS | PASS | 1 ms |
| 5 | Integración / unitarias (Vitest) | handleApiError (integración de respuestas API) responde 500 ante errores desconocidos | PASS | 4 ms |
| 6 | Integración / unitarias (Vitest) | API /api/projects (integración con mocks) GET lista proyectos cuando el usuario está autenticado | PASS | 7 ms |
| 7 | Integración / unitarias (Vitest) | API /api/projects (integración con mocks) GET responde 401 si no hay autenticación | PASS | 2 ms |
| 8 | Integración / unitarias (Vitest) | API /api/projects (integración con mocks) POST crea un proyecto con nombre | PASS | 3 ms |
| 9 | Integración / unitarias (Vitest) | API /api/projects (integración con mocks) POST responde 403 al superar el límite del plan | PASS | 3 ms |
| 10 | Integración / unitarias (Vitest) | API /api/workspace (integración con mocks) GET responde 401 sin autenticación | PASS | 7 ms |
| 11 | Integración / unitarias (Vitest) | API /api/workspace (integración con mocks) GET devuelve workspace y preferencias | PASS | 3 ms |
| 12 | Integración / unitarias (Vitest) | API /api/workspace (integración con mocks) PATCH guarda preferencias lastAgent | PASS | 3 ms |
| 13 | Integración / unitarias (Vitest) | board-utils (integración del tablero) recolecta IDs de historias desde épicas | PASS | 2 ms |
| 14 | Integración / unitarias (Vitest) | board-utils (integración del tablero) encuentra una historia y su épica | PASS | 1 ms |
| 15 | Integración / unitarias (Vitest) | board-utils (integración del tablero) resuelve el sprint de una historia | PASS | 0 ms |
| 16 | Integración / unitarias (Vitest) | board-utils (integración del tablero) inicializa el estado de ejecución en todo | PASS | 0 ms |
| 17 | Integración / unitarias (Vitest) | export-mapper (integración GitHub export) construye un backlog exportable con puntos, prioridad y sprint | PASS | 4 ms |
| 18 | Integración / unitarias (Vitest) | export-mapper (integración GitHub export) genera cuerpo de issue de épica con historias incluidas | PASS | 1 ms |
| 19 | Integración / unitarias (Vitest) | export-mapper (integración GitHub export) genera cuerpo de issue de historia con metadatos y dependencias | PASS | 1 ms |
| 20 | Integración / unitarias (Vitest) | export-mapper (integración GitHub export) genera título de milestone de sprint | PASS | 0 ms |
| 21 | Integración / unitarias (Vitest) | guards de plan (export / github / execution) bloquea export en plan free | PASS | 2 ms |
| 22 | Integración / unitarias (Vitest) | guards de plan (export / github / execution) permite export en plan pro | PASS | 1 ms |
| 23 | Integración / unitarias (Vitest) | guards de plan (export / github / execution) bloquea github fuera de pro | PASS | 1 ms |
| 24 | Integración / unitarias (Vitest) | guards de plan (export / github / execution) permite github en pro | PASS | 1 ms |
| 25 | Integración / unitarias (Vitest) | guards de plan (export / github / execution) bloquea tablero de ejecución en free | PASS | 0 ms |
| 26 | Integración / unitarias (Vitest) | guards de plan (export / github / execution) permite tablero y valida límite de miembros en pro | PASS | 0 ms |
| 27 | Integración / unitarias (Vitest) | assertAiRegenerationAllowed no incrementa en la primera generación (workspace idle) | PASS | 3 ms |
| 28 | Integración / unitarias (Vitest) | assertAiRegenerationAllowed incrementa cuando isRegeneration=true | PASS | 2 ms |
| 29 | Integración / unitarias (Vitest) | assertAiRegenerationAllowed infiere regeneración si ya hay épicas en agent2 | PASS | 1 ms |
| 30 | Integración / unitarias (Vitest) | validadores Agente 1 valida tipos y tamaño de archivo | PASS | 2 ms |
| 31 | Integración / unitarias (Vitest) | validadores Agente 1 genera IDs de deseos incrementales | PASS | 0 ms |
| 32 | Integración / unitarias (Vitest) | validadores Agente 1 valida respuestas de clarificación | PASS | 0 ms |
| 33 | Integración / unitarias (Vitest) | validadores Agente 1 enriquece contexto con respuestas | PASS | 0 ms |
| 34 | Integración / unitarias (Vitest) | validadores Agentes 2-5 valida input del Agente 2 y genera IDs | PASS | 0 ms |
| 35 | Integración / unitarias (Vitest) | validadores Agentes 2-5 valida input del Agente 3 | PASS | 0 ms |
| 36 | Integración / unitarias (Vitest) | validadores Agentes 2-5 valida input del Agente 4 con estimaciones | PASS | 0 ms |
| 37 | Integración / unitarias (Vitest) | validadores Agentes 2-5 valida input del Agente 5 con estimaciones y prioridades | PASS | 0 ms |
| 38 | Integración / unitarias (Vitest) | formatos de exportación genera JSON con meta Klarify | PASS | 3 ms |
| 39 | Integración / unitarias (Vitest) | formatos de exportación genera Markdown con resumen y épicas | PASS | 14 ms |
| 40 | Integración / unitarias (Vitest) | formatos de exportación genera CSV con secciones | PASS | 1 ms |
| 41 | Integración / unitarias (Vitest) | formatos de exportación buildProjectExport despacha por formato | PASS | 0 ms |
| 42 | Integración / unitarias (Vitest) | resolve-project-export no permite exportar workspace vacío | PASS | 0 ms |
| 43 | Integración / unitarias (Vitest) | resolve-project-export permite exportar cuando hay deseos o historias | PASS | 0 ms |
| 44 | Integración / unitarias (Vitest) | resolve-project-export resuelve payload con resumen coherente | PASS | 1 ms |
| 45 | Integración / unitarias (Vitest) | repo-utils slugifica y valida nombres de repositorio | PASS | 1 ms |
| 46 | Integración / unitarias (Vitest) | definitions y getAiConfig expone límites distintos por plan | PASS | 1 ms |
| 47 | Integración / unitarias (Vitest) | definitions y getAiConfig mapea getAiConfig desde los límites del plan | PASS | 1 ms |
| 48 | Integración / unitarias (Vitest) | plan-errors serializa PlanLimitError a JSON | PASS | 0 ms |
| 49 | Integración / unitarias (Vitest) | assertProjectSlotAccessible permite proyectos active | PASS | 1 ms |
| 50 | Integración / unitarias (Vitest) | assertProjectSlotAccessible bloquea proyectos locked | PASS | 0 ms |
| 51 | Integración / unitarias (Vitest) | canChangeProjectSlotSelection no permite elegir si no hay locked | PASS | 0 ms |
| 52 | Integración / unitarias (Vitest) | canChangeProjectSlotSelection permite elegir tras downgrade con excedente sin confirmar | PASS | 0 ms |
| 53 | Integración / unitarias (Vitest) | canChangeProjectSlotSelection no permite elegir si ya confirmó para el plan actual | PASS | 0 ms |
| 54 | Integración / unitarias (Vitest) | truncateBacklogToPlanLimits recorta épicas e historias al límite del plan | PASS | 1 ms |
| 55 | Integración / unitarias (Vitest) | truncateBacklogToPlanLimits no marca truncated si cabe todo | PASS | 0 ms |
| 56 | Integración / unitarias (Vitest) | ranking de prioridad (Agente 4) asigna menor rank a mayor prioridad en MoSCoW | PASS | 2 ms |
| 57 | Integración / unitarias (Vitest) | ranking de prioridad (Agente 4) devuelve 99 para categorías desconocidas | PASS | 0 ms |
| 58 | Integración / unitarias (Vitest) | ranking de prioridad (Agente 4) detecta violación cuando el prerequisito tiene menor prioridad | PASS | 0 ms |
| 59 | Integración / unitarias (Vitest) | ranking de prioridad (Agente 4) genera etiqueta de orden legible | PASS | 0 ms |
| 60 | Integración / unitarias (Vitest) | slugifyExportFilename normaliza acentos y espacios | PASS | 2 ms |
| 61 | Integración / unitarias (Vitest) | slugifyExportFilename usa fallback cuando el nombre queda vacío | PASS | 0 ms |
| 62 | Integración / unitarias (Vitest) | progreso del pipeline inicia en el paso 1 con 0% si no hay avances | PASS | 1 ms |
| 63 | Integración / unitarias (Vitest) | progreso del pipeline avanza el porcentaje cuando hay agentes aprobados | PASS | 0 ms |
| 64 | Integración / unitarias (Vitest) | progreso del pipeline resuelve la ruta de entrada según lastAgent y pipelineStep | PASS | 0 ms |
| 65 | Integración / unitarias (Vitest) | política de regeneración por plan bloquea regeneración en plan free | PASS | 2 ms |
| 66 | Integración / unitarias (Vitest) | política de regeneración por plan limita regeneraciones mensuales en starter | PASS | 0 ms |
| 67 | Integración / unitarias (Vitest) | política de regeneración por plan niega regeneración cuando se agota el cupo starter | PASS | 0 ms |
| 68 | Integración / unitarias (Vitest) | política de regeneración por plan permite regeneración ilimitada en pro | PASS | 0 ms |
| 69 | Integración / unitarias (Vitest) | política de regeneración por plan sugiere el upgrade correcto según el plan actual | PASS | 0 ms |
| 70 | Integración / unitarias (Vitest) | story-dependencies detecta keywords con límites de palabra | PASS | 3 ms |
| 71 | Integración / unitarias (Vitest) | story-dependencies detecta ciclos potenciales | PASS | 0 ms |
| 72 | Integración / unitarias (Vitest) | story-dependencies sanitiza dependencias inválidas por prioridad o grounding | PASS | 3 ms |
| 73 | Integración / unitarias (Vitest) | sprint-dates parsea y formatea fechas locales sin desfase UTC | PASS | 1 ms |
| 74 | Integración / unitarias (Vitest) | sprint-dates calcula fin inclusive por semanas y días | PASS | 0 ms |
| 75 | Integración / unitarias (Vitest) | sprint-dates valida solapes entre sprints | PASS | 0 ms |
| 76 | Integración / unitarias (Vitest) | sprint-assignment asigna historias respetando capacidad y dependencias | PASS | 1 ms |
| 77 | Integración / unitarias (Vitest) | sprint-assignment genera goals con prefijo Sprint N | PASS | 0 ms |
| 78 | Integración / unitarias (Vitest) | sprint-plan-mutations normaliza ids duplicados y números secuenciales | PASS | 1 ms |
| 79 | Integración / unitarias (Vitest) | sprint-plan-mutations mueve historias entre sprints y actualiza velocity | PASS | 1 ms |
| 80 | Integración / unitarias (Vitest) | sprint-plan-mutations genera el siguiente id de sprint y sincroniza goals | PASS | 0 ms |
| 81 | Integración / unitarias (Vitest) | getEffectivePlanId (integración de política de suscripción) devuelve el plan contratado cuando la suscripción está activa | PASS | 2 ms |
| 82 | Integración / unitarias (Vitest) | getEffectivePlanId (integración de política de suscripción) degrada a free cuando la suscripción está cancelada | PASS | 0 ms |
| 83 | Integración / unitarias (Vitest) | getEffectivePlanId (integración de política de suscripción) mantiene el plan durante el periodo de gracia past_due | PASS | 1 ms |
| 84 | Integración / unitarias (Vitest) | getEffectivePlanId (integración de política de suscripción) degrada a free si past_due supera los días de gracia | PASS | 0 ms |
| 85 | Funcionales E2E (Playwright) | auth.setup.ts › verificar sesión autenticada | PASS | 6.6 s |
| 86 | Funcionales E2E (Playwright) | coverage-public.spec.ts › Funcionales — cobertura ampliada de rutas públicas y APIs › la sección de precios es alcanzable desde la landing | PASS | 2.6 s |
| 87 | Funcionales E2E (Playwright) | coverage-public.spec.ts › Funcionales — cobertura ampliada de rutas públicas y APIs › CTA de plan Free en precios lleva a login | PASS | 3.1 s |
| 88 | Funcionales E2E (Playwright) | coverage-public.spec.ts › Funcionales — cobertura ampliada de rutas públicas y APIs › protege dashboard y board sin sesión | PASS | 4.9 s |
| 89 | Funcionales E2E (Playwright) | coverage-public.spec.ts › Funcionales — cobertura ampliada de rutas públicas y APIs › protege rutas de agentes 1-5 sin sesión | PASS | 7.4 s |
| 90 | Funcionales E2E (Playwright) | coverage-public.spec.ts › Funcionales — cobertura ampliada de rutas públicas y APIs › API /api/workspace responde 401 sin token | PASS | 413 ms |
| 91 | Funcionales E2E (Playwright) | coverage-public.spec.ts › Funcionales — cobertura ampliada de rutas públicas y APIs › API /api/projects responde 401 sin token | PASS | 283 ms |
| 92 | Funcionales E2E (Playwright) | coverage-public.spec.ts › Funcionales — cobertura ampliada de rutas públicas y APIs › API /api/github/connect responde 401 sin token | PASS | 416 ms |
| 93 | Funcionales E2E (Playwright) | coverage-public.spec.ts › Funcionales — cobertura ampliada de rutas públicas y APIs › API /api/github/repos responde 401 sin token | PASS | 137 ms |
| 94 | Funcionales E2E (Playwright) | coverage-public.spec.ts › Funcionales — cobertura ampliada de rutas públicas y APIs › API /api/github/projects responde 401 sin token | PASS | 127 ms |
| 95 | Funcionales E2E (Playwright) | coverage-public.spec.ts › Funcionales — cobertura ampliada de rutas públicas y APIs › API /api/github/export responde 401 sin token | PASS | 185 ms |
| 96 | Funcionales E2E (Playwright) | coverage-public.spec.ts › Funcionales — cobertura ampliada de rutas públicas y APIs › API /api/agentes/1/analyze responde 401 sin token | PASS | 175 ms |
| 97 | Funcionales E2E (Playwright) | coverage-public.spec.ts › Funcionales — cobertura ampliada de rutas públicas y APIs › API /api/agentes/1/extract responde 401 sin token | PASS | 201 ms |
| 98 | Funcionales E2E (Playwright) | coverage-public.spec.ts › Funcionales — cobertura ampliada de rutas públicas y APIs › API /api/agentes/1/upload responde 401 sin token | PASS | 240 ms |
| 99 | Funcionales E2E (Playwright) | coverage-public.spec.ts › Funcionales — cobertura ampliada de rutas públicas y APIs › API /api/agentes/2/generate responde 401 sin token | PASS | 209 ms |
| 100 | Funcionales E2E (Playwright) | coverage-public.spec.ts › Funcionales — cobertura ampliada de rutas públicas y APIs › API /api/agentes/3/estimate responde 401 sin token | PASS | 199 ms |
| 101 | Funcionales E2E (Playwright) | coverage-public.spec.ts › Funcionales — cobertura ampliada de rutas públicas y APIs › API /api/agentes/4/prioritize responde 401 sin token | PASS | 130 ms |
| 102 | Funcionales E2E (Playwright) | coverage-public.spec.ts › Funcionales — cobertura ampliada de rutas públicas y APIs › API /api/agentes/5/plan responde 401 sin token | PASS | 129 ms |
| 103 | Funcionales E2E (Playwright) | landing-auth.spec.ts › Funcionales — Landing y autenticación › la landing muestra la marca Klarify y el CTA principal | PASS | 1.6 s |
| 104 | Funcionales E2E (Playwright) | landing-auth.spec.ts › Funcionales — Landing y autenticación › el CTA de la landing lleva a /login sin sesión | PASS | 2.4 s |
| 105 | Funcionales E2E (Playwright) | landing-auth.spec.ts › Funcionales — Landing y autenticación › la página de login ofrece Google y GitHub | PASS | 1.4 s |
| 106 | Funcionales E2E (Playwright) | landing-auth.spec.ts › Funcionales — Landing y autenticación › rutas de agentes sin sesión redirigen a login | PASS | 2.9 s |
| 107 | Funcionales E2E (Playwright) | landing-auth.spec.ts › Funcionales — Landing y autenticación › la sección de precios está disponible en la landing | PASS | 2.1 s |
| 108 | Funcionales E2E (Playwright) | public-api.spec.ts › Funcionales — Navegación pública › FAQ de la landing responde qué es Klarify | PASS | 2.1 s |
| 109 | Funcionales E2E (Playwright) | public-api.spec.ts › Funcionales — Navegación pública › footer muestra copyright de Klarify | PASS | 1.7 s |
| 110 | Funcionales E2E (Playwright) | public-api.spec.ts › Funcionales — Navegación pública › API projects sin token responde 401 | PASS | 155 ms |
| 111 | Funcionales E2E (Playwright) | public-api.spec.ts › Funcionales — Navegación pública › API workspace sin token responde 401 | PASS | 151 ms |
| 112 | Funcionales E2E (Playwright) | authenticated-flow.spec.ts › Flujo autenticado — proyectos y agentes › entra al hub de proyectos con sesión válida | PASS | 6.0 s |
| 113 | Funcionales E2E (Playwright) | authenticated-flow.spec.ts › Flujo autenticado — proyectos y agentes › API /api/projects responde 200 con el token de la sesión | PASS | 8.5 s |
| 114 | Funcionales E2E (Playwright) | authenticated-flow.spec.ts › Flujo autenticado — proyectos y agentes › API /api/workspace responde 200 con el token de la sesión | PASS | 5.6 s |
| 115 | Funcionales E2E (Playwright) | authenticated-flow.spec.ts › Flujo autenticado — proyectos y agentes › puede abrir el agente 1 sin redirigir a login | PASS | 2.4 s |
| 116 | Funcionales E2E (Playwright) | authenticated-flow.spec.ts › Flujo autenticado — proyectos y agentes › navegación entre agentes 1-3 mantiene la sesión | PASS | 3.8 s |
| 117 | Funcionales E2E (Playwright) | authenticated-flow.spec.ts › Flujo autenticado — proyectos y agentes › dashboard autenticado carga sin redirigir a login | PASS | 2.5 s |
| 118 | Funcionales E2E (Playwright) | authenticated-pipeline.spec.ts › Pipeline autenticado — proyecto + agentes 1-5 › crea proyecto por texto y completa el flujo de todos los agentes | PASS | 1 m 31 s |
| 119 | Funcionales E2E (Playwright) | authenticated-pipeline.spec.ts › Pipeline autenticado — proyecto + agentes 1-5 › ingresa contexto al Agente 1 subiendo un archivo .txt | FAIL | 17.9 s |

## 4. Defectos encontrados

1. **authenticated-pipeline.spec.ts › Pipeline autenticado — proyecto + agentes 1-5 › ingresa contexto al Agente 1 subiendo un archivo .txt** (Funcionales E2E (Playwright))

## 5. Evidencias técnicas

| Artefacto | Ubicación |
|-----------|-----------|
| Reporte Vitest (JSON) | `test-results/vitest-report.json` |
| Reporte Vitest (JUnit) | `test-results/vitest-junit.xml` |
| Reporte Playwright (HTML) | `playwright-report/index.html` |
| Reporte Playwright (JSON) | `test-results/playwright-report.json` |
| Reporte Playwright (JUnit) | `test-results/playwright-junit.xml` |
| Este informe | `documentacion/pruebas/informe-ejecucion-pruebas.md` |

## 6. Herramientas utilizadas

| Herramienta | Rol en la suite |
|-------------|-----------------|
| **Vitest** | Pruebas unitarias e integración (lógica de negocio, guards, APIs mockeadas) |
| **Playwright** | Pruebas funcionales E2E en Chromium (navegación pública, sesión y pipeline) |
| **Next.js (dev server)** | App bajo prueba en `localhost:3000` (arrancado por Playwright o reutilizado) |
| **Firebase Auth** | Sesión real (Google/GitHub) persistida en `e2e/.auth/user.json` (IndexedDB) |
| **Mocks de agentes** | Sin `GEMINI_API_KEY`/`OPENAI_API_KEY` el pipeline usa respuestas deterministas |

## 7. Cómo reproducir

```bash
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
```

## 8. Conclusión

Se ejecutaron **119** casos de prueba (84 de integración/unitarias y 35 funcionales E2E).  
La tasa de éxito fue del **99%**.  
Existen fallos que deben corregirse antes de considerar la suite en verde para la entrega.
