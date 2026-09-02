/**
 * @fileoverview Operaciones de plataforma (CLI/agentes) sobre workspace-service.
 * No pasa por Klark ni por /api/harness/chat.
 */

import 'server-only';

import {
  createCliToken,
  listCliTokens,
  revokeCliToken,
  type CliTokenRecord,
} from '@/lib/platform/tokens';
import {
  authorizeDevice,
  originFromRequest,
  pollDeviceAuth,
  startDeviceAuth,
} from '@/lib/platform/device-auth';
import { platformInvalid } from '@/lib/platform/errors';
import {
  resolveEpicId,
  resolveSprintId,
  resolveStoryId,
  canonicalizeSubtaskId,
} from '@/lib/platform/ids';
import {
  buildCompactContext,
  buildFullExport,
  compactStory,
  pickNextStory,
  renderCompactMarkdown,
  serializeLiveBacklog,
} from '@/lib/platform/context';
import {
  createEpicAcrossWorkspace,
  createSprintAcrossWorkspace,
  createSubtaskAcrossWorkspace,
  createUserStoryAcrossWorkspace,
  importBacklogAcrossWorkspace,
  completeSprintAcrossWorkspace,
  deleteEpicAcrossWorkspace,
  deleteSprintAcrossWorkspace,
  deleteSubtaskAcrossWorkspace,
  deleteUserStoryAcrossWorkspace,
  ensureExecutionInitialized,
  ensurePlatformLiveBacklog,
  getStackFromWorkspace,
  getWorkspaceData,
  saveStackAcrossWorkspace,
  startSprintAcrossWorkspace,
  updateEpicAcrossWorkspace,
  updateSprintAcrossWorkspace,
  updateStoryExecution,
  updateSubtaskAcrossWorkspace,
  updateUserStoryAcrossWorkspace,
} from '@/lib/workspace-service';
import { ensureUserAccount, resolveUserPlan } from '@/lib/plans/plan-service';
import { createProject, listProjects, switchProject } from '@/lib/project-service';
import { getLiveBacklog } from '@/lib/utils/live-backlog';
import { normalizeSubtasks } from '@/lib/utils/work-item-validation';
import { normalizeStackFromToolArgs, countStackItems } from '@/lib/stack/normalize';
import { pruneStackToAllowedLayers } from '@/lib/stack/layer-requirements';
import { validateStackCompatibility } from '@/lib/stack/compatibility';
import {
  buildProjectContextForStack,
  inferStackLayerRequirements,
} from '@/lib/stack/layer-requirements';
import type { StackRecommendRaw } from '@/lib/types/stack';
import type { KanbanStatus } from '@/lib/types/execution';
import type { UserWorkspace } from '@/lib/types/workspace';
import { projectRef, projectsColRef } from '@/lib/project-store/paths';

async function loadWorkspace(uid: string, projectId: string): Promise<UserWorkspace> {
  const data = await getWorkspaceData(uid, { scope: 'shell', projectId });
  return data.workspace;
}

async function projectName(uid: string, projectId: string): Promise<string> {
  const snap = await projectRef(uid, projectId).get();
  return (snap.data()?.name as string | undefined) ?? projectId;
}

async function prepareWrite(uid: string, projectId: string): Promise<UserWorkspace> {
  return ensurePlatformLiveBacklog(uid, projectId);
}

export async function platformWhoami(uid: string) {
  const [userSnap, countSnap] = await Promise.all([
    ensureUserAccount(uid),
    projectsColRef(uid).where('status', 'in', ['active', 'locked']).count().get(),
  ]);
  const plan = await resolveUserPlan(uid, userSnap);
  const prefs = userSnap.data()?.preferences as { activeProjectId?: string } | undefined;
  return {
    uid,
    activeProjectId: prefs?.activeProjectId ?? null,
    plan: { id: plan.id, limits: plan.limits },
    projectCount: countSnap.data().count,
    email: userSnap.data()?.email ?? null,
  };
}

