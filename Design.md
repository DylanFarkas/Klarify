# Design.md — Klarify UI

Guía de diseño para el workspace y las secciones de producto.  
Úsala al construir o actualizar pantallas: **hub de proyectos**, **sidebar colapsable**, **vistas de trabajo** (backlog, tablero, stack), **agentes**, **modales de actividad**, **wizards** y listas HITL.

Referencias ya aplicadas:

| Área | Archivos clave |
| ---- | -------------- |
| Shell workspace | `AgentLayoutShell`, `WorkspaceSidebarChrome`, `WorkspaceSidebarNav`, `sidebar-styles.ts`, `ProjectSwitcher` |
| Backlog | `BacklogContent`, `DashboardSprintPlan`, `BacklogStoryRow`, `backlog-table-layout.tsx`, `BacklogStoryDetailPage` |
| Tablero | `BoardWorkspace`, `BoardFilters`, `KanbanBoard`, `KanbanColumn`, `KanbanCard`, `TeamPanel` |
| Stack | `StackContent`, `StackEmptyState`, `StackBoard`, `StackTechPicker` |
| Agente 1 | `app/agentes/1/page.tsx`, `FileUploader`, `ClarifyingQuestionsPanel`, `WishesList`, `WishItem`, `TranscriptionPanel` |
| Agente 2 | `app/agentes/2/page.tsx`, `EmptyBacklogState`, `BacklogView`, `EpicAccordion`, `UserStoryItem`, `UserStoryFormModal`, `WishesSummaryPanel` |
| Agente 3 | `app/agentes/3/page.tsx`, `EmptyPrioritizationState`, `EstimationWorkspace` |
| Agentes 4–5 | paneles en `components/agents/agent-*` (migrar al patrón A1/A2/A3) |
| Klark | `HarnessChatDock`, `HarnessChatPanel` (+ estilos `.harness-*` en `globals.css`) |
| Tokens | `app/agent-themes.css`, mapeo en `app/globals.css` |

---

## 0. Alcance: solo UI (regla crítica)

Este rediseño y cualquier trabajo que siga esta guía **cambia únicamente la interfaz y la experiencia visual**.

**No se debe alterar la lógica funcional del proyecto.**

| Permitido (UI) | Prohibido (lógica) |
| -------------- | ------------------ |
| Clases CSS / Tailwind, tokens, tipografía, espaciado | Cambiar handlers, efectos, condiciones de negocio |
| Estructura visual de JSX (wrappers, layout, orden visual) | Modificar APIs, adaptadores, servicios, Firestore |
| Estilos de botones, paneles, modales, sidebars | Cambiar validaciones, estados del pipeline, permisos |
| Copy cosmético de labels visuales si no cambia el significado | Renombrar flujos, IDs, contratos de datos, rutas de negocio |
| Densidad, anchos, hover, motion decorativa | Añadir/quitar features, reglas de plan, HITL o navegación de etapas |

Si hace falta tocar lógica para “que se vea bien”, **parar** y plantearlo aparte: este documento no autoriza refactors de negocio.

Al implementar: reutilizar los mismos props, callbacks, hooks y condiciones; solo reescribir presentación.

---

## 1. Principio rector

Klarify debe verse como un **producto SaaS de trabajo**: limpio, denso donde importa, legible y sin decoración innecesaria.

| Sí | No |
| -- | -- |
| Contraste y tipografía como jerarquía | Glow, sombras de neón, bordes animados |
| Dos registros: **display en el h1 de página** y **compacto dentro de paneles** | Un solo tamaño de título para todo el producto |
| Superficies planas y bordes finos (`border-border/60`) | Gradientes decorativos, glassmorphism pesado |
| CTAs en `foreground` / `background` | Botones primary con `shadow-[0_0_30px_…]` y `scale` |
| Un foco claro por pantalla | Dashboards con muchas stats en cards |
| Sidebar rail colapsable con iconos centrados | Sidebar fijo ancho sin transición |

---

## 2. Tokens y color

Usar siempre los tokens semánticos del tema (`agent-themes.css` → `@theme inline` en `globals.css`), no hex sueltos.

### Roles base

