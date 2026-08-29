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
| Agentes 1–5 | paneles en `components/agents/agent-*` |
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
| Dos registros tipográficos: **compacto** (pipeline) y **display** (vistas de trabajo) | Un solo tamaño de título para todo el producto |
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

Compacto, sin títulos display.

| Nivel | Clases típicas | Ejemplo |
| ----- | -------------- | ------- |
| Título de página | `text-xl`–`text-2xl font-semibold tracking-tight` | Ingesta de Contexto |
| Título de panel | `text-[15px] font-semibold tracking-tight` | Deseos del cliente |
| Cuerpo | `text-sm` / `text-[13px] text-muted` | Descripciones |
| Meta / labels | `text-xs` / `text-[11px]`–`text-[12px] text-subtle` | Paso 1/6, timestamps |
| Contenido prioritario | `text-[15px] font-medium text-foreground` | Texto de un deseo |

Ancho preferido: `max-w-3xl` (foco) o `max-w-5xl` (comparación).

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

Evitar en pipeline: `text-[50px]`, badges uppercase innecesarios, monospace en headings (sí en IDs: `HU-003`, `font-mono text-[12px]`).

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
- Hover fila: `hover:bg-surface-hover/40`
- Acciones secundarias: `opacity-0 group-hover:opacity-100` en desktop
- Empty states: compactos, CTA `foreground`/`background`, sin blur orbs

### Formularios

- Inputs: `rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-border-strong`
- Opciones wizard: fila con borde + check circular en `foreground`

### Klark (asistente)

- FAB fijo: clase `.harness-fab` — `bg-primary`, esquina inferior derecha, label “Klark”
- Panel dock: `.harness-dock` / `.harness-dock__panel` — sin glow (`.harness-fab__glow { display: none }`)
- Apertura programática vía `KlarkControlContext`

### Modales

- Shell: `rounded-xl border border-border bg-surface`
- Backdrop: `bg-background/70 backdrop-blur-sm`
- Spinner: anillo fino `border-border border-t-foreground`

---

## 7. Jerarquía de contenido

| Vista | Foco |
| ----- | ---- |
| Captura (A1) | Dropzone + 3 métodos |
| Clarificación | Pregunta actual + opciones |
| Revisión deseos | Lista de deseos (más ancha) |
| Backlog (A2) / Backlog workspace | Tabla de HUs + planificación sprints |
| Estimación (A3) | Workspace de estimación |
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

- Entradas vistas trabajo: `animate-[fadeIn_0.3s_ease-out]`
- Sidebar: solo `width`, `grid-template-columns`, `opacity` — respetar `motion-reduce:transition-none`
- Sidebar ease: `cubic-bezier(0.16, 1, 0.3, 1)` @ 380ms
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
12. ¿Pipeline de agentes sigue en registro compacto (`max-w-3xl`)?

Si algo no encaja, mirar primero los archivos de la tabla de referencias al inicio.

---

## 11. Qué no portar del diseño anterior

- `AgentPageHero` con blur orbs, pills “Paso 01 - 06” y card grande
- Pipeline con círculos `h-9` y conectores verticales gruesos
- Sidebar fijo `w-64` con branding centrado y `bg-surface`
- Nav activo con solo `bg-surface-hover` sin acento `text-primary`
- Dropzone `h-[min(400px,55vh)]` + cards con `scale-110`
- Modal de actividad con gradient animado
- ApproveButton / GenerateBacklogButton con sombra primary y `hover:scale`
- Barras `sticky bottom-6` con glass sobre contenido
- Paneles `bg-surface-muted/40` como superficie principal
- Cards anidadas con fondos distintos para diferenciar ítems
- Títulos `text-xl` en vistas de trabajo que deberían ser display

---

*Documento vivo: actualizar cuando se consoliden patrones nuevos del workspace.*