export async function platformListTokens(uid: string): Promise<CliTokenRecord[]> {
  return listCliTokens(uid);
}

export async function platformCreateToken(uid: string, name?: string) {
  return createCliToken(uid, name?.trim() || 'CLI');
}

export async function platformRevokeToken(uid: string, tokenId: string) {
  await revokeCliToken(uid, tokenId);
  return { ok: true, id: tokenId };
}

export async function platformStartDevice(request: Request) {
  return startDeviceAuth(originFromRequest(request));
}

export async function platformPollDevice(deviceCode: string) {
  return pollDeviceAuth(deviceCode);
}

export async function platformAuthorizeDevice(uid: string, userCode: string) {
  return authorizeDevice(uid, userCode);
}

export async function platformListProjects(uid: string) {
  const { projects, activeProjectId, plan } = await listProjects(uid);
  return {
    projects,
    activeProjectId,
    plan: { id: plan.id, limits: plan.limits },
  };
}

export async function platformCreateProject(uid: string, name: string) {
  const project = await createProject(uid, name);
  await ensurePlatformLiveBacklog(uid, project.id);
  return { project };
}

export async function platformUseProject(uid: string, projectId: string) {
  const result = await switchProject(uid, projectId, { workspaceScope: 'shell' });
  return {
    project: result.project,
    activeProjectId: result.project.id,
    backlog: serializeLiveBacklog(result.workspace),
  };
}

export async function platformContext(
  uid: string,
  projectId: string,
  options: { full?: boolean; format?: 'json' | 'markdown' }
) {
  const workspace = await loadWorkspace(uid, projectId);
  const name = await projectName(uid, projectId);
  if (options.full) {
    const format = options.format === 'markdown' ? 'markdown' : 'json';
    const exported = buildFullExport(workspace, name, format);
    return { format, ...exported };
  }
  const compact = buildCompactContext(workspace, projectId, name);
  if (options.format === 'markdown') {
    return { format: 'markdown' as const, content: renderCompactMarkdown(compact), compact };
  }
  return { format: 'json' as const, compact };
}

export async function platformListBacklog(uid: string, projectId: string) {
  const workspace = await loadWorkspace(uid, projectId);
  return serializeLiveBacklog(workspace);
}

export async function platformImportBacklog(
  uid: string,
  projectId: string,
  body: {
    epics: Array<{
      title: string;
      description: string;
      stories: Array<{
        type?: import('@/lib/types/agent-2').WorkItemType;
        title?: string;
        description?: string;
        acceptanceCriteria?: string[];
        subtasks?: unknown;
        severity?: import('@/lib/types/agent-2').BugSeverity;
        stepsToReproduce?: string[];
        technicalNotes?: string;
        points?: number;
        duration?: string;
        durationLabel?: string;
        category?: import('@/lib/types/agent-4').FrameworkCategory;
      }>;
    }>;
  }
) {
  await prepareWrite(uid, projectId);
  return importBacklogAcrossWorkspace(
    uid,
    {
      epics: body.epics.map((epic) => ({
        title: epic.title,
        description: epic.description,
        stories: epic.stories.map((story) => ({
          type: story.type,
          title: story.title ?? '',
          description: story.description ?? '',
          acceptanceCriteria: story.acceptanceCriteria ?? [],
          subtasks: story.subtasks !== undefined ? normalizeSubtasks(story.subtasks) : undefined,
          severity: story.severity,
          stepsToReproduce: story.stepsToReproduce,
          technicalNotes: story.technicalNotes,
          points: story.points,
          durationLabel: story.duration ?? story.durationLabel,
          category: story.category,
        })),
      })),
    },
    projectId
  );
}

export async function platformListStories(uid: string, projectId: string) {
  const backlog = await platformListBacklog(uid, projectId);
  const stories = backlog.epics.flatMap((epic) =>
    epic.stories.map((story) => ({
      ...story,
      epicId: epic.id,
      epicTitle: epic.title,
    }))
  );
  return { stories };
}