| Rol | Token / clase | Uso |
| --- | ------------- | --- |
| Fondo canvas | `bg-background` | Sidebar, grid decorativo, inputs de búsqueda en toolbar |
| Área de contenido | `bg-surface` | Main del shell, cards Kanban, modales |
| Superficie suave | `bg-surface-muted`, `bg-surface-hover` | Hover de filas, icon tiles, zonas inset |
| Elevación local | `bg-elevated` | Ítem activo del sidebar, chips seleccionados |
| Texto principal | `text-foreground` | Títulos y contenido principal |
| Texto alto contraste | `text-foreground-contrast` | Labels de nav inactivos en sidebar oscuro |
| Texto secundario | `text-muted` | Descripciones, subtítulos de página |
| Texto terciario | `text-subtle` | Labels de columna, meta, contadores |
| Cuerpo | `text-body` | Texto largo en formularios |
| Bordes | `border-border`, `border-border-strong` | Separadores (`/60` para sutileza), focus |
| Acento de marca | `text-primary` / `bg-primary` | **K** de Klarify, ítem nav activo, dots de estado |
| Inputs | `bg-input`, `border-input-border` | Campos de formulario |
| Éxito / peligro | `text-success`, `text-danger` | Estados, no decoración |
| Deshabilitado | `bg-disabled`, `text-disabled-text` | CTAs bloqueados |

**Regla CTAs:** el botón de acción principal del workspace usa:

```txt
bg-foreground text-background hover:opacity-90
```

Reservar `bg-primary` para Klark (FAB), links de acento y badges de tipo — no para el CTA “+ Nuevo ítem”.

### Superficies: sidebar vs contenido

| Zona | Fondo | Notas |
| ---- | ----- | ----- |
| Sidebar (`WorkspaceSidebarChrome`) | `bg-background` | Separado visualmente del main; borde `border-r border-border/50` |
| Main scroll (`AgentLayoutShell`) | `bg-surface` | Canvas opaco sobre el grid |
| Columnas Kanban | `bg-background/40` | Contraste sutil con cards `bg-surface` |

El canvas lleva `WorkspaceGridBackground`. Los paneles de contenido deben ser **opacos** (`bg-surface`); el grid no debe filtrarse a través de tablas o cards.

| Situación | Usar | Evitar |
| --------- | ---- | ------ |
| Panel / tabla / card | `bg-surface` sólido | `bg-surface-muted/40` en el contenedor principal |
| Hover de fila | `hover:bg-surface-hover/30` | Paneles semitransparentes completos |
| Backdrop de modal | `bg-background/70 backdrop-blur-sm` | — (excepción válida) |
| Header sticky (detalle HU) | `bg-surface/95 backdrop-blur-sm` | Header totalmente transparente |

---

## 3. Tipografía

Jerarquía en **dos registros** según contexto.

### Registro A — Pipeline de agentes (etapas 1–5)

El **h1 de página** usa el mismo display que backlog/tablero/stack. El cromo interno (paneles, wizard, listas) sigue compacto.

| Nivel | Clases típicas | Ejemplo |
| ----- | -------------- | ------- |
| Título de página | `text-[50px] font-semibold tracking-tight text-foreground` | Ingesta de Contexto, Backlog Inicial, Estimación en Story Points |
| Meta de página | `text-[12px] text-muted` | `Paso 1/6 · Captura · …` |
| Título de panel / wizard | `text-[15px] font-semibold tracking-tight` | Deseos del cliente, Afinemos tu proyecto |
| Cuerpo | `text-sm` / `text-[13px] text-muted` | Descripciones, contexto de apoyo |
| Meta / labels | `text-[11px]`–`text-[12px] text-subtle` | Contador de deseos, categoría |
| Contenido prioritario | `text-[15px] font-medium text-foreground` | Texto de un deseo |

Anchos: `max-w-3xl` en captura, empty y elección de modo; `max-w-5xl` en clarificación y revisión.

**No** usar `text-[50px]` dentro de paneles, empty states internos ni preguntas del wizard.

### Registro B — Vistas de trabajo (post-pipeline)

Títulos **display** + meta compacta. Patrón unificado en backlog, tablero y stack.

| Nivel | Clases | Ejemplo |
| ----- | ------ | ------- |
| Título display | `text-[50px] font-semibold tracking-tight text-foreground` | Backlog y Sprints, Tablero Kanban, Stack tecnológico |
| Subtítulo / meta | `text-[12px] text-muted` (+ `text-subtle` tabular para números) | `Proyecto · 3 sprints · 16 HU` |
| Breadcrumb / back | `text-[12px] font-medium text-subtle hover:text-foreground` | ← Dashboard |
| Headers de tabla | `text-[11px] font-medium uppercase tracking-[0.12em] text-subtle` | ID, HU, ÉPICA, SP |
| Fila HU | `text-sm font-medium text-foreground` | Título de historia |
| Épica secundaria | `text-[11px] text-subtle` | Nombre de épica |
| Labels de columna Kanban | `text-[13px] font-semibold tracking-tight` | To-Do, In Progress |
| Card Kanban título | `text-[13px] font-medium leading-snug` | Inicio de sesión |

