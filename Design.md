# Design.md — Klarify UI

Guía de diseño para el workspace y las secciones de producto a partir del rediseño SaaS (estilo Cursor / Linear).  
Úsala al construir o actualizar pantallas: **hub de proyectos**, **sidebar**, **agentes**, **modales de actividad**, **wizards** y listas HITL.

Referencias ya aplicadas: `WorkspaceHomeShell`, `AgentLayoutShell`, `ProjectsHub`, Agente 1 (`FileUploader`, `ClarifyingQuestionsPanel`, `WishesList`, `TranscriptionPanel`, activity log), Agente 2 (`EmptyBacklogState`, `BacklogView`, `WishesSummaryPanel`, épicas / HUs), Agente 3 (`EmptyPrioritizationState`, `EstimationWorkspace`), Agente 4 (`EmptyPrioritizationStartState`, `PrioritizationWorkspace`, `FrameworkSelector`), Agente 5 (`EmptySprintPlanningStartState`, `SprintPlanningWorkspace`, `SprintBoard`, `SprintTimeline`), Tablero (`BoardWorkspace`, `KanbanBoard`, `KanbanColumn`, `KanbanCard`, `BoardFilters`, `TeamPanel`), Klark (`HarnessChatPanel`, `HarnessChatDock`), Configuración (`WorkspaceSettingsModal`, `ThemeSettingsPanel`, `AiProviderConnectionPanel`, `GitHubConnectionPanel`).

---

## 0. Alcance: solo UI (regla crítica)

Este rediseño y cualquier trabajo que siga esta guía **cambia únicamente la interfaz y la experiencia visual**.

**No se debe alterar la lógica funcional del proyecto.**


| Permitido (UI)                                                | Prohibido (lógica)                                                  |
| ------------------------------------------------------------- | ------------------------------------------------------------------- |
| Clases CSS / Tailwind, tokens, tipografía, espaciado          | Cambiar handlers, efectos, condiciones de negocio                   |
| Estructura visual de JSX (wrappers, layout, orden visual)     | Modificar APIs, adaptadores, servicios, Firestore                   |
| Estilos de botones, paneles, modales, sidebars                | Cambiar validaciones, estados del pipeline, permisos                |
| Copy cosmético de labels visuales si no cambia el significado | Renombrar flujos, IDs, contratos de datos, rutas de negocio         |
| Densidad, anchos (`max-w-*`), hover, motion decorativa        | Añadir/quitar features, reglas de plan, HITL o navegación de etapas |


Si hace falta tocar lógica para “que se vea bien”, **parar** y plantearlo aparte: este documento no autoriza refactors de negocio.

Al implementar: reutilizar los mismos props, callbacks, hooks y condiciones; solo reescribir presentación.

---

## 1. Principio rector

Klarify debe verse como un **producto SaaS de trabajo**: limpio, denso, legible y sin decoración innecesaria.


| Sí                                    | No                                                  |
| ------------------------------------- | --------------------------------------------------- |
| Contraste y tipografía como jerarquía | Glow, sombras de neón, bordes animados              |
| Densidad compacta con aire suficiente | Cards gigantes, paddings de marketing               |
| Superficies planas y bordes finos     | Gradientes decorativos, glassmorphism pesado        |
| CTAs en `foreground` / `background`   | Botones primary con `shadow-[0_0_30px_…]` y `scale` |
| Un foco claro por pantalla            | Dashboards con muchas stats en cards                |


---

## 2. Tokens y color

Usar siempre los tokens semánticos del tema (`agent-themes.css`), no hex sueltos.


| Rol              | Token / clase                          | Uso                                                     |
| ---------------- | -------------------------------------- | ------------------------------------------------------- |
| Fondo página     | `bg-background`                        | Canvas principal (+ grid decorativo del shell)          |
| Superficie       | `bg-surface`                           | Sidebar, **todos** los paneles de contenido, listas     |
| Superficie suave | `bg-surface-muted`, `bg-surface-hover` | Hover de filas, zonas inset *dentro* de un panel sólido |
| Texto            | `text-foreground`                      | Títulos y contenido principal                           |
| Texto secundario | `text-muted`                           | Descripciones                                           |
| Texto terciario  | `text-subtle`                          | Labels, meta, timestamps, contadores de panel           |
| Bordes           | `border-border`, `border-border-strong`| Separadores y focus                                     |
| Acento de marca  | `text-primary` / `bg-primary`          | Solo la **K** de Klarify y acentos puntuales            |
| Éxito / peligro  | `text-success`, `text-danger`          | Estados, no decoración                                  |


