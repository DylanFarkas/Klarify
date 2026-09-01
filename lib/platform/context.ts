/**
 * @fileoverview Contexto compacto y export completo para agentes de código.
 */

import type { UserWorkspace } from '@/lib/types/workspace';
import { getLiveBacklog, listLiveStories } from '@/lib/utils/live-backlog';
import { findActiveSprint } from '@/lib/utils/sprint-plan-mutations';
import { getSprintStatus } from '@/lib/types/agent-5';
import { formatEstimation, formatEffortTotal } from '@/lib/utils/estimation';
import { getPriorityRank } from '@/lib/utils/priority-rank';
import { buildStackContextSummary } from '@/lib/services/stack-service';
import { buildBacklogIndex } from '@/lib/harness/tools';
import { resolveProjectExport } from '@/lib/export/resolve-project-export';
import { formatProjectAsMarkdown } from '@/lib/export/format-markdown';
import { formatProjectAsJson } from '@/lib/export/format-json';
import { KANBAN_COLUMNS } from '@/lib/types/execution';
import type { KanbanStatus } from '@/lib/types/execution';

export interface CompactProjectContext {
  projectId: string;
  projectName: string;
  estimationMode: string;
  framework: string | null;
  stackSummary: string;
  index: string;
  activeSprint: {
    id: string;
    number: number;
    goal: string;
    status: string;
    storyIds: string[];
  } | null;
  next: CompactStory | null;
  epicCount: number;
  storyCount: number;
}

export interface CompactStory {
  id: string;
  type: string;
  title: string;
  epicId: string;
  epicTitle: string;
  description: string;
  acceptanceCriteria: string[];
  subtasks: Array<{ id: string; title: string; done: boolean }>;
  points: number | null;
  duration: string | null;
  priority: string | null;
  sprintId: string | null;
  status: KanbanStatus | null;
}

function storySprintId(workspace: UserWorkspace, storyId: string): string | null {
  const plan = getLiveBacklog(workspace).plan;
  if (!plan) return null;
  for (const sprint of plan.sprints) {
    if (sprint.storyIds.includes(storyId)) return sprint.id;
  }
  return null;
}

export function compactStory(
  workspace: UserWorkspace,
  storyId: string,
  epicId: string,
  epicTitle: string
): CompactStory | null {
  const live = getLiveBacklog(workspace);
  const epic = live.epics.find((item) => item.id === epicId);
  const story = epic?.userStories.find((item) => item.id === storyId);
  if (!story) return null;
  const estimation = live.estimations[story.id];
  const exec = workspace.execution?.stories?.[story.id];
  return {
    id: story.id,
    type: story.type ?? 'story',
    title: story.title,
    epicId,
    epicTitle,
    description: story.description,
    acceptanceCriteria: story.acceptanceCriteria,
    subtasks: (story.subtasks ?? []).map((subtask) => ({
      id: subtask.id,
      title: subtask.title,
      done: subtask.done,
    })),
    points: live.estimationMode === 'story_points' ? estimation?.points ?? null : null,
    duration:
      live.estimationMode === 'time' ? formatEstimation(estimation, 'time') : null,
    priority: live.priorities[story.id]?.category ?? null,
    sprintId: storySprintId(workspace, story.id),
    status: exec?.status ?? null,
  };
}

export function pickNextStory(workspace: UserWorkspace): CompactStory | null {
  const live = getLiveBacklog(workspace);
  const active = live.plan ? findActiveSprint(live.plan) : null;
  const stories = listLiveStories(workspace);
  const pool = active
    ? stories.filter((story) => active.storyIds.includes(story.id))
    : stories;
  const exec = workspace.execution?.stories ?? {};
  const open = pool.filter((story) => (exec[story.id]?.status ?? 'todo') !== 'done');
  const framework = live.framework ?? 'moscow';
  open.sort((a, b) => {
    const rankA = getPriorityRank(framework, live.priorities[a.id]?.category ?? '');
    const rankB = getPriorityRank(framework, live.priorities[b.id]?.category ?? '');
    if (rankA !== rankB) return rankA - rankB;
    return a.id.localeCompare(b.id);
  });
  const first = open[0];
  if (!first) return null;
  const epic = live.epics.find((item) => item.id === first.epicId);
  return compactStory(workspace, first.id, first.epicId, epic?.title ?? first.epicId);
}