Evitar: badges uppercase innecesarios, monospace en headings (sí en IDs de trabajo: `HU-003`, `font-mono text-[12px]`). En listas HITL de pipeline el número de fila basta; no repetir `DESEO-004` + índice.

---

## 4. Layout y densidad

### Shell del workspace

```
┌─────────────────────────────────────────────────────────┐
│ Sidebar (bg-background)  │  Main (bg-surface, scroll)  │
│  · Klarify + colapsar     │  · Header display + toolbar │
│  · Workspace nav          │  · Contenido (tabla/kanban) │
│  · Proyectos              │                             │
│  · Footer (settings…)     │                             │
└─────────────────────────────────────────────────────────┘
                                      [Klark FAB — fixed BR]
```

| Elemento | Medida / patrón |
| -------- | --------------- |
| Sidebar expandido | `w-61` (~244px), `p-2` |
| Sidebar colapsado | `w-16` — rail de iconos centrados |
| Transición sidebar | `duration-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)]` |
| Padding main (vistas trabajo) | `px-6 pt-3 pb-5`, gap `gap-4`–`gap-6` |
| Separador header | `border-b border-border/60 pb-3` |
| Ancho contenido | **Full width** en backlog/tablero/stack (sin `max-w-*`) |

### Sidebar — detalle (`sidebar-styles.ts`)

Fuente única de verdad para filas de nav. **No duplicar clases** fuera de este archivo.

| Constante | Uso |
| --------- | --- |
| `sidebarRowClass` | Grid `1.5rem \| 1fr` → colapsado `1.5rem \| 0fr`; `h-8`, `rounded-md`, `px-2` |
| `sidebarNavItemClass(isActive)` | Activo: `bg-elevated font-medium text-primary` · Inactivo: `text-foreground-contrast hover:bg-surface-hover` |
| `sidebarGroupLabelClass` | `text-xs font-medium text-subtle`, se oculta al colapsar |
| `sidebarIconSlotClass` | `size-6` centrado; iconos SVG `h-4 w-4` (`SIDEBAR_ICON_CLASS`) |
| `sidebarIconTileClass` | Tile de proyecto: `size-6 rounded bg-surface-muted text-[11px] font-semibold` |

Branding:

```tsx
<span className="text-primary">K</span>larify  // text-lg font-extrabold
```

Botón colapsar: icono panel en slot `size-6`, `text-subtle hover:bg-surface-hover`.

Secciones de nav: label “Workspace” + items; label “Proyectos” + `ProjectSwitcher`.

### Alineación número + texto (pipeline)

Cuando hay círculo/número + título (+ subtítulo):

```tsx
grid grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-x-2.5
// subtítulo en col-start-2
```

---

## 5. Vistas de trabajo

Patrones compartidos por **Backlog**, **Tablero** y **Stack** (`app/agentes/backlog|board|stack/page.tsx`).

### 5.1 Header de página

Fila superior: título display a la izquierda; toolbar a la derecha (wrap en mobile).

```tsx
<header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border/60 pb-3">
  <div>
    <h1 className="text-[50px] font-semibold tracking-tight text-foreground">…</h1>
    <p className="text-[12px] text-muted">…</p>
  </div>
  {/* toolbar: búsqueda, filtros, CTA */}
</header>
```

Tablero añade link “← Dashboard” (`text-[12px] text-subtle`) y barra de progreso (`h-1 rounded-full bg-border`, fill `bg-foreground/70`).

### 5.2 Toolbar / filtros

| Control | Patrón |
| ------- | ------ |
| Búsqueda | `rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-[12px]` + icono lupa absoluto |
| Filtro secundario | `rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-muted hover:bg-surface-hover` |
| CTA primario | `rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-background` |
| Selects (tablero) | `rounded-lg border border-border bg-surface px-3 py-2 text-sm` |

Contador en botones: `tabular-nums text-subtle` junto al label.

### 5.3 Backlog — tabla densa