**Regla:** el `primary` no debe dominar botones de acción principal del workspace. Preferir:

```txt
bg-foreground text-background hover:opacity-90
```

Reservar `primary` para marca, links de plan y badges muy puntuales.

### Opacidad y transparencias (decisión consolidada)

El canvas de agentes lleva `WorkspaceGridBackground`. Sobre ese fondo, **los paneles de contenido deben ser opacos**.

| Situación                                         | Usar                                      | Evitar                                      |
| ------------------------------------------------- | ----------------------------------------- | ------------------------------------------- |
| Panel de contenido (deseos, contexto, backlog…)   | `bg-surface` sólido                       | `bg-surface-muted/40`, `/50`, glass, blur   |
| Sidebar / chrome del shell                        | `bg-surface` sólido                       | Transparencias que dejen ver el grid        |
| Hover de fila / highlight temporal                | `hover:bg-surface-hover/40` (ok)          | Fondos semitransparentes en el panel entero |
| Zona expandida *dentro* de un panel ya sólido     | `bg-surface-muted/25` suave (opcional)    | Otro panel semitransparente anidado         |
| Backdrop de modal                                 | `bg-background/70 backdrop-blur-sm`       | — (excepción válida)                        |


**Por qué:** `bg-surface-muted/40` (y similares) dejan ver la rejilla a través del panel; se lee sucio, poco elegante y resta contraste al texto. La jerarquía no sale de opacidades: sale de tipografía, `border-t` y un solo nivel de superficie.

**Test rápido:** si al mirar el panel se distingue el grid del fondo, la superficie no es lo bastante opaca → pasar a `bg-surface`.

---

## 3. Tipografía

Jerarquía quieta, sin “marketing bold” excesivo.


| Nivel                 | Clases típicas                                        | Ejemplo                        |
| --------------------- | ----------------------------------------------------- | ------------------------------ |
| Marca sidebar         | `text-3xl font-extrabold tracking-tight`              | Klarify                        |
| Título de página      | `text-xl`–`text-2xl font-semibold tracking-tight`     | Proyectos, Ingesta de Contexto |
| Título de panel       | `text-[15px] font-semibold tracking-tight`            | Deseos del cliente             |
| Cuerpo                | `text-sm` / `text-[13px]` `text-muted`                | Descripciones                  |
| Meta / labels         | `text-xs` / `text-[11px]`–`text-[12px]` `text-subtle` | Paso 1/6, timestamps, `01 DESEO-001 · IA` |
| Contenido prioritario | `text-[15px] font-medium text-foreground`             | Texto de un deseo              |


Evitar:

- `uppercase tracking-widest` en badges salvo casos muy justificados
- Títulos con `font-bold` + `text-3xl`/`text-4xl` dentro del workspace de agentes
- Monospace “cyber” en headings del UI (sí en IDs técnicos: `DESEO-001`)
- Contadores en píldora `bg-foreground` blancos si un `text-subtle` tabular basta

---

## 4. Layout y densidad

### Contenedores de página


| Contexto                                                            | Ancho                     |
| ------------------------------------------------------------------- | ------------------------- |
| Flujo de un solo foco (upload, wizard, edición, empty state)        | `max-w-3xl`               |
| Comparación / listados importantes (deseos + contexto, backlog)     | `max-w-5xl`               |
| Hub de proyectos                                                    | `max-w-3xl` (lista densa) |


Condicionar el ancho por estado cuando una etapa necesite más espacio:

```tsx
className={isReview ? 'max-w-5xl' : 'max-w-3xl'}
```

### Sidebar

