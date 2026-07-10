# Pruebas — Klarify

Suite de pruebas para la documentación de entrega.

## Comandos

```bash
# Unitarias + integración
npm run test

# E2E públicos (sin login) — incluye los 401
npm run test:e2e

# Login real (abre navegador; Google/GitHub)
npm run test:e2e:login

# E2E autenticados (requiere login previo)
npm run test:e2e:auth

# Grabar más tests con el CLI de Playwright (sesión ya guardada)
npm run test:e2e:codegen

# Todo público + informe Markdown
npm run test:all
```

## Flujo autenticado con Playwright CLI

Firebase guarda la sesión en **IndexedDB**, por eso el login recomendado es:

```bash
# Terminal 1 — idealmente SIN GEMINI_API_KEY (usa mocks)
npm run dev

# Terminal 2
npm run test:e2e:login
```

1. Se abre Chromium en `/login`
2. Inicias sesión con Google o GitHub
3. Al llegar a `/agentes/*` se guarda `e2e/.auth/user.json` (con IndexedDB)
4. Ejecutas el pipeline:

```bash
npm run test:e2e:auth
```

Eso incluye:
- Smoke autenticado (proyectos, APIs 200, rutas)
- **Pipeline completo**: crear proyecto por texto → agentes 1–5 → dashboard

### Alternativa solo CLI (`codegen`)

```bash
npx playwright codegen --save-storage=e2e/.auth/user.json http://localhost:3000/login
# inicia sesión y cierra la ventana

# Grabar pasos ya autenticado:
npm run test:e2e:codegen
```

Si tras `codegen --save-storage` la sesión no se restaura, usa `npm run test:e2e:login` (incluye IndexedDB de Firebase).

`e2e/.auth/user.json` **no se sube al repo** (está en `.gitignore`).

**Nota mocks:** el pipeline es estable sin `GEMINI_API_KEY`. Si tu `npm run dev` ya tiene la key, verás LLM real (más lento / flaky).

## Entregable

Tras `npm run test:all` (y opcionalmente `test:e2e:auth`):

- `documentacion/pruebas/informe-ejecucion-pruebas.md`
- `playwright-report/` — reporte HTML

## Cobertura

| Área | Cubierto |
|------|----------|
| Planes, guards, sprints, export, validadores | Sí (Vitest) |
| Landing / login / 401 APIs | Sí (E2E público) |
| Hub proyectos + APIs 200 + agentes con sesión | Sí (`test:e2e:auth`) |
| Pipeline completo (crear proyecto → agentes 1–5 → dashboard) | Sí (`authenticated-pipeline.spec.ts`) |
| Agente 1 por subida de archivo (`.txt`) | Sí (`authenticated-pipeline.spec.ts`) |
| Pipeline LLM real (Gemini) | Soportado (salta clarificación si aparece) |
