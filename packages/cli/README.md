# @klarify/cli

CLI de [Klarify](https://klarify.vercel.app/) para terminal y agentes de código. Lee y escribe el backlog del producto (`/api/v1`). **No es Klark**: no abre el chat de la web ni el pipeline HITL.

Requiere **Node.js 22+**.

## Instalación

### Recomendado: global (`-g`)

Instala el comando `klarify` en todo el sistema. Es la forma habitual para un CLI:

```bash
npm install -g @klarify/cli
klarify --help
```

### Sin instalar: `npx`

Ejecuta la última versión sin dejarla instalada:

```bash
npx @klarify/cli login
npx @klarify/cli context --format md
```

### Local en un proyecto (sin `-g`)

`npm i @klarify/cli` instala el paquete en `node_modules` del repo, pero **no** añade `klarify` al PATH. Úsalo con `npx` o en scripts:

```bash
npm i @klarify/cli
npx klarify login
```

```json
"scripts": {
  "backlog": "klarify context --format md"
}
```

Sirve para fijar la versión del CLI en un proyecto concreto.

## Desinstalación

### Global (`-g`)

Si lo instalaste con `npm install -g @klarify/cli` (o con `npm run klarify:link` desde el repo):

```bash
npm uninstall -g @klarify/cli
```

Comprueba que ya no esté en el PATH:

```bash
klarify --version
```

### Local en un proyecto

```bash
npm uninstall @klarify/cli
```

Con `npx` no hace falta desinstalar nada: no deja el paquete instalado de forma permanente.

## Arranque

Humanos (TUI, Windows Terminal recomendado):

```bash
klarify
# o de forma explícita:
klarify tui
```

`klarify` sin subcomando abre la TUI solo en una terminal interactiva. En CI, pipes, o con `KLARIFY_NO_TUI=1` no se abre.

Agentes y scripts (el contrato no cambia):

```bash
klarify login
klarify use <projectId>
klarify context --format md
```

`klarify login` abre el device flow en la web. También puedes pasar un PAT (`klf_…`) generado en Configuración → Integraciones:

```bash
klarify login --token klf_…
```

Por defecto la API es `http://localhost:3000`. En producción:

```bash
klarify login --apiUrl https://klarify.vercel.app
```

## Variables de entorno

| Variable | Descripción |
|---|---|
| `KLARIFY_TOKEN` | PAT o token de sesión |
| `KLARIFY_API_URL` | URL de la API |
| `KLARIFY_PROJECT` | Proyecto activo |
| `KLARIFY_NO_TUI` | `1` — nunca lanza la TUI (útil en scripts) |

La sesión se guarda en `~/.klarify/config.json`.

## TUI

Pantalla completa para personas: backlog en tres columnas, formularios (sin `;;`), Kanban, sprints e import JSON. Teclado: `j`/`k`, `tab`, `n` nueva HU, `e` editar, `s` estado, `i` importar, `?` ayuda, `q` salir. Confirmaciones destructivas piden `y`/`n`.

Los agentes **no** deben usar la TUI. Siguen con subcomandos y `--json`.

## Crear un backlog

No crees épicas/HU una a una. Un JSON, una llamada:

```bash
klarify backlog import --file backlog.json --rm
```

`--rm` borra el JSON si el import va bien. No lo dejes en el repo.

## Historia suelta

Incluye criterios de aceptación (Gherkin en una sola línea), subtareas, prioridad y estimación:

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

Varios criterios: sepáralos con `;;`.

## Flujo al desarrollar

1. `klarify context --format md`
2. Implementa el código.
3. `klarify subtasks update HU-001 ST-001 --done` o `klarify status HU-001 in_progress`

## Comandos

`login` · `logout` · `whoami` · `use` · `projects` · `context` · `next` · `status` · `epics` · `stories` · `backlog` · `subtasks` · `sprints` · `stack` · `mcp` · `tui`

Mutaciones destructivas: `--yes`. Salida para agentes: `--json`.

## MCP

```json
{
  "mcpServers": {
    "klarify": {
      "command": "npx",
      "args": ["-y", "@klarify/cli", "mcp"]
    }
  }
}
```
