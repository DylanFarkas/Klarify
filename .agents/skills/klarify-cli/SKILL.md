---
name: klarify-cli
description: >-
  Use Klarify as the source of truth for product backlog while coding.
  Run when implementing features, user stories, bugs, or subtasks that live in Klarify.
---

# Klarify CLI (no es Klark)

El backlog vive en Klarify. **No uses Klark** ni el pipeline HITL de la web.

## Crear un backlog completo (obligatorio)

**No** crees épicas/HU una a una. Escribe un JSON y llama **una vez**:

```bash
klarify backlog import --file backlog.json --rm
```

`--rm` borra el JSON al terminar. **No dejes `backlog.json` en el repo.**

## Una HU suelta (después del bootstrap)

`stories create` solo para ítems aislados. Incluye `--ac`, `--subtasks`, `--category`, `--points`.

## Flujo

1. `klarify context --format md`
2. Implementar
3. `klarify status` / subtareas

Variables: `KLARIFY_TOKEN`, `KLARIFY_PROJECT`. API default: Cloud (`https://klarify.vercel.app`). Local solo con `--local` o `KLARIFY_API_URL=http://localhost:3000`.