export async function platformCreateEpic(
  uid: string,
  projectId: string,
  input: { title: string; description: string }
) {
  await prepareWrite(uid, projectId);
  const { epicId } = await createEpicAcrossWorkspace(uid, input, projectId);
  return { epicId, title: input.title };
}

export async function platformUpdateEpic(
  uid: string,
  projectId: string,
  rawEpicId: string,
  updates: { title?: string; description?: string }
) {
  const workspace = await prepareWrite(uid, projectId);
  const { epicId } = resolveEpicId(workspace, rawEpicId);
  await updateEpicAcrossWorkspace(uid, epicId, updates, projectId);
  return { epicId, ...updates };
}

export async function platformDeleteEpic(
  uid: string,
  projectId: string,
  rawEpicId: string,
  confirm: boolean
) {
  const workspace = await prepareWrite(uid, projectId);
  const resolved = resolveEpicId(workspace, rawEpicId);
  if (!confirm) {
    throw platformInvalid(
      `Se requiere confirmación para eliminar ${resolved.epicId} (${resolved.storyCount} historias). Pasa confirm=true.`,
      'NEEDS_CONFIRMATION'
    );
  }
  await deleteEpicAcrossWorkspace(uid, resolved.epicId, projectId);
  return { ok: true, epicId: resolved.epicId };
}

export async function platformGetStory(uid: string, projectId: string, rawStoryId: string) {
  const workspace = await loadWorkspace(uid, projectId);
  const resolved = resolveStoryId(workspace, rawStoryId);
  const live = getLiveBacklog(workspace);
  const epic = live.epics.find((item) => item.id === resolved.epicId);
  const story = compactStory(workspace, resolved.storyId, resolved.epicId, epic?.title ?? resolved.epicId);
  return { story };
}

export async function platformCreateStory(
  uid: string,
  projectId: string,
  input: Parameters<typeof createUserStoryAcrossWorkspace>[1]
) {
  const workspace = await prepareWrite(uid, projectId);
  const { epicId } = resolveEpicId(workspace, input.epicId);
  const { storyId } = await createUserStoryAcrossWorkspace(
    uid,
    { ...input, epicId },
    projectId
  );
  return { storyId, epicId };
}

export async function platformUpdateStory(
  uid: string,
  projectId: string,
  rawStoryId: string,
  patch: {
    title?: string;
    description?: string;
    acceptanceCriteria?: string[];
    subtasks?: unknown;
    severity?: import('@/lib/types/agent-2').BugSeverity;
    stepsToReproduce?: string[];
    technicalNotes?: string;
    epicId?: string;
    sprintId?: string | null;
    points?: number;
    duration?: string;
    category?: import('@/lib/types/agent-4').FrameworkCategory;
  }
) {
  const workspace = await prepareWrite(uid, projectId);
  const resolved = resolveStoryId(workspace, rawStoryId);
  let epicId: string | undefined;
  if (patch.epicId) {
    epicId = resolveEpicId(workspace, patch.epicId).epicId;
  }
  let sprintId = patch.sprintId;
  if (typeof sprintId === 'string' && sprintId.trim()) {
    sprintId = resolveSprintId(workspace, sprintId).sprintId;
  }

  const live = getLiveBacklog(workspace);
  const mode = live.estimationMode;
  if (mode === 'time' && patch.points !== undefined) {
    throw platformInvalid('Este proyecto estima en tiempo. Usa duration, no points.');
  }
  if (mode === 'story_points' && patch.duration) {
    throw platformInvalid('Este proyecto estima en Story Points. Usa points, no duration.');
  }

  await updateUserStoryAcrossWorkspace(
    uid,
    resolved.storyId,
    {
      title: patch.title,
      description: patch.description,
      acceptanceCriteria: patch.acceptanceCriteria,
      subtasks: patch.subtasks !== undefined ? normalizeSubtasks(patch.subtasks) : undefined,
      severity: patch.severity,
      stepsToReproduce: patch.stepsToReproduce,
      technicalNotes: patch.technicalNotes,
    },
    patch.points !== undefined
      ? { points: patch.points, justification: 'Actualizado por CLI.' }
      : patch.duration
        ? { durationLabel: patch.duration, justification: 'Actualizado por CLI.' }
        : undefined,
    { epicId, sprintId },
    patch.category
      ? { category: patch.category, justification: 'Prioridad actualizada por CLI.' }
      : undefined,
    projectId
  );
  return { ok: true, storyId: resolved.storyId };
}

