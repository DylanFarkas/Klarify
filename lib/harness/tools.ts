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
  deleteEpicAcrossWorkspace,
  deleteSprintAcrossWorkspace,
  deleteUserStoryAcrossWorkspace,
  getWorkspaceData,
  updateEpicAcrossWorkspace,
  updateUserStoryAcrossWorkspace,
} from '@/lib/workspace-service';
import { getLiveBacklog, listLiveStories } from '@/lib/utils/live-backlog';

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
            .map((s) => `${s.id} «${truncate(s.title)}»`)
            .join('; ');
    return `- ${epic.id} «${truncate(epic.title)}»: ${stories}`;
  });

  const sprintLines =
    !plan || plan.sprints.length === 0
      ? ['- (sin sprints)']
      : plan.sprints.map((sprint) => {
          const stories =
            sprint.storyIds.length === 0
              ? 'vacío'
              : `${sprint.storyIds.length} HU: ${sprint.storyIds.join(', ')}`;
          return `- ${sprint.id} «${truncate(sprint.sprintGoal)}» (${stories})`;
        });

  return [
    `Épicas: ${epics.length}. Historias: ${epics.reduce((n, e) => n + e.userStories.length, 0)}.`,
    ...epicLines,
    `Sprints: ${plan?.sprints.length ?? 0}.`,
    ...sprintLines,
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

/** Extrae el número de un ID tipo HU-028, STORY-28, "hu 28", "28". */
function extractEntityNumber(raw: string): number | null {
  const trimmed = raw.trim();
  const prefixed = trimmed.match(
    /^(?:HU|STORY|US|USER[\s_-]?STORY|HISTORIA)[\s_-]*0*(\d+)$/i
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
  const priorities = live.priorities;
  const framework = resolveWorkspaceFramework(workspace);
  const frameworkMeta = describeFrameworkCategories(framework);
  const plan = live.plan;
  const labels = frameworkMeta.categoryLabels;

  return {
    framework: frameworkMeta.framework,
    frameworkLabel: frameworkMeta.frameworkLabel,
    allowedPriorityCategories: frameworkMeta.allowedCategories,
    priorityCategoryLabels: labels,
    epicCount: live.epics.length,
    storyCount: live.epics.reduce((n, e) => n + e.userStories.length, 0),
    sprints:
      plan?.sprints.map((sprint) => ({
        id: sprint.id,
        number: sprint.number,
        goal: sprint.sprintGoal,
        storyIds: sprint.storyIds,
        velocitySp: sprint.velocitySp,
      })) ?? [],
    unassignedStoryIds: plan?.unassignedStoryIds ?? [],
    epics: live.epics.map((epic) => ({
      id: epic.id,
      title: epic.title,
      description: epic.description,
      stories: epic.userStories.map((story) => {
        const priorityCode = priorities[story.id]?.category ?? null;
        return {
          id: story.id,
          title: story.title,
          description: story.description,
          acceptanceCriteria: story.acceptanceCriteria,
          points: estimations[story.id]?.points ?? null,
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
      'Lista el backlog actual: épicas, historias, puntos, prioridad y asignación a sprints.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'get_story',
    description:
      'Obtiene una historia por ID (HU-XXX, "28", etc.). Úsala para verificar existencia o leer detalle antes de mutar.',
    parameters: {
      type: 'object',
      properties: {
        storyId: {
          type: 'string',
          description: 'ID de la historia. Preferir HU-XXX.',
        },
      },
      required: ['storyId'],
    },
  },
  {
    name: 'create_story',
    description: 'Crea una historia de usuario en una épica existente.',
    parameters: {
      type: 'object',
      properties: {
        epicId: { type: 'string', description: 'ID de la épica (p. ej. EPIC-001)' },
        title: { type: 'string' },
        description: {
          type: 'string',
          description: 'Formato preferido: Como… quiero… para…',
        },
        acceptanceCriteria: {
          type: 'array',
          items: { type: 'string' },
          description: 'Criterios de aceptación',
        },
        points: { type: 'number', description: 'Story points (Fibonacci). Default 3.' },
        category: {
          type: 'string',
          description:
            'Código canónico de prioridad del framework activo: moscow→must|should|could|wont; wsjf→critical|high|medium|low; rice→quick-win|major-project|fill-in|thankless; value-effort→high-value-low-effort|...',
        },
        sprintId: {
          type: 'string',
          description: 'ID de sprint opcional; omite para dejar sin asignar',
          nullable: true,
        },
      },
      required: ['epicId', 'title', 'description', 'acceptanceCriteria'],
    },
  },
  {
    name: 'update_story',
    description:
      'Actualiza una historia (título, descripción, CA, épica, puntos, prioridad o sprint). Para priorizar usa category con el código canónico (must/should/could/wont si MoSCoW).',
    parameters: {
      type: 'object',
      properties: {
        storyId: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        acceptanceCriteria: { type: 'array', items: { type: 'string' } },
        epicId: { type: 'string', description: 'Mover a otra épica' },
        points: { type: 'number' },
        category: {
          type: 'string',
          description:
            'Código canónico de prioridad (p. ej. must, should, could, wont). No uses "Should-have".',
        },
        sprintId: {
          type: 'string',
          description: 'Nuevo sprint; null o cadena vacía para desasignar',
          nullable: true,
        },
      },
      required: ['storyId'],
    },
  },
  {
    name: 'delete_story',
    description:
      'Elimina una historia. Requiere confirm=true tras confirmación explícita del usuario.',
    parameters: {
      type: 'object',
      properties: {
        storyId: {
          type: 'string',
          description:
            'ID de la historia. Preferir HU-XXX (p. ej. HU-028). También acepta "28", "HU-28" o alias.',
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
    description: 'Asigna una historia a un sprint o la deja sin asignar.',
    parameters: {
      type: 'object',
      properties: {
        storyId: { type: 'string' },
        sprintId: {
          type: 'string',
          description: 'ID del sprint; null o vacío para desasignar',
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
        if (!epicId || !title || !description) {
          return toolError('Faltan epicId, title o description.', 'INVALID_ARGS');
        }
        if (acceptanceCriteria.length === 0) {
          return toolError(
            'Se requiere al menos un criterio de aceptación.',
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
        const { workspace, storyId } = await createUserStoryAcrossWorkspace(ctx.uid, {
          epicId,
          title,
          description,
          acceptanceCriteria,
          points: asNumber(args.points) ?? 3,
          category,
          sprintId: sprintId === undefined ? undefined : sprintId,
        });
        const created = listLiveStories(workspace).find((s) => s.id === storyId);
        return toolSuccess(
          `Historia creada${created ? `: ${created.id}` : ''} — ${title}${
            category ? ` [${category}]` : ''
          }`,
          {
            data: { storyId: created?.id, epicId, title, category: category ?? null },
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
        } = {};
        const title = asString(args.title);
        const description = asString(args.description);
        const acceptanceCriteria = asStringArray(args.acceptanceCriteria);
        if (title) updates.title = title;
        if (description) updates.description = description;
        if (acceptanceCriteria) updates.acceptanceCriteria = acceptanceCriteria;

        const hasSprint = Object.prototype.hasOwnProperty.call(args, 'sprintId');
        const sprintId = hasSprint
          ? args.sprintId === null || args.sprintId === ''
            ? null
            : asString(args.sprintId) ?? null
          : undefined;

        const points = asNumber(args.points);
        const rawCategory = asString(args.category);
        let category: FrameworkCategory | undefined;

        if (rawCategory) {
          const resolved = resolveCategoryArg(rawCategory, currentForId);
          if (!resolved.ok) {
            return toolError(resolved.summary, 'INVALID_CATEGORY');
          }
          category = resolved.category;
        }

        if (
          Object.keys(updates).length === 0 &&
          !asString(args.epicId) &&
          points === undefined &&
          !category &&
          !hasSprint
        ) {
          return toolError('No hay campos para actualizar.', 'INVALID_ARGS');
        }

        await updateUserStoryAcrossWorkspace(
          ctx.uid,
          storyId,
          updates,
          points !== undefined
            ? { points, justification: 'Actualizado por Klark.' }
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

        return toolSuccess(
          category
            ? `Historia ${storyId} actualizada. Prioridad: ${category}.`
            : `Historia ${storyId} actualizada.`,
          {
            data: { storyId, updates, points, category: category ?? null, sprintId },
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

      default:
        return toolError(`Tool desconocida: ${name}`, 'UNKNOWN_TOOL');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al ejecutar la tool';
    return toolError(message, 'TOOL_EXCEPTION');
  }
}