Referencia: `backlog-table-layout.tsx`, `BacklogStoryRow`.

| Aspecto | Patrón |
| ------- | ------ |
| Contenedor | `@container`, scroll horizontal, `min-w-[72rem]` |
| Columnas | Responsive con `@lg`, `@2xl`, `@3xl` (ver `BacklogStoriesTableColGroup`) |
| thead | Uppercase `tracking-[0.12em]`, sin fondo propio |
| Filas | `border-b border-border/60`, `hover:bg-surface-hover/30` |
| Drag handle | Icono `text-subtle/60`, `hover:bg-surface-muted` |
| ID | `WorkItemIdLabel` — pill tintado por tipo (story/bug/task) |
| Links HU | `text-sm font-medium hover:text-primary` |
| Controles inline | `DropdownSelect` / `ExecutionStatusSelect` en pills compactos |
| Acciones | Iconos discretos; eliminar con confirm |

**Badges de tipo** (`WorkItemTypeBadge`):

| Tipo | Color |
| ---- | ----- |
| Historia | `bg-primary/12 text-primary` |
| Bug | `bg-red-500/12 text-red-400` |
| Task | `bg-sky-500/12 text-sky-400` |

**Estados de ejecución** (`ExecutionStatusBadge`): pill `rounded-full border` con tinte por columna Kanban (slate / blue / amber / emerald).

### 5.4 Tablero Kanban

Referencia: `KanbanColumn`, `KanbanCard`.

| Aspecto | Patrón |
| ------- | ------ |
| Columnas | `w-70 shrink-0 rounded-xl bg-background/40`; header con dot de estado + contador + SP total |
| Dots columna | todo → `bg-subtle`, in_progress → `bg-primary`, code_review → warning, done → green |
| Cards | `rounded-lg bg-surface p-4`, hover `bg-surface-hover/30`, sin borde grueso |
| Card header | ID `text-[12px] text-subtle` + `WorkItemTypeBadge` + título `text-[13px] font-medium` |
| Card footer | SP en pill `border-border/60`, prioridad con dot de color, avatar circular |
| Equipo | `TeamPanel` — avatares con iniciales y color de miembro |
| Empty | `BoardEmptyState` centrado, copy calmado |

### 5.5 Stack tecnológico

Referencia: `StackContent`, `StackEmptyState`.

| Estado | Patrón |
| ------ | ------ |
| Empty | Centrado `max-w-lg`, icono en `h-12 w-12 rounded-md bg-surface-muted`, título `text-[15px] font-semibold` |
| CTAs empty | Primario `bg-foreground` · Secundario `bg-surface-muted text-muted hover:bg-surface-hover` |
| Con contenido | `StackBoard` por capas; picker en modal; guardado con debounce |

### 5.6 Detalle de historia

Referencia: `BacklogStoryDetailPage`, `BacklogStoryDetailHeader`.

| Aspecto | Patrón |
| ------- | ------ |
| Header | Sticky `top-0 z-10 border-b bg-surface/95 backdrop-blur-sm px-4 md:px-6 py-2` |
| Breadcrumb | `Backlog › Sprint › HU-009` — links `text-muted hover:text-foreground` |
| Navegación | Flechas anterior/siguiente `size-7 rounded-md`; contador `1 / 16` |
| Layout cuerpo | Dos columnas: contenido (descripción, criterios) + sidebar propiedades |
| Guardar | CTA fijo al pie del formulario: `bg-foreground text-background rounded-lg` |

### 5.7 Agente 1 — Ingesta de contexto

Referencia para el resto del pipeline. Página: `app/agentes/1/page.tsx`.

**Header de página** (todas las fases):

```tsx
<header className="shrink-0 pb-3">
  <h1 className="text-[50px] font-semibold tracking-tight text-foreground">Ingesta de Contexto</h1>
  <p className="mt-1 text-[12px] text-muted">Paso 1/6 · Captura · …</p>
</header>
```

Sin `AgentPageHero`. El empty state / panel queda **justo debajo** del header (no centrado en el viewport).

#### Captura (`FileUploader`)

Empty state al estilo Stack, no dropzone gigante + 3 cards:

