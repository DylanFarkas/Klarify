/**
 * MCP stdio sobre el cliente HTTP de Klarify.
 * JSON-RPC newline-delimited (spec MCP). No sustituye al CLI.
 */

import { createInterface } from 'node:readline';
import { loadConfig } from './core/config';
import {
  addSubtask,
  createEpic,
  createStory,
  getContext,
  getNext,
  getStory,
  importBacklog,
  listBacklog,
  listProjects,
  resolveProjectId,
  setStatus,
  updateStory,
} from './core/services';
import type { KanbanStatus, WorkItemType } from './core/types';

interface JsonRpc {
  jsonrpc?: '2.0';
  id?: number | string | null;
  method?: string;
  params?: Record<string, unknown>;
}

function hasId(id: JsonRpc['id']): id is number | string {
  return id !== undefined && id !== null;
}

const TOOLS = [
  {
    name: 'klarify_context',
    description: 'Lee el contexto compacto del proyecto Klarify (backlog, stack, siguiente ítem).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        full: { type: 'boolean' },
      },
    },
  },
  {
    name: 'klarify_list_projects',
    description: 'Lista proyectos Klarify del usuario autenticado.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'klarify_list_backlog',
    description: 'Lista épicas, historias y sprints.',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
    },
  },
  {
    name: 'klarify_get_story',
    description: 'Detalle de una HU/bug/task.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        storyId: { type: 'string' },
      },
      required: ['storyId'],
    },
  },
  {
    name: 'klarify_create_epic',
    description: 'Crea una épica.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['title', 'description'],
    },
  },
  {
    name: 'klarify_import_backlog',
    description:
      'Crea un backlog completo en UNA llamada (épicas + historias + subtareas + prioridad). Úsalo en vez de crear HU una a una.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        epics: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              stories: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    type: { type: 'string' },
                    acceptanceCriteria: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Cada string es un criterio Gherkin completo.',
                    },
                    subtasks: { type: 'array', items: { type: 'string' } },
                    category: { type: 'string', description: 'must|should|could|wont' },
                    points: { type: 'number' },
                    duration: { type: 'string' },
                  },
                  required: ['title', 'description', 'acceptanceCriteria'],
                },
              },
            },
            required: ['title', 'description', 'stories'],
          },
        },
      },
      required: ['epics'],
    },
  },
  {
    name: 'klarify_create_story',
    description:
      'Crea historia/bug/task. acceptanceCriteria: array con criterios completos (un Gherkin = un string). Incluye subtasks y category (must|should|could|wont en MoSCoW).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        epicId: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string' },
        acceptanceCriteria: {
          type: 'array',
          items: { type: 'string' },
          description: 'Cada elemento es un criterio completo; no partir Dado/Cuando/Entonces en varios.',
        },
        subtasks: {
          type: 'array',
          items: { type: 'string' },
          description: 'Subtareas de implementación (títulos accionables).',
        },
        points: { type: 'number' },
        duration: { type: 'string' },
        category: {
          type: 'string',
          description: 'Prioridad: must|should|could|wont (MoSCoW) según framework del proyecto.',
        },
        sprintId: { type: 'string' },
        severity: { type: 'string' },
        stepsToReproduce: { type: 'array', items: { type: 'string' } },
      },
      required: ['epicId', 'title', 'description'],
    },
  },
  {
    name: 'klarify_update_story',
    description: 'Actualiza una historia existente.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        storyId: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        acceptanceCriteria: { type: 'array', items: { type: 'string' } },
      },
      required: ['storyId'],
    },
  },
  {
    name: 'klarify_create_subtask',
    description: 'Añade una subtarea de implementación.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        storyId: { type: 'string' },
        title: { type: 'string' },
      },
      required: ['storyId', 'title'],
    },
  },
  {
    name: 'klarify_set_status',
    description: 'Cambia el estado Kanban (todo, in_progress, code_review, done).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        storyId: { type: 'string' },
        status: { type: 'string' },
      },
      required: ['storyId', 'status'],
    },
  },
  {
    name: 'klarify_next',
    description: 'Siguiente ítem implementable.',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
    },
  },
] as const;

