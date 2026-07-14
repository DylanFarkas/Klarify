# Klarify

Transforma ideas en **backlogs ejecutables** con un pipeline de agentes de IA.

Klarify ayuda a Product Owners, equipos de producto y startups a pasar de reunión, audio o documento a historias de usuario estimadas, priorizadas y organizadas en sprints — con revisión humana (HITL) en cada fase.

## Stack

| Área | Tecnología |
|------|------------|
| App | Next.js 16 (App Router), React 19, TypeScript |
| UI | Tailwind CSS 4, @dnd-kit, react-day-picker, sileo |
| Auth / datos | Firebase Auth + Firestore (`firebase` / `firebase-admin`) |
| LLM | Google Gemini (`gemini-2.5-flash`) vía `@google/genai` |
| ASR | OpenAI (`gpt-4o-mini-transcribe`) |
| Integraciones | GitHub (Issues / Projects) |
| Export | JSON, Markdown, XLSX |

Sin `GEMINI_API_KEY` / `OPENAI_API_KEY`, los agentes usan adapters mock.

## Requisitos

- Node.js 20+
- Cuenta Firebase (Auth + Firestore)
- Claves de Gemini y OpenAI (opcionales en desarrollo)

## Configuración

1. Clona e instala dependencias:

```bash
npm install
```

2. Crea un archivo `.env.local` en la raíz:

```env
# Firebase (cliente)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (JSON del service account en una línea)
FIREBASE_SERVICE_ACCOUNT_KEY=

# IA
GEMINI_API_KEY=
OPENAI_API_KEY=
```

3. Arranca el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (webpack) |
| `npm run build` | Build de producción |
| `npm start` | Sirve el build |
| `npm run lint` | ESLint |

## Pipeline de agentes

Cada paso genera output revisable; el usuario aprueba antes de continuar.

| Paso | Ruta | Función |
|------|------|---------|
| 1 · Ingesta de contexto | `/agentes/1` | Carga `.mp3` / `.wav` / `.txt` / `.pdf`, transcripción, clarificación y extracción de deseos |
| 2 · Backlog inicial | `/agentes/2` | Épicas e historias de usuario con criterios de aceptación |
| 3 · Estimación | `/agentes/3` | Story points (Fibonacci) y justificación |
| 4 · Priorización | `/agentes/4` | MoSCoW, WSJF, RICE o Valor/Esfuerzo |
| 5 · Planificación de sprints | `/agentes/5` | Distribución por capacidad, fechas, objetivos y dependencias |
| Dashboard | `/agentes/dashboard` | Métricas, resumen y exportación |
| Board | `/agentes/board` | Kanban de ejecución (Starter / Pro) |
| Proyectos | `/agentes/proyectos` | Gestión de proyectos del workspace |

Guía de uso en la app: `/manual`. Login: `/login` (Google y GitHub vía Firebase).

## Planes

Límites definidos en `lib/plans/definitions.ts`:

| | Free | Starter | Pro |
|--|------|---------|-----|
| Proyectos | 1 | 3 | 10 |
| Archivos | `.txt`, `.pdf` | + audio | + audio |
| Tablero Kanban | — | ✓ | ✓ |
| Export | Manual | Manual | Completo |
| GitHub Issues | — | — | ✓ |

## Estructura del repo

```
app/                 # Rutas (landing, login, agentes, API, legal, manual)
components/
  landing/           # Marketing
  agents/            # UI del pipeline, board, dashboard, export
  manual/            # Guía de uso
  ui/                # Primitivos compartidos
lib/
  adapters/          # Gemini / OpenAI / mocks por agente
  services/          # Lógica de negocio
  github/            # Export a GitHub
  export/            # JSON / Markdown / XLSX
  plans/             # Límites y guards por plan
  board/             # Utilidades Kanban
context/             # Auth, workspace, tema
hooks/
firestore.rules
```

## API relevantes

| Ruta | Rol |
|------|-----|
| `/api/agentes/1/upload` · `/analyze` · `/extract` | Agente 1 |
| `/api/agentes/2/generate` | Backlog |
| `/api/agentes/3/estimate` | Estimación |
| `/api/agentes/4/prioritize` | Priorización |
| `/api/agentes/5/plan` | Sprints |
| `/api/workspace` · `/api/projects` | Workspace y proyectos |
| `/api/github/connect` · `/repos` · `/projects` · `/export` | GitHub |

## Notas para desarrollo

- Este proyecto usa **Next.js 16** con cambios respecto a versiones anteriores. Consulta `node_modules/next/dist/docs/` y `AGENTS.md` antes de asumir APIs antiguas.
- Las reglas de Firestore están en `firestore.rules`.
- Version actual: **0.1.0 (MVP)**.