| Pieza | Patrón |
| ----- | ------ |
| Contenedor | `max-w-lg` centrado, `py-8`; borde transparente; al arrastrar `border-dashed border-primary/40` |
| Icono | `h-12 w-12 rounded-md bg-surface-muted` |
| Título interno | `text-[15px] font-semibold` — *Comparte el contexto del proyecto* |
| CTAs | Primario **Escribir texto** (`bg-foreground`) · Secundario **Grabar audio** (`bg-surface-muted`) |
| Archivo | Enlace `text-[12px] text-subtle` debajo, no CTA principal (la carga puede estar en prueba) |
| Grabación / proceso | Panel opaco o spinner `border-t-foreground`; barra `h-1 bg-foreground/70` |

#### Edición de texto

Panel `rounded-xl border bg-surface`: título `15px`–`20px`, textarea `bg-input`, pie con hint a la izquierda y acciones a la derecha (secundario muted + primario foreground).

#### Clarificación (`ClarifyingQuestionsPanel`)

| Pieza | Patrón |
| ----- | ------ |
| Header del card | Meta `4 preguntas` / `1 / 4` / `Revisión` + **Saltar** + barra `h-1` |
| Intro | Sin sidebar interno. Título `15px`, resumen, gaps como **lista** `border-t` (no grid de cards) |
| Preguntas | Stepper lateral solo desde la 1.ª pregunta: categoría, sin repetir el enunciado. Activo `bg-elevated` |
| Opciones | Filas con check circular `foreground`, `border-t`, no cards |
| Revisión del wizard | Lista; **Editar** al hover |

#### Revisión de deseos (`WishesList` + `TranscriptionPanel`)

Foco: **leer y aprobar deseos**. El contexto es apoyo.

```
┌─────────────────────────────┬──────────────────┐
│ Deseos (1.75fr, izquierda)  │ Contexto (1fr)   │
└─────────────────────────────┴──────────────────┘
```

| Pieza | Patrón |
| ----- | ------ |
| Grid | `lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] items-start` — deseos primero en el DOM |
| Lista | Sin `max-h` interno: scrollea la página. Filas `border-t`, hover `bg-surface-hover/30` |
| Fila deseo | `grid-cols-[1.25rem_minmax(0,1fr)_auto]` — índice + texto `15px font-medium`. Meta Manual/Editado solo si aplica. Acciones al hover a la derecha |
| Contexto | Título `text-[13px] text-muted`. Respuestas en pares categoría → valor, sin repetir la pregunta |
| CTA | Pie de página: **Empezar de nuevo** muted + **Aprobar deseos y continuar** foreground |

### 5.8 Agente 2 — Backlog inicial

Misma familia que A1. Página: `app/agentes/2/page.tsx`.

**Header de página** (todas las fases):

```tsx
<header className="shrink-0 pb-3">
  <h1 className="text-[50px] font-semibold tracking-tight text-foreground">Backlog Inicial</h1>
  <p className="mt-1 text-[12px] text-muted">Paso 2/6 · Estructura · …</p>
</header>
```

Sin `AgentPageHero`. En revisión, una segunda línea de meta `12px` con conteos (`N épicas · M historias`) y `Aprobado` en `text-success` si aplica. Anchos: `max-w-3xl` en empty/generación; `max-w-5xl` en revisión.

#### Empty (`EmptyBacklogState`)

Como captura A1 / Stack: `max-w-lg` centrado, `py-8`, borde transparente, icono `h-12 w-12 rounded-md bg-surface-muted`, título `15px`. CTA **Generar Backlog** (`foreground`) o secundario **Volver al Agente 1** (`bg-surface-muted`).

#### Revisión (`BacklogView` + `WishesSummaryPanel`)

Foco: **leer y aprobar el backlog**. Los deseos son apoyo.

```
┌─────────────────────────────┬──────────────────┐
│ Backlog (1.75fr, izquierda) │ Deseos (1fr)     │
└─────────────────────────────┴──────────────────┘
```

| Pieza | Patrón |
| ----- | ------ |
| Grid | `lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] items-start` — backlog primero en el DOM |
| Lista | Sin `max-h` interno: scrollea la página. **Divisor entre épicas** (`border-t border-border/60`), **no entre HUs** |
| Épica | Encabezado `15px font-semibold` + chevron; descripción `13px muted`; meta `N historias`. Arranca **colapsada**. **Añadir historia** solo en el header de la épica (no al pie de la lista) |
| HU | Indentada (`ml-8` / `md:ml-11`). Índice + título `13px font-medium` + descripción `13px muted`. Meta Manual/Editado/criterios solo si aplica. Sin IDs `EPIC-001` / `HU-001 · IA` |
| Acciones de fila | Iconos (ojo / lápiz / papelera), `p-1.5`, `aria-label` + `title`. Hover en desktop. Peligro: `hover:text-danger` |
| Deseos | Como contexto A1: `bg-background/40`, título `13px text-muted`, texto `13px muted` |
| Alta / edición HU | `UserStoryFormModal` sobre `DetailModal` (mismo shell que `DashboardStoryFormModal`): título, descripción, criterios. No formulario inline |
| CTA | Pie `border-t`: **Regenerar** muted + **Aprobar backlog y continuar** foreground |

