---
name: klarify-cli
description: >-
  Use Klarify as the source of truth for product backlog while coding.
  Run when implementing features, user stories, bugs, or subtasks that live in Klarify.
---

# Klarify CLI (no es Klark)

Klarify guarda el backlog del producto. Este CLI **no abre Klark** (el chat de la web). Tú, el agente de código, creas y actualizas épicas, historias y subtareas con comandos.

## Arranque

```bash
npm install -g ./packages/cli
klarify login
klarify use <projectId>
klarify context --format md
```

Variables: `KLARIFY_TOKEN`, `KLARIFY_API_URL`, `KLARIFY_PROJECT`.

## Crear un backlog completo (agentes)

**No** uses `epics create` / `stories create` en bucle. Un JSON, una llamada:

```bash
klarify backlog import --file backlog.json --rm
```

`--rm` borra el JSON si el import va bien. No lo commits.

## Crear una historia suelta

Al crear una HU aislada incluye **todo**:

1. **Un criterio de aceptación = un string completo** (Gherkin en una sola línea). No partas Dado/Cuando/Entonces en criterios distintos.
2. **Subtareas** de implementación (`--subtasks`, separadas por `;;`).
3. **Prioridad** (`--category`, p. ej. `must`, `should`, `could`, `wont` en MoSCoW).
4. **Estimación** (`--points` o `--duration` según el modo del proyecto).

```bash
klarify stories create \
  --epic EPIC-001 \
  --title "Registro con email" \
  --description "Como usuario, quiero registrarme con email para acceder a la app" \
  --ac "Dado un email válido, cuando envío el formulario, entonces se crea la cuenta" \
  --subtasks "Implementar formulario de registro;;Validar email en servidor;;Persistir usuario en BD" \
  --category must \
  --points 3
```

Varios criterios de aceptación: sepáralos con `;;` (no con `|`).

```bash
--ac "Criterio 1 completo;;Criterio 2 completo"
```

## Flujo al desarrollar

1. `klarify context --format md`
2. Implementa el código.
3. `klarify subtasks update HU-001 ST-001 --done` o `klarify status HU-001 in_progress`
4. Si falta backlog, créalo aquí. No uses Klark.

## Comandos

`projects`, `epics`, `stories`, `backlog import`, `subtasks`, `sprints`, `stack`, `status`, `next`, `mcp`.

Mutaciones destructivas: `--yes`. Salida agente: `--json`.