export async function platformDeleteStory(
  uid: string,
  projectId: string,
  rawStoryId: string,
  confirm: boolean
) {
  const workspace = await prepareWrite(uid, projectId);
  const resolved = resolveStoryId(workspace, rawStoryId);
  if (!confirm) {
    throw platformInvalid(
      `Se requiere confirmación para eliminar ${resolved.storyId} (${resolved.title}). Pasa confirm=true.`,
      'NEEDS_CONFIRMATION'
    );
  }
  await deleteUserStoryAcrossWorkspace(uid, resolved.storyId, projectId);
  return { ok: true, storyId: resolved.storyId };
}

export async function platformCreateSubtask(
  uid: string,
  projectId: string,
  rawStoryId: string,
  title: string
) {
  const workspace = await prepareWrite(uid, projectId);
  const resolved = resolveStoryId(workspace, rawStoryId);
  const { subtask } = await createSubtaskAcrossWorkspace(
    uid,
    resolved.storyId,
    title,
    projectId
  );
  return { storyId: resolved.storyId, subtask };
}

export async function platformUpdateSubtask(
  uid: string,
  projectId: string,
  rawStoryId: string,
  rawSubtaskId: string,
  updates: { title?: string; done?: boolean }
) {
  const workspace = await prepareWrite(uid, projectId);
  const resolved = resolveStoryId(workspace, rawStoryId);
  const { subtask } = await updateSubtaskAcrossWorkspace(
    uid,
    resolved.storyId,
    canonicalizeSubtaskId(rawSubtaskId),
    updates,
    projectId
  );
  return { storyId: resolved.storyId, subtask };
}

export async function platformDeleteSubtask(
  uid: string,
  projectId: string,
  rawStoryId: string,
  rawSubtaskId: string
) {
  const workspace = await prepareWrite(uid, projectId);
  const resolved = resolveStoryId(workspace, rawStoryId);
  const subtaskId = canonicalizeSubtaskId(rawSubtaskId);
  await deleteSubtaskAcrossWorkspace(uid, resolved.storyId, subtaskId, projectId);
  return { ok: true, storyId: resolved.storyId, subtaskId };
}

export async function platformSetStatus(
  uid: string,
  projectId: string,
  rawStoryId: string,
  status: KanbanStatus
) {
  const workspace = await prepareWrite(uid, projectId);
  const resolved = resolveStoryId(workspace, rawStoryId);
  try {
    await ensureExecutionInitialized(uid, projectId);
  } catch (error) {
    if (error instanceof Error && error.message === 'PIPELINE_INCOMPLETE') {
      throw error;
    }
    throw error;
  }
  await updateStoryExecution(uid, resolved.storyId, { status }, projectId);
  return { storyId: resolved.storyId, status };
}

export async function platformCreateSprint(
  uid: string,
  projectId: string,
  goal?: string
) {
  await prepareWrite(uid, projectId);
  const created = await createSprintAcrossWorkspace(uid, { goal }, projectId);
  return { sprintId: created.sprintId, goal: created.sprintGoal };
}

