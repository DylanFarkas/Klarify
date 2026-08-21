/**
 * @fileoverview Registry de tools del harness de backlog.
 *
 * Cada tool valida args y delega en workspace-service (*AcrossWorkspace).
 */

import type { FrameworkCategory } from '@/lib/types/agent-4';
import type { UserWorkspace } from '@/lib/types/workspace';
import type { HarnessToolResult } from '@/lib/harness/types';
import type { LlmToolDefinition } from '@/lib/llm/types';
import {
  describeFrameworkCategories,
  normalizePriorityCategory,
  resolveWorkspaceFramework,
} from '@/lib/harness/priority';
import {
  createEpicAcrossWorkspace,
  createSprintAcrossWorkspace,
  createUserStoryAcrossWorkspace,
  completeSprintAcrossWorkspace,
  deleteEpicAcrossWorkspace,
  deleteSprintAcrossWorkspace,
  deleteUserStoryAcrossWorkspace,
  getWorkspaceData,
  startSprintAcrossWorkspace,
  updateEpicAcrossWorkspace,
  updateSprintAcrossWorkspace,
  updateStoryExecution,
  updateUserStoryAcrossWorkspace,
  saveStackAcrossWorkspace,
} from '@/lib/workspace-service';
import { buildStackContextSummary } from '@/lib/services/stack-service';
import {
  buildProjectContextForStack,
  inferStackLayerRequirements,
  pruneStackToAllowedLayers,
} from '@/lib/stack/layer-requirements';
import { normalizeStackFromToolArgs, countStackItems } from '@/lib/stack/normalize';
import { validateStackCompatibility } from '@/lib/stack/compatibility';
import type { StackRecommendRaw } from '@/lib/types/stack';
import { getLiveBacklog, listLiveStories } from '@/lib/utils/live-backlog';
import {
  defaultDurationLabel,
  DurationParseError,
  formatEstimation,
  formatEffortTotal,
  isStoryEstimated,
} from '@/lib/utils/estimation';
import {
  assertStoryNotInCompletedSprint,
  findActiveSprint,
  SprintLifecycleError,
} from '@/lib/utils/sprint-plan-mutations';
import { getSprintStatus } from '@/lib/types/agent-5';
import type { KanbanStatus } from '@/lib/types/execution';
import { KANBAN_COLUMNS } from '@/lib/types/execution';

export interface HarnessToolContext {
  uid: string;
}

function toolSuccess(
  summary: string,
  extra?: Omit<HarnessToolResult, 'ok' | 'status' | 'summary'>
): HarnessToolResult {
  return { ok: true, status: 'success', summary, ...extra };
}

function toolError(
  summary: string,
  error: string,
  extra?: Omit<HarnessToolResult, 'ok' | 'status' | 'summary' | 'error'>
): HarnessToolResult {
  return { ok: false, status: 'error', summary, error, mutated: false, ...extra };
}

function toolNeedsConfirmation(
  summary: string,
  confirmationLabel: string,
  data: Record<string, unknown>
): HarnessToolResult {
  return {
    ok: false,
    status: 'pending_confirmation',
    summary,
    needsConfirmation: true,
    confirmationLabel,
    data,
    error: 'NEEDS_CONFIRMATION',
    mutated: false,
  };
}

/** Índice compacto de IDs reales para inyectar en el system prompt. */
export function buildBacklogIndex(workspace: UserWorkspace): string {
  const { epics, plan } = getLiveBacklog(workspace);
  if (epics.length === 0) {
    return 'Backlog vacío: no hay épicas ni historias.';
  }

  const truncate = (text: string, max = 48) =>
    text.length <= max ? text : `${text.slice(0, max - 1)}…`;

  const epicLines = epics.map((epic) => {
    const stories =
      epic.userStories.length === 0
        ? '(sin historias)'
        : epic.userStories
            .map((s) => `${s.id}[${s.type ?? 'story'}] «${truncate(s.title)}»`)
            .join('; ');
    return `- ${epic.id} «${truncate(epic.title)}»: ${stories}`;
  });

  const active = plan ? findActiveSprint(plan) : null;
  const sprintLines =
    !plan || plan.sprints.length === 0
      ? ['- (sin sprints)']
      : plan.sprints.map((sprint) => {
          const status = getSprintStatus(sprint);
          const stories =
            sprint.storyIds.length === 0
              ? 'vacío'
              : `${sprint.storyIds.length} HU: ${sprint.storyIds.join(', ')}`;
          return `- ${sprint.id} [${status}] «${truncate(sprint.sprintGoal)}» (${stories})`;
        });

  const statusLines =
    workspace.execution?.stories && Object.keys(workspace.execution.stories).length > 0
      ? (() => {
          const counts = { todo: 0, in_progress: 0, code_review: 0, done: 0 };
          for (const exec of Object.values(workspace.execution.stories)) {
            counts[exec.status] += 1;
          }
          return [
            `Kanban: todo=${counts.todo}, in_progress=${counts.in_progress}, code_review=${counts.code_review}, done=${counts.done}.`,
            `Estados válidos: ${KANBAN_COLUMNS.map((c) => c.id).join(', ')}.`,
          ];
        })()
      : ['Kanban: sin inicializar (usa update_story_status / assign_story tras abrir el tablero).'];

  const members = workspace.execution?.members ?? [];
  const memberLines =
    members.length === 0
      ? ['Equipo: (sin miembros)']
      : members.map((m) => `- ${m.id} «${truncate(m.displayName)}» (${m.role})`);

  return [
    `Épicas: ${epics.length}. Ítems: ${epics.reduce((n, e) => n + e.userStories.length, 0)}.`,
    ...epicLines,
    `Sprints: ${plan?.sprints.length ?? 0}. Activo: ${active ? `${active.id} (Sprint ${active.number})` : 'ninguno'}.`,
    ...sprintLines,
    ...statusLines,
    ...memberLines,
  ].join('\n');
}

export function formatToolOutcome(
  name: string,
  result: Pick<HarnessToolResult, 'status' | 'summary' | 'error'>
): string {
  const code = result.error ?? result.status;
  return `[tool] ${name} → ${code}: ${result.summary}`;
}