#### Acordeón (`EpicAccordion`)

Altura con CSS, sin librería de animación:

```tsx
grid transition-[grid-template-rows] duration-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)]
// abierto: grid-rows-[1fr] · cerrado: grid-rows-[0fr]
// hijo: min-h-0 overflow-hidden + fade de opacity
```

Chevron con el mismo easing. Respetar `motion-reduce:transition-none`.

### 5.9 Agente 3 — Estimación

Misma familia que A1/A2. Página: `app/agentes/3/page.tsx`.

**Header de página** (todas las fases):

```tsx
<header className="shrink-0 pb-3">
  <h1 className="text-[50px] font-semibold tracking-tight text-foreground">Estimación en Story Points</h1>
  <p className="mt-1 text-[12px] text-muted">Paso 3/6 · Medición · …</p>
</header>
```

Sin `AgentPageHero`. El empty / panel queda **justo debajo** del header. En revisión, una segunda línea de meta `12px` con conteos (`N épicas · M historias · total SP o tiempo`) y `Aprobado` en `text-success` si aplica. Anchos: `max-w-3xl` en empty y elección de modo; `max-w-5xl` en revisión.

El **foco** es el esfuerzo de cada historia. Todo lo demás (razonamiento, IDs, barras) es apoyo o se omite.

#### Empty sin backlog (`EmptyPrioritizationState`)

Como A2 / Stack: `max-w-lg` centrado, `py-8`, borde transparente, icono `h-12 w-12 rounded-md bg-surface-muted`, título `15px`. CTA **Volver al Agente 2** (`bg-surface-muted`).

#### Elección de modo (antes de estimar)

No hay “workspace” en caja. Empty compacto bajo el h1, como captura A1:

| Pieza | Patrón |
| ----- | ------ |
| Contenedor | `max-w-lg` centrado, `py-8`, `border-transparent` |
| Icono | `h-12 w-12 rounded-md bg-surface-muted` |
| Título interno | `text-[15px] font-semibold` — *Elige cómo estimar* |
| Modos | Dos chips: **Story Points** / **Tiempo**. Idle `bg-surface-muted`; seleccionado `bg-elevated`. No cards bordeadas ni invertido blanco |
| CTA | **Sugerir Story Points con IA** (o tiempos) `foreground`, compacto, no a todo el ancho. Deshabilitado hasta elegir modo |
| Meta | Una línea `12px text-subtle`: conteos + escala o “Selecciona un modo para continuar” |

#### Revisión (`EstimationWorkspace`)

Foco: **leer y ajustar el esfuerzo**. Lista al estilo Backlog A2, sin columna extra de razonamiento.

```
Estimaciones  N                    3/3 · 9 SP
─────────────────────────────────────────────
Épica                              9 SP
  HU  título…                      3 SP · Media
                                   [1 2 3 5 8 13 21]
```

| Pieza | Patrón |
| ----- | ------ |
| Panel | Como `BacklogView`: `rounded-xl bg-surface`, **sin borde exterior**. Header `15px` + contador. A la derecha, meta compacta `N/N · total` (`12px tabular-nums`). Sin barra de progreso |
| Lista | Sin `max-h` interno. **Divisor entre épicas** (`border-t border-border/60`), **no entre HUs**. Sin `bg-surface-muted` anidado |
| Épica | Título `15px font-semibold`; descripción `13px muted` si hay; meta `N/N estimadas`. Esfuerzo del grupo a la derecha `13px font-medium tabular-nums`. Sin IDs `EPIC-001`. Sin acordeón: las HUs quedan visibles (el trabajo es estimar) |
| HU | Indentada (`ml-8` / `md:ml-11`). Índice + título `13px font-medium` + descripción `13px muted`. Razonamiento IA como línea `12px text-subtle` (`line-clamp-2`), **no caja**. Meta `Ajustado` solo si aplica. Sin IDs `HU-001` |
| Esfuerzo | Columna derecha (`shrink-0`): valor `12px font-medium` (`3 SP · Media` o duración) + control. En mobile, debajo del texto con el mismo indent |
| Fibonacci | Seleccionado `bg-foreground text-background`. Idle sin borde: `text-muted hover:bg-surface-hover`. El valor elegido es el único relleno |
| Tiempo | `TimeDurationInput` (`bg-input`); la etiqueta de duración hace de valor |
| Acciones de fila | Ojo (`p-1.5`, `aria-label`) al hover; detalle en `DetailModal` |
| CTA | Pie `border-t`: **Regenerar** muted + **Consolidar backlog estimado** foreground |

