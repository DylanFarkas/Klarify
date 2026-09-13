# Klarify CLI — reglas para agentes

El backlog vive en **Klarify**. No uses Klark.

**Backlog nuevo o grande:** una sola llamada, nunca HU a HU.

```bash
klarify backlog import --file backlog.json --rm
```

`--rm` elimina el JSON tras el import. No lo dejes en el repo.

**Una HU suelta:** `stories create` con `--ac` (Gherkin completo), `--subtasks`, `--category`, `--points`.