async function projectIdOf(raw?: unknown): Promise<string> {
  return resolveProjectId(typeof raw === 'string' ? raw : undefined);
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'klarify_list_projects':
      return listProjects();
    case 'klarify_context': {
      const projectId = await projectIdOf(args.projectId);
      return getContext(projectId, { full: Boolean(args.full), format: 'json' });
    }
    case 'klarify_list_backlog': {
      const projectId = await projectIdOf(args.projectId);
      return listBacklog(projectId);
    }
    case 'klarify_get_story': {
      const projectId = await projectIdOf(args.projectId);
      return getStory(projectId, String(args.storyId));
    }
    case 'klarify_import_backlog': {
      const projectId = await projectIdOf(args.projectId);
      return importBacklog(projectId, { epics: args.epics });
    }
    case 'klarify_create_epic': {
      const projectId = await projectIdOf(args.projectId);
      return createEpic(projectId, {
        title: String(args.title),
        description: String(args.description),
      });
    }
    case 'klarify_create_story': {
      const projectId = await projectIdOf(args.projectId);
      return createStory(projectId, {
        epicId: String(args.epicId),
        title: String(args.title),
        description: String(args.description),
        type: typeof args.type === 'string' ? (args.type as WorkItemType) : undefined,
        acceptanceCriteria: Array.isArray(args.acceptanceCriteria)
          ? (args.acceptanceCriteria as string[])
          : undefined,
        subtasks: Array.isArray(args.subtasks) ? (args.subtasks as string[]) : undefined,
        points: typeof args.points === 'number' ? args.points : undefined,
        duration: typeof args.duration === 'string' ? args.duration : undefined,
        category: typeof args.category === 'string' ? args.category : undefined,
        sprintId: typeof args.sprintId === 'string' ? args.sprintId : undefined,
        severity: typeof args.severity === 'string' ? args.severity : undefined,
        stepsToReproduce: Array.isArray(args.stepsToReproduce)
          ? (args.stepsToReproduce as string[])
          : undefined,
      });
    }
    case 'klarify_update_story': {
      const projectId = await projectIdOf(args.projectId);
      return updateStory(projectId, String(args.storyId), {
        title: typeof args.title === 'string' ? args.title : undefined,
        description: typeof args.description === 'string' ? args.description : undefined,
        acceptanceCriteria: Array.isArray(args.acceptanceCriteria)
          ? (args.acceptanceCriteria as string[])
          : undefined,
      });
    }
    case 'klarify_create_subtask': {
      const projectId = await projectIdOf(args.projectId);
      return addSubtask(projectId, String(args.storyId), String(args.title));
    }
    case 'klarify_set_status': {
      const projectId = await projectIdOf(args.projectId);
      return setStatus(projectId, String(args.storyId), String(args.status) as KanbanStatus);
    }
    case 'klarify_next': {
      const projectId = await projectIdOf(args.projectId);
      return getNext(projectId);
    }
    default:
      throw new Error(`Tool desconocida: ${name}`);
  }
}

function write(message: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function result(id: number | string, value: unknown): void {
  write({ jsonrpc: '2.0', id, result: value });
}

function rpcError(id: number | string | null, code: number, message: string): void {
  if (id === null) return;
  write({ jsonrpc: '2.0', id, error: { code, message } });
}

export async function runMcpStdio(): Promise<void> {
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let request: JsonRpc;
    try {
      request = JSON.parse(line) as JsonRpc;
    } catch {
      continue;
    }

    const id = request.id;
    const method = request.method ?? '';

    try {
      if (method === 'notifications/initialized' || method === 'initialized' || method.startsWith('notifications/')) {
        continue;
      }

      if (!hasId(id)) continue;

      if (method === 'initialize') {
        result(id, {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {}, resources: {} },
          serverInfo: { name: 'klarify', version: '0.1.0' },
        });
        continue;
      }
      if (method === 'ping') {
        result(id, {});
        continue;
      }
      if (method === 'tools/list') {
        result(id, { tools: TOOLS });
        continue;
      }
      if (method === 'resources/list') {
        const config = await loadConfig();
        const projectId = config.projectId;
        result(id, {
          resources: projectId
            ? [
                {
                  uri: `klarify://project/${projectId}/context`,
                  name: 'Klarify project context',
                  mimeType: 'application/json',
                },
              ]
            : [],
        });
        continue;
      }
      if (method === 'resources/read') {
        const uri = String(request.params?.uri ?? '');
        const match = uri.match(/^klarify:\/\/project\/([^/]+)\/context$/);
        const projectId = match?.[1];
        if (!projectId) {
          rpcError(id, -32002, 'Resource no encontrado');
          continue;
        }
        const data = await getContext(projectId, { format: 'json' });
        result(id, {
          contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(data, null, 2) }],
        });
        continue;
      }
      if (method === 'tools/call') {
        const name = String(request.params?.name ?? '');
        const args = (request.params?.arguments as Record<string, unknown>) ?? {};
        try {
          const value = await callTool(name, args);
          result(id, {
            content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
          });
        } catch (error) {
          result(id, {
            content: [{ type: 'text', text: error instanceof Error ? error.message : 'Error MCP' }],
            isError: true,
          });
        }
        continue;
      }
      rpcError(id, -32601, `Método no soportado: ${method}`);
    } catch (error) {
      if (hasId(id)) {
        rpcError(id, -32603, error instanceof Error ? error.message : 'Error MCP');
      }
    }
  }
}