---

## 6. Componentes transversales

### Botones

| Tipo | Patrón |
| ---- | ------ |
| Primario | `rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90` |
| Secundario | `rounded-lg bg-surface-muted px-4 py-2 text-sm font-medium text-muted hover:bg-surface-hover hover:text-foreground` |
| Secundario outline | `rounded-lg border border-border … text-muted hover:bg-surface-hover` |
| Deshabilitado | `bg-disabled text-disabled-text opacity-40` |
| Peligro | Texto/`hover` en rojo suave; no bordes rojos por defecto |

Radios: `rounded-md` (sidebar, chips) · `rounded-lg` (botones, inputs, cards) · `rounded-xl` (columnas, modales).

Evitar: `shadow-[0_0_*px_primary]`, `hover:scale-*`, `py-4 text-base font-bold` en CTAs.

### Paneles / listas (pipeline)

- Panel = `rounded-xl border border-border bg-surface` (opaco)
- Listas: contenedor + filas `border-t`, no card por ítem
- Hover fila: `hover:bg-surface-hover/30`
- Acciones secundarias: iconos con `aria-label` (o texto al hover en listas simples); `opacity-0 group-hover:opacity-100` en desktop
- Empty states: compactos, CTA `foreground`/`background`, sin blur orbs
- Jerarquía agrupada (épicas → HUs): divisor entre **grupos**, no entre hijos

### Formularios

- Inputs: `rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-border-strong`
- Opciones wizard: filas `border-t` + check circular en `foreground` (no card por opción)

### Klark (asistente)

- FAB fijo: clase `.harness-fab` — `bg-primary`, esquina inferior derecha, label “Klark”
- Panel dock: `.harness-dock` / `.harness-dock__panel` — sin glow (`.harness-fab__glow { display: none }`)
- Apertura programática vía `KlarkControlContext`

### Modales

- Shell: `DetailModal` (`rounded-xl` / `rounded-2xl`, `border-border`, `bg-surface`)
- Backdrop: `bg-background/70 backdrop-blur-sm`
- Formularios de alta/edición (HU en A2, ítems del dashboard): label `12px text-muted`, pie Cancelar muted + Guardar `foreground`
- Spinner: anillo fino `border-border border-t-foreground`

---

## 7. Jerarquía de contenido

| Vista | Foco |
| ----- | ---- |
| Captura (A1) | Empty state (escribir / grabar / arrastrar), debajo del h1 |
| Clarificación | Pregunta actual + opciones en lista; intro sin sidebar |
| Revisión deseos | Lista de deseos a la izquierda (más ancha); contexto muted a la derecha |
| Revisión backlog (A2) | Épicas e historias a la izquierda (más ancha); deseos muted a la derecha |
| Estimación (A3) | Empty de modo o lista de esfuerzo (SP/tiempo a la derecha); razonamiento muted |
| Priorización (A4) | Workspace + selector metodología |
| Sprints (A5) | Config + board de sprints |
| **Backlog** (`/agentes/backlog`) | Tabla densa + toolbar; detalle HU en página dedicada |
| **Tablero** (`/agentes/board`) | Columnas Kanban + filtros + equipo |
| **Stack** (`/agentes/stack`) | Capas tecnológicas o empty state centrado |
| Hub proyectos | Lista densa; stats en meta, no cards |
| Dashboard | Franja de salud + backlog jerárquico; sin `AgentPageHero` |

Si algo es secundario: tipografía más pequeña, `text-muted`/`text-subtle` — **no** bajar opacidad del panel entero.

---

## 8. Motion

Animar con **CSS / Tailwind**, no con Framer Motion ni otra librería, salvo que aparezcan casos de layout animation (reordenación Kanban, shared element). Hasta entonces el coste no se justifica.