export function buildCompactContext(
  workspace: UserWorkspace,
  projectId: string,
  projectName: string
): CompactProjectContext {
  const live = getLiveBacklog(workspace);
  const active = live.plan ? findActiveSprint(live.plan) : null;
  const storyCount = live.epics.reduce((n, epic) => n + epic.userStories.length, 0);

  return {
    projectId,
    projectName,
    estimationMode: live.estimationMode,
    framework: live.framework,
    stackSummary: buildStackContextSummary(workspace),
    index: buildBacklogIndex(workspace),
    activeSprint: active
      ? {
          id: active.id,
          number: active.number,
          goal: active.sprintGoal,
          status: getSprintStatus(active),
          storyIds: active.storyIds,
        }
      : null,
    next: pickNextStory(workspace),
    epicCount: live.epics.length,
    storyCount,
  };
}

export function renderCompactMarkdown(ctx: CompactProjectContext): string {
  const lines = [
    `# ${ctx.projectName}`,
    '',
    `Proyecto: \`${ctx.projectId}\``,
    `Estimación: ${ctx.estimationMode}${ctx.framework ? ` · Prioridad: ${ctx.framework}` : ''}`,
    `Épicas: ${ctx.epicCount} · Historias: ${ctx.storyCount}`,
    '',
    '## Stack',
    ctx.stackSummary,
    '',
    '## Sprint activo',
    ctx.activeSprint
      ? `${ctx.activeSprint.id} [${ctx.activeSprint.status}] ${ctx.activeSprint.goal}`
      : '_Ninguno_',
    '',
    '## Siguiente ítem',
    ctx.next
      ? `${ctx.next.id} (${ctx.next.type}) ${ctx.next.title}${ctx.next.status ? ` · ${ctx.next.status}` : ''}`
      : '_No hay ítems pendientes_',
    '',
    '## Índice',
    ctx.index,
    '',
    `Estados Kanban: ${KANBAN_COLUMNS.map((c) => c.id).join(', ')}.`,
  ];
  return lines.join('\n');
}

export function buildFullExport(
  workspace: UserWorkspace,
  projectName: string,
  format: 'json' | 'markdown'
): { content: string; filename: string; mimeType: string } {
  const payload = resolveProjectExport(workspace, projectName);
  const result =
    format === 'markdown' ? formatProjectAsMarkdown(payload) : formatProjectAsJson(payload);
  return {
    content: result.content ?? '',
    filename: result.filename,
    mimeType: result.mimeType,
  };
}

export function serializeLiveBacklog(workspace: UserWorkspace) {
  const live = getLiveBacklog(workspace);
  const exec = workspace.execution?.stories ?? {};
  return {
    estimationMode: live.estimationMode,
    framework: live.framework,
    epics: live.epics.map((epic) => ({
      id: epic.id,
      title: epic.title,
      description: epic.description,
      stories: epic.userStories.map((story) => ({
        id: story.id,
        type: story.type ?? 'story',
        title: story.title,
        description: story.description,
        acceptanceCriteria: story.acceptanceCriteria,
        subtasks: story.subtasks ?? [],
        severity: story.severity ?? null,
        stepsToReproduce: story.stepsToReproduce ?? null,
        technicalNotes: story.technicalNotes ?? null,
        points: live.estimations[story.id]?.points ?? null,
        effort: formatEstimation(live.estimations[story.id], live.estimationMode),
        effortTotalHint: formatEffortTotal(
          live.estimations[story.id]?.points ?? 0,
          live.estimationMode
        ),
        priority: live.priorities[story.id]?.category ?? null,
        sprintId: storySprintId(workspace, story.id),
        status: exec[story.id]?.status ?? null,
        assigneeId: exec[story.id]?.assigneeId ?? null,
      })),
    })),
    sprints:
      live.plan?.sprints.map((sprint) => ({
        id: sprint.id,
        number: sprint.number,
        goal: sprint.sprintGoal,
        status: getSprintStatus(sprint),
        storyIds: sprint.storyIds,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        velocitySp: sprint.velocitySp,
      })) ?? [],
    unassignedStoryIds: live.plan?.unassignedStoryIds ?? [],
    stack: workspace.stack ?? null,
  };
}