- Ancho: `w-64`
- Padding: `px-3.5`, secciones con `py-2` / `py-3.5`
- Branding centrado: **Klarify** con `K` en `text-primary` + subtítulo `uppercase tracking-[0.14em] text-subtle` (“Tu workspace” / “Workspace de agentes”)
- Nav / pipeline: filas compactas `text-sm`, `rounded-lg`, activo con `bg-surface-hover` (no `bg-primary/10` pesado)
- Footer sticky abajo: plan, settings, cuenta — sin “Klarify v0.1.0 — MVP”

### Alineación número + texto

Cuando hay círculo/número + título (+ subtítulo), alinear el número con la **primera línea**:

```tsx
grid grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-x-2.5
// subtítulo en col-start-2
```

No centrar el número respecto a un bloque de dos líneas.

### Espaciado

- Gaps de sección: `gap-6`–`gap-7` (no `gap-10`)
- Padding de paneles: `px-4 py-3` / `px-5 py-4` (no `p-8` / `p-10`)
- Radios: `rounded-lg` / `rounded-xl` (evitar `rounded-2xl` + sombra salvo necesidad)

---

## 5. Componentes

### Botones


| Tipo          | Patrón                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------- |
| Primario      | `rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90`   |
| Secundario    | `rounded-lg border border-border … text-muted hover:bg-surface-hover hover:text-foreground` |
| Deshabilitado | `disabled:opacity-40` / tokens `disabled`                                                   |
| Peligro       | Texto/`hover` en rojo suave; no bordes rojos gritando por defecto                           |


Evitar: `shadow-[0_0_*px_primary]`, `hover:scale-*`, `py-4 text-base font-bold` en CTAs del workspace.

### Paneles / cards

- Un panel = `rounded-xl border border-border bg-surface` (**opaco**; ver §2 Opacidad)
- Primario y secundario comparten `bg-surface`; la jerarquía va por tipografía y rol en el layout (foco vs apoyo), no por opacidad
- **No** apilar cards dentro de cards con fondos distintos (`surface` → `background` → `muted/40`): se ve sucio y monótono
- Listas: un contenedor con filas separadas por `border-t`, no una card por cada ítem
- Fila típica (deseos, épicas, HUs):

```txt
meta (subtle): 01  DESEO-001  ·  IA
contenido:     text-foreground / text-[15px] font-medium
```

- Hover de fila: `hover:bg-surface-hover/40`
- Acciones secundarias (eliminar): visibles en mobile; en desktop `opacity-0 group-hover:opacity-100`
- Empty states: panel `bg-surface` compacto, CTA `foreground`/`background`, sin blur orbs ni glow

### Formularios

- Inputs: `rounded-lg border … px-3 py-2 text-sm focus:border-border-strong` (sin ring primary fuerte)
- Opciones tipo radio (wizard): fila con borde + check circular en `foreground`, no glow

### Footers de acción

- **Fijos en el flujo del documento**, no `sticky` flotantes que se mueven al scrollear
- Misma línea visual que el wizard: borde superior + botones compactos (`rounded-xl border border-border bg-surface px-4 py-3`)

### Modales / streaming de razonamiento

- Modal: `rounded-xl border border-border bg-surface`, backdrop `bg-background/70 backdrop-blur-sm`
- Sin borde degradado animado ni glow ambiental
- Spinner: anillo fino `border-border border-t-foreground`
- Progreso: barra `bg-border` + fill `bg-foreground/70`
- Thought stream: tipografía calmada, cursor de escritura sutil, sin “✦” ni headings mono uppercase

---

## 6. Jerarquía de contenido

En cada etapa, **un elemento manda**:


| Etapa              | Foco                                                               |
| ------------------ | ------------------------------------------------------------------ |
| Captura            | Dropzone + 3 métodos                                               |
| Clarificación      | Pregunta actual + opciones                                         |
| Revisión de deseos | Lista de deseos (más ancha / primero en mobile); contexto es apoyo |
| Backlog (Agente 2) | Lista de épicas / HUs; deseos aprobados son referencia             |
| Estimación (Agente 3) | Workspace de estimación (historias + SP); empty state compacto  |
| Priorización (Agente 4) | Workspace de priorización; metodología en selector quieto     |
| Sprints (Agente 5)    | Config + board de sprints; empty state compacto; cronograma en filas |
| Tablero Kanban        | Columnas + cards de ejecución; filtros y equipo en chrome compacto   |
| Hub                | Lista de proyectos; stats en una línea meta, no 4 cards            |
| Dashboard          | **Excepción al “un foco”:** franja densa de salud (coberturas, prioridad, ejecución) + **backlog jerárquico como pieza principal**; plan de sprints y export debajo. Pipeline detallado solo en sidebar. Sin `AgentPageHero` ni grids de métricas vanidosas. |