export function isPendingConfirmation(
  result: Pick<HarnessToolResult, 'status' | 'needsConfirmation'>
): boolean {
  return result.status === 'pending_confirmation' || Boolean(result.needsConfirmation);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
  return items;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

/** Extrae el número de un ID tipo HU-028, BUG-012, TASK-003, "hu 28", "28". */
function extractEntityNumber(raw: string): number | null {
  const trimmed = raw.trim();
  const prefixed = trimmed.match(
    /^(?:HU|BUG|TASK|STORY|US|USER[\s_-]?STORY|HISTORIA)[\s_-]*0*(\d+)$/i
  );
  if (prefixed) return Number(prefixed[1]);
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  return null;
}

function listStories(workspace: UserWorkspace) {
  return listLiveStories(workspace);
}

/**
 * Resuelve un storyId flexible (HU-28, STORY-28, "28") al ID canónico del backlog.
 * Fallo explícito si no existe — evita borrados fantasma.
 */
function resolveStoryId(
  workspace: UserWorkspace,
  rawId: string
): { ok: true; storyId: string; title: string; epicId: string } | { ok: false; summary: string } {
  const stories = listStories(workspace);
  const exact = stories.find((s) => s.id.toLowerCase() === rawId.toLowerCase());
  if (exact) {
    return { ok: true, storyId: exact.id, title: exact.title, epicId: exact.epicId };
  }

  const num = extractEntityNumber(rawId);
  if (num !== null) {
    const byNumber = stories.filter((s) => {
      const n = extractEntityNumber(s.id);
      return n !== null && n === num;
    });
    if (byNumber.length === 1) {
      const match = byNumber[0];
      return { ok: true, storyId: match.id, title: match.title, epicId: match.epicId };
    }
    if (byNumber.length > 1) {
      return {
        ok: false,
        summary: `Ambiguo: varias historias coinciden con "${rawId}" (${byNumber
          .map((s) => s.id)
          .join(', ')}). Usa el ID exacto.`,
      };
    }
  }

  const displayId =
    num !== null ? `HU-${String(num).padStart(3, '0')}` : rawId.trim();
  return {
    ok: false,
    summary: `No encontré la ${displayId}.`,
  };
}

function resolveEpicId(
  workspace: UserWorkspace,
  rawId: string
): { ok: true; epicId: string; title: string; storyCount: number } | { ok: false; summary: string } {
  const epics = getLiveBacklog(workspace).epics;
  const exact = epics.find((e) => e.id.toLowerCase() === rawId.toLowerCase());
  if (exact) {
    return {
      ok: true,
      epicId: exact.id,
      title: exact.title,
      storyCount: exact.userStories.length,
    };
  }

  const epicNumMatch = rawId.trim().match(/^(?:EPIC|EPI)?[\s_-]*0*(\d+)$/i);
  if (epicNumMatch) {
    const n = Number(epicNumMatch[1]);
    const byNumber = epics.filter((e) => {
      const m = e.id.match(/^EPIC-0*(\d+)$/i);
      return m && Number(m[1]) === n;
    });
    if (byNumber.length === 1) {
      const match = byNumber[0];
      return {
        ok: true,
        epicId: match.id,
        title: match.title,
        storyCount: match.userStories.length,
      };
    }
  }

  const displayId = epicNumMatch
    ? `EPIC-${String(Number(epicNumMatch[1])).padStart(3, '0')}`
    : rawId.trim();
  return {
    ok: false,
    summary: `No encontré la ${displayId}.`,
  };
}

function resolveSprintId(
  workspace: UserWorkspace,
  rawId: string
):
  | {
      ok: true;
      sprintId: string;
      number: number;
      goal: string;
      storyCount: number;
      storyIds: string[];
    }
  | { ok: false; summary: string } {
  const plan = getLiveBacklog(workspace).plan;
  if (!plan) {
    return { ok: false, summary: 'No hay plan de sprints.' };
  }

  const exact = plan.sprints.find((sprint) => sprint.id.toLowerCase() === rawId.toLowerCase());
  if (exact) {
    return {
      ok: true,
      sprintId: exact.id,
      number: exact.number,
      goal: exact.sprintGoal,
      storyCount: exact.storyIds.length,
      storyIds: exact.storyIds,
    };
  }

  const sprintNumMatch = rawId.trim().match(/^(?:SPRINT|SP)?[\s_-]*0*(\d+)$/i);
  if (sprintNumMatch) {
    const n = Number(sprintNumMatch[1]);
    const byNumber = plan.sprints.filter((sprint) => sprint.number === n);
    if (byNumber.length === 1) {
      const match = byNumber[0];
      return {
        ok: true,
        sprintId: match.id,
        number: match.number,
        goal: match.sprintGoal,
        storyCount: match.storyIds.length,
        storyIds: match.storyIds,
      };
    }
    const byId = plan.sprints.filter((sprint) => {
      const idMatch = sprint.id.match(/^SPRINT-0*(\d+)$/i);
      return idMatch && Number(idMatch[1]) === n;
    });
    if (byId.length === 1) {
      const match = byId[0];
      return {
        ok: true,
        sprintId: match.id,
        number: match.number,
        goal: match.sprintGoal,
        storyCount: match.storyIds.length,
        storyIds: match.storyIds,
      };
    }
  }

  const displayId = sprintNumMatch
    ? `SPRINT-${String(Number(sprintNumMatch[1])).padStart(3, '0')}`
    : rawId.trim();
  return {
    ok: false,
    summary: `No encontré el ${displayId}.`,
  };
}

function findSprintIdForStory(workspace: UserWorkspace, storyId: string): string | null {
  const plan = getLiveBacklog(workspace).plan;
  if (!plan) return null;
  for (const sprint of plan.sprints) {
    if (sprint.storyIds.includes(storyId)) return sprint.id;
  }
  if (plan.unassignedStoryIds.includes(storyId)) return null;
  return null;
}

function summarizeBacklog(workspace: UserWorkspace) {
  const live = getLiveBacklog(workspace);
  const estimations = live.estimations;
  const estimationMode = live.estimationMode;
  const priorities = live.priorities;
  const framework = resolveWorkspaceFramework(workspace);
  const frameworkMeta = describeFrameworkCategories(framework);
  const plan = live.plan;
  const labels = frameworkMeta.categoryLabels;

  return {
    framework: frameworkMeta.framework,
    frameworkLabel: frameworkMeta.frameworkLabel,
    estimationMode,
    allowedPriorityCategories: frameworkMeta.allowedCategories,
    priorityCategoryLabels: labels,
    epicCount: live.epics.length,
    storyCount: live.epics.reduce((n, e) => n + e.userStories.length, 0),
    sprints:
      plan?.sprints.map((sprint) => ({
        id: sprint.id,
        number: sprint.number,
        goal: sprint.sprintGoal,
        status: getSprintStatus(sprint),
        storyIds: sprint.storyIds,
        velocitySp: sprint.velocitySp,
        velocityLabel: formatEffortTotal(sprint.velocitySp, estimationMode),
        startDate: sprint.startDate,
        endDate: sprint.endDate,
      })) ?? [],
    activeSprintId: plan ? findActiveSprint(plan)?.id ?? null : null,
    unassignedStoryIds: plan?.unassignedStoryIds ?? [],
    epics: live.epics.map((epic) => ({
      id: epic.id,
      title: epic.title,
      description: epic.description,
      stories: epic.userStories.map((story) => {
        const priorityCode = priorities[story.id]?.category ?? null;
        const estimation = estimations[story.id];
        return {
          id: story.id,
          type: story.type ?? 'story',
          title: story.title,
          description: story.description,
          acceptanceCriteria: story.acceptanceCriteria,
          severity: story.severity ?? null,
          stepsToReproduce: story.stepsToReproduce ?? null,
          technicalNotes: story.technicalNotes ?? null,
          points: estimationMode === 'story_points' ? estimation?.points ?? null : null,
          duration:
            estimationMode === 'time' && isStoryEstimated(estimation, 'time')
              ? formatEstimation(estimation, 'time')
              : null,
          effortLabel: formatEstimation(estimation, estimationMode),
          priority: priorityCode,
          priorityLabel: priorityCode ? (labels[priorityCode] ?? priorityCode) : null,
          sprintId: findSprintIdForStory(workspace, story.id),
        };
      }),
    })),
  };
}

function resolveCategoryArg(
  raw: string | undefined,
  workspace: UserWorkspace
): { ok: true; category: FrameworkCategory } | { ok: false; summary: string } {
  if (!raw) {
    return { ok: false, summary: 'Falta category.' };
  }
  const framework = resolveWorkspaceFramework(workspace);
  const category = normalizePriorityCategory(raw, framework);
  if (!category) {
    const meta = describeFrameworkCategories(framework);
    return {
      ok: false,
      summary: `Categoría inválida "${raw}" para ${meta.frameworkLabel}. Usa uno de: ${meta.allowedCategories.join(', ')}.`,
    };
  }
  return { ok: true, category };
}

export const HARNESS_TOOL_DECLARATIONS: LlmToolDefinition[] = [
  {
    name: 'list_backlog',
    description:
      'Lista el backlog actual: épicas, historias, esfuerzo (Story Points o tiempo), prioridad y asignación a sprints.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'get_story',
    description:
      'Obtiene un ítem por ID (HU-XXX, BUG-XXX, TASK-XXX, "28", etc.). Úsala para verificar existencia o leer detalle antes de mutar.',
    parameters: {
      type: 'object',
      properties: {
        storyId: {
          type: 'string',
          description: 'ID del ítem. Preferir HU-XXX / BUG-XXX / TASK-XXX.',
        },
      },
      required: ['storyId'],
    },
  },
  {
    name: 'create_story',
    description:
      'Crea un ítem de backlog (historia, bug o task) en una épica existente. Usa type=story|bug|task (default story).',
    parameters: {
      type: 'object',
      properties: {
        epicId: { type: 'string', description: 'ID de la épica (p. ej. EPIC-001)' },
        type: {
          type: 'string',
          description: 'story (HU), bug o task. Default: story.',
          enum: ['story', 'bug', 'task'],
        },
        title: { type: 'string' },
        description: {
          type: 'string',
          description:
            'Story: Como… quiero… para…. Bug/task: texto libre del fallo o trabajo técnico.',
        },
        acceptanceCriteria: {
          type: 'array',
          items: { type: 'string' },
          description: 'Obligatorio para story (≥1). Opcional para bug/task.',
        },
        severity: {
          type: 'string',
          description: 'Solo bug: low|medium|high|critical. Default medium.',
          enum: ['low', 'medium', 'high', 'critical'],
        },
        stepsToReproduce: {
          type: 'array',
          items: { type: 'string' },
          description: 'Solo bug: pasos para reproducir (≥1 obligatorio).',
        },
        technicalNotes: {
          type: 'string',
          description: 'Solo task: notas técnicas opcionales.',
        },
        points: {
          type: 'number',
          description:
            'Solo si el proyecto estima en Story Points (Fibonacci 1,2,3,5,8,13,21). Default 3 (story/task) o 1 (bug). No usar en modo tiempo.',
        },
        duration: {
          type: 'string',
          description:
            'Solo si el proyecto estima en tiempo. Unidad única: 2d, 3h, 50m, 2.5h. 1d = 24h calendario. Default 1h (story/task) o 30m (bug).',
        },
        category: {
          type: 'string',
          description:
            'Código canónico de prioridad del framework activo: moscow→must|should|could|wont; wsjf→critical|high|medium|low; rice→quick-win|major-project|fill-in|thankless; value-effort→high-value-low-effort|...',
        },
        sprintId: {
          type: 'string',
          description:
            'ID de sprint opcional; omite para dejar sin asignar. No uses un sprint [completed].',
          nullable: true,
        },
      },
      required: ['epicId', 'title', 'description'],
    },
  },
  {
    name: 'update_story',
    description:
      'Actualiza un ítem (HU/bug/task): título, descripción, CA, severity/steps/notes, épica, estimación (points o duration según el modo del proyecto), prioridad o sprint. No cambia el type. Falla con SPRINT_CLOSED si la HU está en un sprint cerrado.',
    parameters: {
      type: 'object',
      properties: {
        storyId: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        acceptanceCriteria: { type: 'array', items: { type: 'string' } },
        severity: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
        },
        stepsToReproduce: { type: 'array', items: { type: 'string' } },
        technicalNotes: { type: 'string' },
        epicId: { type: 'string', description: 'Mover a otra épica' },
        points: {
          type: 'number',
          description: 'Solo en modo Story Points (Fibonacci). No usar en modo tiempo.',
        },
        duration: {
          type: 'string',
          description: 'Solo en modo tiempo: 2d, 3h, 50m, 2.5h. 1d = 24h calendario.',
        },
        category: {
          type: 'string',
          description:
            'Código canónico de prioridad (p. ej. must, should, could, wont). No uses "Should-have".',
        },
        sprintId: {
          type: 'string',
          description:
            'Nuevo sprint; null o cadena vacía para desasignar. No uses un sprint [completed] ni saques HU de uno cerrado.',
          nullable: true,
        },
      },
      required: ['storyId'],
    },
  },
  {
    name: 'delete_story',
    description:
      'Elimina un ítem (HU/bug/task). Requiere confirm=true tras confirmación explícita del usuario. Falla con SPRINT_CLOSED si la HU está en un sprint cerrado.',
    parameters: {
      type: 'object',
      properties: {
        storyId: {
          type: 'string',
          description:
            'ID del ítem. Preferir HU-XXX, BUG-XXX o TASK-XXX. También acepta "28", "HU-28" o alias.',
        },
        confirm: {
          type: 'boolean',
          description: 'Debe ser true solo tras confirmación del usuario',
        },
      },
      required: ['storyId'],
    },
  },
  {
    name: 'create_epic',
    description: 'Crea una épica vacía en el backlog.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['title', 'description'],
    },
  },
  {
    name: 'update_epic',
    description: 'Actualiza título o descripción de una épica.',
    parameters: {
      type: 'object',
      properties: {
        epicId: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['epicId'],
    },
  },
  {
    name: 'delete_epic',
    description:
      'Elimina una épica y todas sus historias. Requiere confirm=true tras confirmación del usuario.',
    parameters: {
      type: 'object',
      properties: {
        epicId: { type: 'string' },
        confirm: {
          type: 'boolean',
          description: 'Debe ser true solo tras confirmación del usuario',
        },
      },
      required: ['epicId'],
    },
  },
  {
    name: 'assign_story_sprint',
    description:
      'Asigna una historia a un sprint o la deja sin asignar. Falla con SPRINT_CLOSED si el origen o el destino está cerrado.',
    parameters: {
      type: 'object',
      properties: {
        storyId: { type: 'string' },
        sprintId: {
          type: 'string',
          description:
            'ID del sprint; null o vacío para desasignar. Falla si el sprint origen o destino está cerrado.',
          nullable: true,
        },
      },
      required: ['storyId'],
    },
  },
  {
    name: 'create_sprint',
    description:
      'Crea un sprint vacío al final del plan. goal es el objetivo (se prefija Sprint N: si no viene así).',
    parameters: {
      type: 'object',
      properties: {
        goal: {
          type: 'string',
          description: 'Objetivo del sprint. Ej: "Login y agenda" o "Sprint 3: Pagos".',
        },
      },
    },
  },
  {
    name: 'update_sprint',
    description:
      'Actualiza el goal y/o fechas de un sprint existente (SPRINT-XXX o número).',
    parameters: {
      type: 'object',
      properties: {
        sprintId: { type: 'string' },
        goal: { type: 'string' },
        startDate: { type: 'string', description: 'YYYY-MM-DD' },
        endDate: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['sprintId'],
    },
  },
  {
    name: 'start_sprint',
    description:
      'Inicia un sprint planificado (planned → active). Solo puede haber un sprint activo a la vez.',
    parameters: {
      type: 'object',
      properties: {
        sprintId: { type: 'string' },
      },
      required: ['sprintId'],
    },
  },
  {
    name: 'complete_sprint',
    description:
      'Cierra el sprint activo. Las HU no hechas salen al backlog o al siguiente sprint planned (rollover).',
    parameters: {
      type: 'object',
      properties: {
        sprintId: { type: 'string' },
        rollover: {
          type: 'string',
          enum: ['backlog', 'next_planned'],
          description: 'Destino de historias incompletas. Default: backlog.',
        },
      },
      required: ['sprintId'],
    },
  },
  {
    name: 'update_story_status',
    description:
      'Cambia el estado Kanban de una historia (todo, in_progress, code_review, done). Requiere tablero de ejecución. Falla con SPRINT_CLOSED si la HU está en un sprint cerrado.',
    parameters: {
      type: 'object',
      properties: {
        storyId: { type: 'string' },
        status: {
          type: 'string',
          enum: ['todo', 'in_progress', 'code_review', 'done'],
        },
      },
      required: ['storyId', 'status'],
    },
  },
  {
    name: 'assign_story',
    description:
      'Asigna o desasigna un responsable del equipo a una historia (tablero). Usa memberId o nombre. Falla con SPRINT_CLOSED si la HU está en un sprint cerrado.',
    parameters: {
      type: 'object',
      properties: {
        storyId: { type: 'string' },
        memberId: {
          type: 'string',
          description: 'ID del miembro, nombre, o null/vacío para desasignar',
          nullable: true,
        },
      },
      required: ['storyId'],
    },
  },
  {
    name: 'delete_sprint',
    description:
      'Elimina un sprint vacío. Falla con SPRINT_NOT_EMPTY si tiene historias asignadas. Requiere confirm=true tras confirmación del usuario.',
    parameters: {
      type: 'object',
      properties: {
        sprintId: {
          type: 'string',
          description: 'ID del sprint (SPRINT-001) o número ("1", "sprint 2").',
        },
        confirm: {
          type: 'boolean',
          description: 'Debe ser true solo tras confirmación del usuario',
        },
      },
      required: ['sprintId'],
    },
  },
  {
    name: 'get_stack',
    description:
      'Lee el stack tecnológico actual del proyecto: producto, arquitectura, capas y tecnologías.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'save_stack',
    description:
      'Guarda o actualiza el stack del proyecto. Usa catalogId del catálogo interno o customName. Marca isPrimary en frontend/backend/database. Incluye solo capas justificadas por el backlog (realtime, pagos, CMS, etc. solo si el producto lo requiere). No incluyas sources.',
    parameters: {
      type: 'object',
      properties: {
        productKind: { type: 'string' },
        architecturePattern: { type: 'string' },
        layers: {
          type: 'object',
          description:
            'Mapa capa → array de { catalogId?, customName?, isPrimary? }. Capas: frontend, backend, database, auth, hosting, styling, orm, etc.',
        },
        rationale: { type: 'string' },
        status: {
          type: 'string',
          enum: ['saved'],
          description: 'El stack se persiste de inmediato en el proyecto.',
        },
      },
      required: ['productKind', 'architecturePattern', 'layers'],
    },
  },
];

export async function executeHarnessTool(
  name: string,
  rawArgs: Record<string, unknown> | undefined,
  ctx: HarnessToolContext
): Promise<HarnessToolResult> {
  const args = rawArgs ?? {};

  try {
    switch (name) {
      case 'list_backlog': {
        const { workspace } = await getWorkspaceData(ctx.uid);
        const data = summarizeBacklog(workspace);
        return toolSuccess(
          `Backlog con ${data.epicCount} épicas y ${data.storyCount} historias.`,
          { data, mutated: false }
        );
      }

      case 'get_story': {
        const rawStoryId = asString(args.storyId);
        if (!rawStoryId) {
          return toolError('Falta storyId.', 'INVALID_ARGS');
        }
        const { workspace } = await getWorkspaceData(ctx.uid);
        const resolved = resolveStoryId(workspace, rawStoryId);
        if (!resolved.ok) {
          return toolError(resolved.summary, 'STORY_NOT_FOUND');
        }
        const backlog = summarizeBacklog(workspace);
        const story = backlog.epics
          .flatMap((epic) =>
            epic.stories.map((s) => ({
              ...s,
              epicId: epic.id,
              epicTitle: epic.title,
            }))
          )
          .find((s) => s.id === resolved.storyId);
        return toolSuccess(`Historia ${resolved.storyId} encontrada.`, {
          data: story ?? {
            id: resolved.storyId,
            title: resolved.title,
            epicId: resolved.epicId,
          },
          mutated: false,
        });
      }

      case 'create_story': {
        const epicId = asString(args.epicId);
        const title = asString(args.title);
        const description = asString(args.description);
        const acceptanceCriteria = asStringArray(args.acceptanceCriteria) ?? [];
        const rawType = asString(args.type)?.toLowerCase();
        const type =
          rawType === 'bug' || rawType === 'task' || rawType === 'story'
            ? rawType
            : 'story';
        const severityRaw = asString(args.severity)?.toLowerCase();
        const severity =
          severityRaw === 'low' ||
          severityRaw === 'medium' ||
          severityRaw === 'high' ||
          severityRaw === 'critical'
            ? severityRaw
            : undefined;
        const stepsToReproduce = asStringArray(args.stepsToReproduce);
        const technicalNotes = asString(args.technicalNotes);

        if (!epicId || !title || !description) {
          return toolError('Faltan epicId, title o description.', 'INVALID_ARGS');
        }
        if (type === 'story' && acceptanceCriteria.length === 0) {
          return toolError(
            'Se requiere al menos un criterio de aceptación para una historia.',
            'INVALID_ARGS'
          );
        }
        if (type === 'bug' && (!stepsToReproduce || stepsToReproduce.length === 0)) {
          return toolError(
            'Se requiere al menos un paso para reproducir el bug.',
            'INVALID_ARGS'
          );
        }

        let category: FrameworkCategory | undefined;
        const rawCategory = asString(args.category);
        if (rawCategory) {
          const { workspace: current } = await getWorkspaceData(ctx.uid);
          const resolved = resolveCategoryArg(rawCategory, current);
          if (!resolved.ok) {
            return toolError(resolved.summary, 'INVALID_CATEGORY');
          }
          category = resolved.category;
        }

        const sprintRaw = args.sprintId;
        const sprintId =
          sprintRaw === null || sprintRaw === ''
            ? null
            : asString(sprintRaw) ?? undefined;
        const defaultPoints = type === 'bug' ? 1 : 3;
        const { workspace: currentWs } = await getWorkspaceData(ctx.uid);
        const mode = getLiveBacklog(currentWs).estimationMode;
        const durationArg = asString(args.duration);
        if (mode === 'time' && asNumber(args.points) !== undefined) {
          return toolError(
            'Este proyecto estima en tiempo. Usa duration (2d, 3h, 50m, 2.5h), no points.',
            'INVALID_ARGS'
          );
        }
        if (mode === 'story_points' && durationArg) {
          return toolError(
            'Este proyecto estima en Story Points Fibonacci. Usa points, no duration.',
            'INVALID_ARGS'
          );
        }
        const { workspace, storyId } = await createUserStoryAcrossWorkspace(ctx.uid, {
          epicId,
          type,
          title,
          description,
          acceptanceCriteria,
          severity,
          stepsToReproduce,
          technicalNotes,
          points: mode === 'story_points' ? asNumber(args.points) ?? defaultPoints : undefined,
          durationLabel:
            mode === 'time' ? durationArg || defaultDurationLabel(type) : undefined,
          category,
          sprintId: sprintId === undefined ? undefined : sprintId,
        });
        const created = listLiveStories(workspace).find((s) => s.id === storyId);
        const typeLabel =
          type === 'bug' ? 'Bug' : type === 'task' ? 'Task' : 'Historia';
        return toolSuccess(
          `${typeLabel} creado(a)${created ? `: ${created.id}` : ''} — ${title}${
            category ? ` [${category}]` : ''
          }`,
          {
            data: {
              storyId: created?.id,
              type,
              epicId,
              title,
              category: category ?? null,
            },
            mutated: true,
          }
        );
      }

      case 'update_story': {
        const rawStoryId = asString(args.storyId);
        if (!rawStoryId) {
          return toolError('Falta storyId.', 'INVALID_ARGS');
        }
        const { workspace: currentForId } = await getWorkspaceData(ctx.uid);
        const resolvedStory = resolveStoryId(currentForId, rawStoryId);
        if (!resolvedStory.ok) {
          return toolError(resolvedStory.summary, 'STORY_NOT_FOUND');
        }
        const storyId = resolvedStory.storyId;
        const updates: {
          title?: string;
          description?: string;
          acceptanceCriteria?: string[];
          severity?: 'low' | 'medium' | 'high' | 'critical';
          stepsToReproduce?: string[];
          technicalNotes?: string;
        } = {};
        const title = asString(args.title);
        const description = asString(args.description);
        const acceptanceCriteria = asStringArray(args.acceptanceCriteria);
        const severityRaw = asString(args.severity)?.toLowerCase();
        const stepsToReproduce = asStringArray(args.stepsToReproduce);
        const technicalNotes = asString(args.technicalNotes);
        if (title) updates.title = title;
        if (description) updates.description = description;
        if (acceptanceCriteria) updates.acceptanceCriteria = acceptanceCriteria;
        if (
          severityRaw === 'low' ||
          severityRaw === 'medium' ||
          severityRaw === 'high' ||
          severityRaw === 'critical'
        ) {
          updates.severity = severityRaw;
        }
        if (stepsToReproduce) updates.stepsToReproduce = stepsToReproduce;
        if (technicalNotes !== undefined) updates.technicalNotes = technicalNotes;

        const hasSprint = Object.prototype.hasOwnProperty.call(args, 'sprintId');
        const sprintId = hasSprint
          ? args.sprintId === null || args.sprintId === ''
            ? null
            : asString(args.sprintId) ?? null
          : undefined;

        const points = asNumber(args.points);
        const durationArg = asString(args.duration);
        const mode = getLiveBacklog(currentForId).estimationMode;
        const rawCategory = asString(args.category);
        let category: FrameworkCategory | undefined;

        if (rawCategory) {
          const resolved = resolveCategoryArg(rawCategory, currentForId);
          if (!resolved.ok) {
            return toolError(resolved.summary, 'INVALID_CATEGORY');
          }
          category = resolved.category;
        }

        if (mode === 'time' && points !== undefined) {
          return toolError(
            'Este proyecto estima en tiempo. Usa duration (2d, 3h, 50m, 2.5h), no points.',
            'INVALID_ARGS'
          );
        }
        if (mode === 'story_points' && durationArg) {
          return toolError(
            'Este proyecto estima en Story Points Fibonacci. Usa points, no duration.',
            'INVALID_ARGS'
          );
        }

        if (
          Object.keys(updates).length === 0 &&
          !asString(args.epicId) &&
          points === undefined &&
          !durationArg &&
          !category &&
          !hasSprint
        ) {
          return toolError('No hay campos para actualizar.', 'INVALID_ARGS');
        }

        try {
          await updateUserStoryAcrossWorkspace(
            ctx.uid,
            storyId,
            updates,
            points !== undefined
              ? { points, justification: 'Actualizado por Klark.' }
              : durationArg
                ? { durationLabel: durationArg, justification: 'Actualizado por Klark.' }
                : undefined,
            {
              epicId: asString(args.epicId),
              sprintId,
            },
            category
              ? {
                  category,
                  justification: 'Prioridad actualizada por Klark.',
                }
              : undefined
          );
        } catch (err) {
          if (err instanceof SprintLifecycleError) {
            return toolError(err.message, err.code);
          }
          const message = err instanceof Error ? err.message : 'No se pudo actualizar.';
          return toolError(message, 'INVALID_ARGS');
        }

        return toolSuccess(
          category
            ? `Ítem ${storyId} actualizado. Prioridad: ${category}.`
            : `Ítem ${storyId} actualizado.`,
          {
            data: { storyId, updates, points, duration: durationArg ?? null, category: category ?? null, sprintId },
            mutated: true,
          }
        );
      }

      case 'delete_story': {
        const rawStoryId = asString(args.storyId);
        if (!rawStoryId) {
          return toolError('Falta storyId.', 'INVALID_ARGS');
        }
        const { workspace } = await getWorkspaceData(ctx.uid);
        const resolved = resolveStoryId(workspace, rawStoryId);
        if (!resolved.ok) {
          return toolError(resolved.summary, 'STORY_NOT_FOUND');
        }
        const { storyId, title } = resolved;
        assertStoryNotInCompletedSprint(getLiveBacklog(workspace).plan, storyId, 'eliminar');

        if (!asBoolean(args.confirm)) {
          return toolNeedsConfirmation(
            `Se requiere confirmación para eliminar ${storyId} (${title}).`,
            `¿Eliminar ${storyId}: ${title}?`,
            { storyId, title }
          );
        }
        await deleteUserStoryAcrossWorkspace(ctx.uid, storyId);
        return toolSuccess(`Historia ${storyId} eliminada.`, {
          data: { storyId },
          mutated: true,
        });
      }

      case 'create_epic': {
        const title = asString(args.title);
        const description = asString(args.description);
        if (!title || !description) {
          return toolError('Faltan title o description.', 'INVALID_ARGS');
        }
        const { workspace, epicId } = await createEpicAcrossWorkspace(ctx.uid, {
          title,
          description,
        });
        const created = getLiveBacklog(workspace).epics.find((e) => e.id === epicId);
        return toolSuccess(
          `Épica creada${created ? `: ${created.id}` : ''} — ${title}`,
          { data: { epicId: created?.id, title }, mutated: true }
        );
      }

      case 'update_epic': {
        const epicId = asString(args.epicId);
        if (!epicId) {
          return toolError('Falta epicId.', 'INVALID_ARGS');
        }
        const title = asString(args.title);
        const description = asString(args.description);
        if (!title && !description) {
          return toolError('No hay campos para actualizar.', 'INVALID_ARGS');
        }
        await updateEpicAcrossWorkspace(ctx.uid, epicId, { title, description });
        return toolSuccess(`Épica ${epicId} actualizada.`, {
          data: { epicId, title, description },
          mutated: true,
        });
      }

      case 'delete_epic': {
        const rawEpicId = asString(args.epicId);
        if (!rawEpicId) {
          return toolError('Falta epicId.', 'INVALID_ARGS');
        }
        const { workspace } = await getWorkspaceData(ctx.uid);
        const resolved = resolveEpicId(workspace, rawEpicId);
        if (!resolved.ok) {
          return toolError(resolved.summary, 'EPIC_NOT_FOUND');
        }
        const { epicId, title, storyCount } = resolved;
        const live = getLiveBacklog(workspace);
        const epic = live.epics.find((item) => item.id === epicId);
        if (epic) {
          for (const story of epic.userStories) {
            assertStoryNotInCompletedSprint(live.plan, story.id, 'eliminar');
          }
        }

        if (!asBoolean(args.confirm)) {
          return toolNeedsConfirmation(
            `Se requiere confirmación para eliminar ${epicId} (${storyCount} historias).`,
            `¿Eliminar ${epicId}: ${title} y sus ${storyCount} historia(s)?`,
            { epicId, title, storyCount }
          );
        }
        await deleteEpicAcrossWorkspace(ctx.uid, epicId);
        return toolSuccess(`Épica ${epicId} eliminada.`, {
          data: { epicId },
          mutated: true,
        });
      }

      case 'assign_story_sprint': {
        const rawStoryId = asString(args.storyId);
        if (!rawStoryId) {
          return toolError('Falta storyId.', 'INVALID_ARGS');
        }
        const { workspace } = await getWorkspaceData(ctx.uid);
        const resolved = resolveStoryId(workspace, rawStoryId);
        if (!resolved.ok) {
          return toolError(resolved.summary, 'STORY_NOT_FOUND');
        }
        const storyId = resolved.storyId;
        const rawSprintId =
          args.sprintId === null || args.sprintId === ''
            ? null
            : asString(args.sprintId) ?? null;
        let sprintId: string | null = rawSprintId;
        if (rawSprintId) {
          const sprint = resolveSprintId(workspace, rawSprintId);
          if (!sprint.ok) {
            return toolError(sprint.summary, 'SPRINT_NOT_FOUND');
          }
          sprintId = sprint.sprintId;
        }
        await updateUserStoryAcrossWorkspace(ctx.uid, storyId, {}, undefined, { sprintId });
        return toolSuccess(
          sprintId
            ? `Historia ${storyId} asignada a ${sprintId}.`
            : `Historia ${storyId} dejada sin asignar.`,
          { data: { storyId, sprintId }, mutated: true }
        );
      }

      case 'create_sprint': {
        const goal = asString(args.goal);
        const created = await createSprintAcrossWorkspace(ctx.uid, { goal });
        return toolSuccess(`Sprint creado: ${created.sprintId} — ${created.sprintGoal}`, {
          data: {
            sprintId: created.sprintId,
            goal: created.sprintGoal,
          },
          mutated: true,
        });
      }

      case 'update_sprint': {
        const rawSprintId = asString(args.sprintId);
        if (!rawSprintId) {
          return toolError('Falta sprintId.', 'INVALID_ARGS');
        }
        const { workspace } = await getWorkspaceData(ctx.uid);
        const resolved = resolveSprintId(workspace, rawSprintId);
        if (!resolved.ok) {
          return toolError(resolved.summary, 'SPRINT_NOT_FOUND');
        }
        const goal = asString(args.goal);
        const startDate = asString(args.startDate);
        const endDate = asString(args.endDate);
        if (!goal && !startDate && !endDate) {
          return toolError('Indica goal y/o fechas (startDate/endDate).', 'INVALID_ARGS');
        }
        const dates =
          startDate || endDate
            ? {
                ...(startDate ? { startDate } : {}),
                ...(endDate ? { endDate } : {}),
              }
            : undefined;
        await updateSprintAcrossWorkspace(ctx.uid, resolved.sprintId, { goal, dates });
        return toolSuccess(`Sprint ${resolved.sprintId} actualizado.`, {
          data: { sprintId: resolved.sprintId, goal, startDate, endDate },
          mutated: true,
        });
      }

      case 'start_sprint': {
        const rawSprintId = asString(args.sprintId);
        if (!rawSprintId) {
          return toolError('Falta sprintId.', 'INVALID_ARGS');
        }
        const { workspace } = await getWorkspaceData(ctx.uid);
        const resolved = resolveSprintId(workspace, rawSprintId);
        if (!resolved.ok) {
          return toolError(resolved.summary, 'SPRINT_NOT_FOUND');
        }
        await startSprintAcrossWorkspace(ctx.uid, resolved.sprintId);
        return toolSuccess(`Sprint ${resolved.sprintId} iniciado.`, {
          data: { sprintId: resolved.sprintId },
          mutated: true,
        });
      }

      case 'complete_sprint': {
        const rawSprintId = asString(args.sprintId);
        if (!rawSprintId) {
          return toolError('Falta sprintId.', 'INVALID_ARGS');
        }
        const { workspace } = await getWorkspaceData(ctx.uid);
        const resolved = resolveSprintId(workspace, rawSprintId);
        if (!resolved.ok) {
          return toolError(resolved.summary, 'SPRINT_NOT_FOUND');
        }
        const rollover =
          asString(args.rollover) === 'next_planned' ? 'next_planned' : 'backlog';
        await completeSprintAcrossWorkspace(ctx.uid, resolved.sprintId, rollover);
        return toolSuccess(
          `Sprint ${resolved.sprintId} cerrado (incompletas → ${rollover}).`,
          { data: { sprintId: resolved.sprintId, rollover }, mutated: true }
        );
      }

      case 'update_story_status': {
        const rawStoryId = asString(args.storyId);
        const statusRaw = asString(args.status);
        if (!rawStoryId || !statusRaw) {
          return toolError('Faltan storyId o status.', 'INVALID_ARGS');
        }
        const allowed = new Set(KANBAN_COLUMNS.map((c) => c.id));
        if (!allowed.has(statusRaw as KanbanStatus)) {
          return toolError(
            `Estado inválido "${statusRaw}". Usa: ${[...allowed].join(', ')}.`,
            'INVALID_ARGS'
          );
        }
        const { workspace } = await getWorkspaceData(ctx.uid);
        const resolved = resolveStoryId(workspace, rawStoryId);
        if (!resolved.ok) {
          return toolError(resolved.summary, 'STORY_NOT_FOUND');
        }
        await updateStoryExecution(ctx.uid, resolved.storyId, {
          status: statusRaw as KanbanStatus,
        });
        return toolSuccess(`Historia ${resolved.storyId} → ${statusRaw}.`, {
          data: { storyId: resolved.storyId, status: statusRaw },
          mutated: true,
        });
      }

      case 'assign_story': {
        const rawStoryId = asString(args.storyId);
        if (!rawStoryId) {
          return toolError('Falta storyId.', 'INVALID_ARGS');
        }
        const { workspace } = await getWorkspaceData(ctx.uid);
        const resolved = resolveStoryId(workspace, rawStoryId);
        if (!resolved.ok) {
          return toolError(resolved.summary, 'STORY_NOT_FOUND');
        }

        let assigneeId: string | null = null;
        if (args.memberId !== null && args.memberId !== undefined && args.memberId !== '') {
          const rawMember = asString(args.memberId);
          if (!rawMember) {
            return toolError('memberId inválido.', 'INVALID_ARGS');
          }
          const members = workspace.execution?.members ?? [];
          if (members.length === 0) {
            return toolError(
              'No hay miembros en el equipo. Añádelos desde el tablero.',
              'MEMBER_NOT_FOUND'
            );
          }
          const byId = members.find((m) => m.id.toLowerCase() === rawMember.toLowerCase());
          if (byId) {
            assigneeId = byId.id;
          } else {
            const byName = members.filter(
              (m) => m.displayName.toLowerCase() === rawMember.toLowerCase()
            );
            if (byName.length === 1) {
              assigneeId = byName[0].id;
            } else if (byName.length > 1) {
              return toolError(
                `Ambiguo: varios miembros coinciden con "${rawMember}". Usa el ID exacto.`,
                'MEMBER_AMBIGUOUS'
              );
            } else {
              const partial = members.filter((m) =>
                m.displayName.toLowerCase().includes(rawMember.toLowerCase())
              );
              if (partial.length === 1) {
                assigneeId = partial[0].id;
              } else if (partial.length > 1) {
                return toolError(
                  `Ambiguo: varios miembros coinciden con "${rawMember}". Usa el ID exacto.`,
                  'MEMBER_AMBIGUOUS'
                );
              } else {
                return toolError(`No encontré al miembro "${rawMember}".`, 'MEMBER_NOT_FOUND');
              }
            }
          }
        }

        await updateStoryExecution(ctx.uid, resolved.storyId, { assigneeId });
        return toolSuccess(
          assigneeId
            ? `Historia ${resolved.storyId} asignada a ${assigneeId}.`
            : `Historia ${resolved.storyId} sin responsable.`,
          { data: { storyId: resolved.storyId, assigneeId }, mutated: true }
        );
      }

      case 'delete_sprint': {
        const rawSprintId = asString(args.sprintId);
        if (!rawSprintId) {
          return toolError('Falta sprintId.', 'INVALID_ARGS');
        }
        const { workspace } = await getWorkspaceData(ctx.uid);
        const resolved = resolveSprintId(workspace, rawSprintId);
        if (!resolved.ok) {
          return toolError(resolved.summary, 'SPRINT_NOT_FOUND');
        }
        const { sprintId, goal, storyCount, storyIds } = resolved;
        if (storyCount > 0) {
          const preview = storyIds.slice(0, 8).join(', ');
          const extra = storyIds.length > 8 ? '…' : '';
          return toolError(
            `No se puede eliminar ${sprintId}: tiene ${storyCount} historia(s) asignada(s) (${preview}${extra}). Reasígnalas o déjalas sin sprint primero.`,
            'SPRINT_NOT_EMPTY'
          );
        }
        if (!asBoolean(args.confirm)) {
          return toolNeedsConfirmation(
            `Se requiere confirmación para eliminar ${sprintId} (${goal}).`,
            `¿Eliminar ${sprintId}: ${goal}?`,
            { sprintId, goal }
          );
        }
        await deleteSprintAcrossWorkspace(ctx.uid, sprintId);
        return toolSuccess(`Sprint ${sprintId} eliminado.`, {
          data: { sprintId },
          mutated: true,
        });
      }

      case 'get_stack': {
        const { workspace } = await getWorkspaceData(ctx.uid);
        const summary = buildStackContextSummary(workspace);
        return toolSuccess('Stack del proyecto.', {
          data: { stack: workspace.stack ?? null, summary },
          mutated: false,
        });
      }

      case 'save_stack': {
        const { workspace } = await getWorkspaceData(ctx.uid);
        const layerRequirements = inferStackLayerRequirements(
          buildProjectContextForStack(workspace)
        );

        const productKind = asString(args.productKind);
        const architecturePattern = asString(args.architecturePattern);
        const layersRaw = args.layers;
        const rationale = asString(args.rationale) ?? '';

        if (!productKind || !architecturePattern || !layersRaw || typeof layersRaw !== 'object') {
          return toolError('Faltan productKind, architecturePattern o layers.', 'INVALID_ARGS');
        }

        const raw: StackRecommendRaw = {
          productKind,
          architecturePattern,
          layers: layersRaw as StackRecommendRaw['layers'],
          rationale,
        };

        let stack: ReturnType<typeof normalizeStackFromToolArgs>;
        try {
          stack = normalizeStackFromToolArgs(raw);
        } catch {
          return toolError(
            'El stack no es válido. Usa catalogId del catálogo o customName con capas coherentes.',
            'INVALID_ARGS'
          );
        }

        if (countStackItems(stack) === 0) {
          return toolError('El stack debe incluir al menos una tecnología.', 'INVALID_ARGS');
        }

        stack.status = 'saved';
        stack = pruneStackToAllowedLayers(stack, layerRequirements);
        stack.warnings = validateStackCompatibility(stack);

        await saveStackAcrossWorkspace(ctx.uid, stack);
        return toolSuccess('Stack guardado.', { data: stack, mutated: true });
      }

      default:
        return toolError(`Tool desconocida: ${name}`, 'UNKNOWN_TOOL');
    }
  } catch (error) {
    if (error instanceof SprintLifecycleError) {
      return toolError(error.message, error.code);
    }
    if (error instanceof DurationParseError) {
      return toolError(error.message, 'INVALID_ARGS');
    }
    const message = error instanceof Error ? error.message : 'Error al ejecutar la tool';
    if (
      message.includes('estima en tiempo') ||
      message.includes('estima en Story Points') ||
      message.includes('Fibonacci') ||
      message.includes('duración')
    ) {
      return toolError(message, 'INVALID_ARGS');
    }
    return toolError(message, 'TOOL_EXCEPTION');
  }
}