export async function platformUpdateSprint(
  uid: string,
  projectId: string,
  rawSprintId: string,
  updates: { goal?: string; startDate?: string; endDate?: string }
) {
  const workspace = await prepareWrite(uid, projectId);
  const resolved = resolveSprintId(workspace, rawSprintId);
  const dates =
    updates.startDate || updates.endDate
      ? {
          ...(updates.startDate ? { startDate: updates.startDate } : {}),
          ...(updates.endDate ? { endDate: updates.endDate } : {}),
        }
      : undefined;
  await updateSprintAcrossWorkspace(
    uid,
    resolved.sprintId,
    { goal: updates.goal, dates },
    projectId
  );
  return { sprintId: resolved.sprintId, ...updates };
}

export async function platformStartSprint(uid: string, projectId: string, rawSprintId: string) {
  const workspace = await prepareWrite(uid, projectId);
  const resolved = resolveSprintId(workspace, rawSprintId);
  await startSprintAcrossWorkspace(uid, resolved.sprintId, projectId);
  return { sprintId: resolved.sprintId, status: 'active' };
}

export async function platformCompleteSprint(
  uid: string,
  projectId: string,
  rawSprintId: string,
  rollover?: 'backlog' | 'next_planned'
) {
  const workspace = await prepareWrite(uid, projectId);
  const resolved = resolveSprintId(workspace, rawSprintId);
  await completeSprintAcrossWorkspace(
    uid,
    resolved.sprintId,
    rollover ?? 'backlog',
    projectId
  );
  return { sprintId: resolved.sprintId, rollover: rollover ?? 'backlog' };
}

export async function platformDeleteSprint(
  uid: string,
  projectId: string,
  rawSprintId: string,
  confirm: boolean
) {
  const workspace = await prepareWrite(uid, projectId);
  const resolved = resolveSprintId(workspace, rawSprintId);
  if (resolved.storyCount > 0) {
    throw platformInvalid(
      `No se puede eliminar ${resolved.sprintId}: tiene ${resolved.storyCount} historia(s).`,
      'SPRINT_NOT_EMPTY'
    );
  }
  if (!confirm) {
    throw platformInvalid(
      `Se requiere confirmación para eliminar ${resolved.sprintId}. Pasa confirm=true.`,
      'NEEDS_CONFIRMATION'
    );
  }
  await deleteSprintAcrossWorkspace(uid, resolved.sprintId, projectId);
  return { ok: true, sprintId: resolved.sprintId };
}

export async function platformGetStack(uid: string, projectId: string) {
  const stack = await getStackFromWorkspace(uid, projectId);
  const workspace = await loadWorkspace(uid, projectId);
  return {
    stack,
    summary: (await import('@/lib/services/stack-service')).buildStackContextSummary(workspace),
  };
}

export async function platformSaveStack(
  uid: string,
  projectId: string,
  raw: {
    productKind: string;
    architecturePattern: string;
    layers: Record<string, unknown>;
    rationale?: string;
  }
) {
  await prepareWrite(uid, projectId);
  const workspace = await loadWorkspace(uid, projectId);
  const layerRequirements = inferStackLayerRequirements(buildProjectContextForStack(workspace));
  const recommend: StackRecommendRaw = {
    productKind: raw.productKind,
    architecturePattern: raw.architecturePattern,
    layers: raw.layers as StackRecommendRaw['layers'],
    rationale: raw.rationale ?? '',
  };
  let stack = normalizeStackFromToolArgs(recommend, 'manual');
  if (countStackItems(stack) === 0) {
    throw platformInvalid('El stack debe incluir al menos una tecnología.');
  }
  stack.status = 'saved';
  stack = pruneStackToAllowedLayers(stack, layerRequirements);
  stack.warnings = validateStackCompatibility(stack);
  const saved = await saveStackAcrossWorkspace(uid, stack, projectId);
  return { stack: saved };
}

export async function platformNext(uid: string, projectId: string) {
  const workspace = await loadWorkspace(uid, projectId);
  return { next: pickNextStory(workspace) };
}