Si algo es secundario: tipografía más pequeña, `text-muted`/`text-subtle` — **no** bajar la opacidad del panel.

---

## 7. Motion

- Entradas: `fadeIn` / slides cortos (~0.3s), sin bounce
- Loaders: spinner fino o 3 puntos; no ping agresivo + spinner grande
- Respetar `prefers-reduced-motion` en animaciones de chrome
- No animar bordes, escalas de botones ni barras sticky

---

## 8. Branding

En sidebars del producto:

```tsx
<span className="text-primary">K</span>larify
<p className="… uppercase tracking-[0.14em] text-subtle">Tu workspace</p>
```

- No reemplazar por monograma-en-caja salvo layouts muy densos fuera del shell principal
- Links de marca: hacia `/agentes/proyectos` en el workspace autenticado

---

## 9. Checklist al implementar una sección nueva

1. ¿**Solo toqué UI**? ¿Handlers, estado, APIs y reglas de negocio quedaron intactos?
2. ¿Usa tokens (`background`, `surface`, `muted`, `subtle`, `border`) y no colores inventados?
3. ¿Los paneles de contenido son **opacos** (`bg-surface`)? ¿Se ve el grid a través? → corregir
4. ¿El CTA principal es `foreground`/`background` sin glow?
5. ¿Padding y gaps son compactos (`px-4`–`px-5`, `gap-6`–`gap-7`)?
6. ¿Hay un solo foco visual claro?
7. ¿Listas usan filas + `border-t` en lugar de cards anidadas?
8. ¿Sidebar / listas alinean número con la primera línea de texto?
9. ¿Footers de acción son estáticos (no sticky molesto)?
10. ¿Ancho de página es `max-w-3xl` salvo justificación de comparación?
11. ¿Se evitaron badges uppercase, cards de stats y tipografía de landing?

Si algo no encaja, mirar primero:

- Hub: `components/agents/projects/ProjectsHub.tsx`
- Shell agentes: `components/agents/shared/layout/AgentLayoutShell.tsx`
- Agente 1: `app/agentes/1/page.tsx` + paneles en `components/agents/agent-1/`
- Agente 2: `app/agentes/2/page.tsx` + paneles en `components/agents/agent-2/`
- Agente 3: `app/agentes/3/page.tsx` + `EstimationWorkspace`
- Agente 4: `app/agentes/4/page.tsx` + `PrioritizationWorkspace`
- Agente 5: `app/agentes/5/page.tsx` + `SprintPlanningWorkspace` / `SprintBoard`
- Tablero: `app/agentes/board/page.tsx` + `BoardWorkspace` / `KanbanBoard` / `KanbanColumn` / `KanbanCard`
- Klark: `components/agents/harness/HarnessChatPanel.tsx` + `HarnessChatDock` (+ estilos en `globals.css`)
- Configuración: `WorkspaceSettingsModal` + `ThemeSettingsPanel` / paneles de integraciones
- Dashboard: `app/agentes/dashboard/page.tsx` + `DashboardContent` / `DashboardBacklogPanel` / `DashboardSummaryStrip`

---

## 10. Qué no portar del diseño anterior

- `AgentPageHero` con blur orbs, pills “Paso 01 - 06” y card grande
- Pipeline con círculos `h-9` y conectores verticales gruesos
- Dropzone `h-[min(400px,55vh)]` + cards de acción con `scale-110`
- Modal de actividad con `agent-modal-shell` gradient animado
- ApproveButton / GenerateBacklogButton con sombra primary y `hover:scale`
- Barras `sticky bottom-6` con glass / backdrop-blur sobre el contenido
- Paneles `bg-surface-muted/40` (u otras opacidades) sobre el grid del workspace
- Cards anidadas con fondos distintos para “diferenciar” deseos, épicas o HUs

---

*Documento vivo: actualizar cuando se consoliden patrones nuevos del workspace.*