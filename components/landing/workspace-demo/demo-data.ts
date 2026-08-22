export type DemoView = "projects" | "backlog" | "stack" | "board";

export const DEMO_USER = {
  name: "Alex Rivera",
  initials: "AR",
} as const;

export const DEMO_PROJECTS = [
  {
    id: "aurora",
    name: "Aurora",
    pipelineLabel: "Dashboard",
    completionPercentage: 100,
    status: "active" as const,
    relativeAge: "5m",
  },
  {
    id: "northstar",
    name: "Northstar",
    pipelineLabel: "Stack",
    completionPercentage: 92,
    status: "active" as const,
    relativeAge: "2h",
  },
  {
    id: "pulse",
    name: "Pulse",
    pipelineLabel: "Backlog",
    completionPercentage: 78,
    status: "active" as const,
    relativeAge: "1d",
  },
  {
    id: "harbor",
    name: "Harbor",
    pipelineLabel: "Estimación",
    completionPercentage: 45,
    status: "active" as const,
    relativeAge: "3d",
  },
  {
    id: "beacon",
    name: "Beacon",
    pipelineLabel: "Alcance",
    completionPercentage: 20,
    status: "active" as const,
    relativeAge: "5d",
  },
] as const;

export const DEMO_ACTIVE_PROJECT = DEMO_PROJECTS[0];

export const DEMO_STORIES = [
  {
    id: "HU-001",
    title: "Registro de usuario con email y contraseña",
    epic: "Autenticación de usuarios",
    effort: "2h",
    priority: "Must",
    status: "TO-DO",
    column: "todo" as const,
  },
  {
    id: "HU-002",
    title: "Inicio de sesión con email y contraseña",
    epic: "Autenticación de usuarios",
    effort: "2h",
    priority: "Must",
    status: "TO-DO",
    column: "todo" as const,
  },
  {
    id: "HU-003",
    title: "Creación de sala privada",
    epic: "Gestión de salas",
    effort: "4h",
    priority: "Must",
    status: "TO-DO",
    column: "todo" as const,
  },
  {
    id: "HU-004",
    title: "Generación de enlace de invitación",
    epic: "Gestión de salas",
    effort: "3h",
    priority: "Must",
    status: "TO-DO",
    column: "todo" as const,
  },
  {
    id: "HU-005",
    title: "Unión a una partida mediante enlace",
    epic: "Gestión de salas",
    effort: "4h",
    priority: "Should",
    status: "TO-DO",
    column: "todo" as const,
  },
  {
    id: "HU-006",
    title: "Tablero de ajedrez interactivo",
    epic: "Juego en tiempo real",
    effort: "6h",
    priority: "Must",
    status: "TO-DO",
    column: "todo" as const,
  },
  {
    id: "HU-007",
    title: "Sincronización de movimientos en vivo",
    epic: "Juego en tiempo real",
    effort: "1d",
    priority: "Must",
    status: "TO-DO",
    column: "in_progress" as const,
  },
  {
    id: "HU-008",
    title: "Historial de partidas del jugador",
    epic: "Perfil y progreso",
    effort: "4h",
    priority: "Could",
    status: "TO-DO",
    column: "todo" as const,
  },
] as const;

export const DEMO_BACKLOG_META = {
  sprintCount: 1,
  backlogCount: DEMO_STORIES.length,
  storyCount: DEMO_STORIES.length,
  epicCount: 4,
  effortTotal: "3d 2h",
} as const;

export const DEMO_BOARD_COLUMNS = [
  { id: "todo" as const, label: "To-Do", dotClass: "bg-subtle", effort: "2d 5h" },
  { id: "in_progress" as const, label: "In Progress", dotClass: "bg-primary", effort: "1d" },
  { id: "code_review" as const, label: "Code Review", dotClass: "bg-[var(--sileo-state-warning)]", effort: "0m" },
  { id: "done" as const, label: "Done", dotClass: "bg-green-500", effort: "0m" },
] as const;

export const DEMO_STACK_LAYERS = [
  {
    label: "Frontend",
    items: [
      { catalogId: "react", name: "React", primary: true },
      { catalogId: "typescript", name: "TypeScript", primary: false },
    ],
  },
  {
    label: "Backend",
    items: [
      { catalogId: "supabase-baas", name: "Supabase", primary: true },
      { catalogId: "supabase-edge-functions", name: "Supabase Edge Functions", primary: false },
      { catalogId: "deno", name: "Deno", primary: false },
    ],
  },
  {
    label: "Datos",
    items: [
      { catalogId: "supabase-db", name: "Supabase Postgres", primary: false },
      { catalogId: "postgresql", name: "PostgreSQL", primary: true },
    ],
  },
  {
    label: "Autenticación",
    items: [{ catalogId: "supabase-auth", name: "Supabase Auth", primary: false }],
  },
  {
    label: "Infraestructura",
    items: [
      { catalogId: "vercel", name: "Vercel", primary: false },
      { catalogId: "supabase", name: "Supabase", primary: false },
    ],
  },
  {
    label: "Estilos",
    items: [{ catalogId: "tailwindcss", name: "Tailwind CSS", primary: false }],
  },
  {
    label: "ORM / acceso a datos",
    items: [{ catalogId: "supabase", name: "Supabase", primary: false }],
  },
  {
    label: "Tiempo real",
    items: [{ catalogId: "supabase-realtime", name: "Supabase Realtime", primary: false }],
  },
] as const;

export const DEMO_STACK_META = {
  productKind: "web_app",
  architecturePattern: "SPA + Backend-as-a-Service (Supabase)",
  rationale:
    "SPA con React y TypeScript para iterar rápido la UI del tablero. Supabase cubre auth, Postgres y realtime sin montar un backend propio, y Vercel despliega el frontend con previews por PR. Encaja con un MVP de salas privadas y partidas en vivo.",
} as const;

export const DEMO_KLARK = {
  userMessage: "Dame un resumen del proyecto Aurora",
  userTime: "21:26",
  thinkingLabel: "Pensando",
  thinkingStep:
    "The user asks for a project summary. I should outline scope, backlog size, stack and next steps in Spanish.",
  reply:
    "Aurora es un MVP de salas privadas y partidas en vivo. Tienes 8 HU en backlog (Must/Should), stack SPA + Supabase listo, y el tablero arranca con casi todo en To-Do. Siguiente paso natural: mover autenticación a In Progress y abrir el primer sprint.",
} as const;

export const DEMO_VIEW_ORDER: DemoView[] = ["projects", "backlog", "stack", "board"];