- Entradas vistas trabajo y pipeline: `animate-[fadeIn_0.3s_ease-out]`
- Sidebar y acordeones: `width` / `grid-template-columns` / `grid-template-rows` / `opacity` — `motion-reduce:transition-none`
- Ease compartido: `cubic-bezier(0.16, 1, 0.3, 1)` @ 380ms
- Loaders: spinner fino o 3 puntos
- No animar bordes, escalas de botones ni barras sticky

---

## 9. Branding

En sidebar del producto:

```tsx
<span className="text-primary">K</span>larify
```

- Link de marca → `/agentes/proyectos`
- Subtítulo opcional (`brandSubtitle`): `text-[10px] uppercase tracking-[0.14em] text-subtle` — solo cuando el shell lo pasa
- No monograma-en-caja en el shell principal

---

## 10. Checklist al implementar

1. ¿**Solo toqué UI**? ¿Handlers, estado, APIs intactos?
2. ¿Usa tokens semánticos y no colores inventados?
3. ¿Sidebar usa `sidebar-styles.ts`? ¿Nav activo = `bg-elevated text-primary`?
4. ¿Main content es `bg-surface` opaco?
5. ¿Vista post-pipeline usa título display `text-[50px]` + subtítulo `text-[12px]`?
6. ¿CTA principal es `foreground`/`background` sin glow?
7. ¿Toolbar alineada con el header (búsqueda, filtros, acción)?
8. ¿Tabla backlog usa `backlog-table-layout` y container queries?
9. ¿Cards Kanban son `bg-surface` sobre columnas `bg-background/40`?
10. ¿Badges de tipo/estado usan tintes (`primary/12`, `red-500/12`) y no colores sólidos chillones?
11. ¿Klark FAB usa `.harness-fab` con `primary`?
12. ¿Pipeline usa h1 display `text-[50px]` y paneles internos compactos (`15px`)?
13. ¿Captura A1 es empty state (no dropzone + 3 cards)? ¿Revisión pone deseos a la izquierda, más anchos?
14. ¿A2 pone el backlog a la izquierda, más ancho? ¿Épicas colapsadas al generar? ¿HU en `DetailModal`? ¿Divisor entre épicas, no entre HUs?
15. ¿A3 empty es elección de modo (chips + CTA compacto), no un panel “Workspace” con cards? ¿Revisión pone el esfuerzo a la derecha, sin IDs ni caja de razonamiento?

Si algo no encaja, mirar primero los archivos de la tabla de referencias al inicio.

---

## 11. Qué no portar del diseño anterior

- `AgentPageHero` con blur orbs, pills “Paso 01 - 06” y card grande
- Pipeline con círculos `h-9` y conectores verticales gruesos
- Sidebar fijo `w-64` con branding centrado y `bg-surface`
- Nav activo con solo `bg-surface-hover` sin acento `text-primary`
- Dropzone `h-[min(400px,55vh)]` + tres cards de método duplicando el CTA
- Wizard de clarificación con sidebar en el intro, gaps en cards y `min-h` vacío
- Revisión con dos columnas del mismo peso, IDs `DESEO-004` / `EPIC-001` / `HU-001 · IA` + índice, y `max-h` que recorta la lista
- A2 con wishes a la izquierda más estrechos, cards anidadas de HU, formularios inline de historia y **Añadir HU** al pie de cada lista
- A3 con `AgentPageHero`, panel “Workspace de estimación” bordeado, cards de modo lado a lado, CTA a todo el ancho, IDs `EPIC-001` / `HU-001`, caja “Razonamiento IA”, barra de progreso en el header de lista y divisor entre HUs
- Ver / Editar / Eliminar en texto en filas HITL (usar iconos con `aria-label`)
- Divisores entre HUs dentro de una épica; el corte visual va **entre épicas**
- Modal de actividad con gradient animado
- ApproveButton / GenerateBacklogButton con sombra primary y `hover:scale`
- Barras `sticky bottom-6` con glass sobre contenido
- Paneles `bg-surface-muted/40` como superficie principal
- Cards anidadas con fondos distintos para diferenciar ítems
- Títulos `text-xl` en h1 de página que deberían ser display `text-[50px]`
- `text-[50px]` dentro de un panel, wizard o empty state interno
- Añadir Framer Motion (o similar) para un acordeón o un fade; usar CSS con el ease del sidebar

---

*Documento vivo: actualizar cuando se consoliden patrones nuevos del workspace.*
