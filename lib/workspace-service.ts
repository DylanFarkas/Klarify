/**
 * @fileoverview Servicio de workspace sobre Firestore (Admin SDK).
 *
 * Encapsula todas las lecturas/escrituras de `users/{uid}.workspace` y
 * `users/{uid}.preferences`. Sigue el mismo patrón que `lib/github-integration.ts`:
 * acceso server-side vía Admin SDK, expuesto a través de API routes autenticadas.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { checkAndIncrementRegeneration, resolveUserPlan, ensureUserAccount } from '@/lib/plans/plan-service';
import { PlanLimitError } from '@/lib/plans/plan-errors';
import type { RegenerationAgent } from '@/lib/plans/types';
import {
  getProjectWorkspace,
  loadActiveProjectWorkspace,
  projectDoc,
  readActiveProjectId,
} from '@/lib/project-service';
import { createEmptyWorkspace } from '@/lib/types/workspace';
import type { Agent1State } from '@/lib/types/agent-1';
import type { Agent2State, Agent2Input, Epic, UserStory } from '@/lib/types/agent-2';
import type { Agent3State, StoryEstimation } from '@/lib/types/agent-3';
import type { Agent4State, FrameworkCategory, StoryPrioritization } from '@/lib/types/agent-4';
import type { Agent5State, SprintDatePatch, SprintPlan } from '@/lib/types/agent-5';
import { computePipelineProgress } from '@/lib/utils/project-progress';
import {
  addSprintToPlan,
  assertCompletedSprintsUnchanged,
  assertStoryNotInCompletedSprint,
  buildAgent6InputFromAgent4,
  completeSprintInPlan,
  deleteEmptySprintFromPlan,
  isStoryInCompletedSprint,
  normalizeSprintPlan,
  startSprintInPlan,
  updateSprintDates,
  updateSprintGoal,
  withUpdatedSprintPlan,
  type SprintCompleteRollover,
} from '@/lib/utils/sprint-plan-mutations';
import {
  getLiveBacklog,
  isDashboardPhase,
  nextLiveEpicId,
  nextLiveWorkItemId,
} from '@/lib/utils/live-backlog';
import {
  isBugSeverity,
  isWorkItemType,
  normalizeUserStory,
  resolveWorkItemType,
  validateWorkItemFields,
} from '@/lib/utils/work-item-validation';
import {
  withCreatedEpic,
  withCreatedUserStory,
  withDeletedEpic,
  withDeletedUserStory,
  withUpdatedEpic,
  withUpdatedUserStory,
  type UpdateUserStoryOptions,
} from '@/lib/utils/user-story-mutations';
import { buildInitialExecutionState, createDefaultStoryExecution, syncExecutionStories } from '@/lib/board/board-utils';
import { assertExecutionBoardAllowed, assertTeamMemberLimit } from '@/lib/plans/execution-guard';
import type {
  ExecutionState,
  KanbanStatus,
  ProjectMember,
  ProjectMemberInput,
  StoryExecution,
  ExecutionActivityEntry,
} from '@/lib/types/execution';
import { AVATAR_COLORS } from '@/lib/types/execution';
import type {
  UserWorkspace,
  WorkspacePreferences,
  WorkspaceResponse,
  Agent3Input,
  Agent4Input,
  Agent5Input,
  Agent6Input,
} from '@/lib/types/workspace';

const EMPTY_AGENT1: Agent1State = {
  file: null,
  transcription: null,
  discovery: null,
  enrichedContext: null,
  wishes: [],
  status: 'idle',
  error: null,
};

const EMPTY_AGENT2: Agent2State = {
  input: null,
  epics: [],
  status: 'idle',
  error: null,
};

const EMPTY_AGENT3: Agent3State = {
  input: null,
  estimations: {},
  status: 'idle',
  error: null,
};

const EMPTY_AGENT4: Agent4State = {
  input: null,
  priorities: {},
  framework: 'moscow',
  status: 'idle',
  error: null,
};

const EMPTY_AGENT5: Agent5State = {
  input: null,
  plan: null,
  status: 'idle',
  error: null,
};

export interface CreateUserStoryInput {
  epicId: string;
  sprintId?: string | null;
  /** Default: story */
  type?: import('@/lib/types/agent-2').WorkItemType;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  points: number;
  /** Prioridad según el framework activo del Agente 4. */
  category?: FrameworkCategory;
  severity?: import('@/lib/types/agent-2').BugSeverity;
  stepsToReproduce?: string[];
  technicalNotes?: string;
}

/**
 * Elimina valores `undefined` de objetos anidados. Firestore rechaza `undefined`
 * (p. ej. campos opcionales como `TranscriptionSegment.speaker`), así que
 * normalizamos con un round-trip JSON antes de escribir.
 */
function sanitize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null)) as T;
}

function userDoc(uid: string) {
  return adminDb.collection('users').doc(uid);
}

async function activeProject(uid: string): Promise<string> {
  const projectId = await readActiveProjectId(uid);
  if (!projectId) {
    throw new Error('NO_PROJECTS');
  }
  return projectId;
}

async function loadProjectWorkspace(
  uid: string
): Promise<{ projectId: string; workspace: UserWorkspace }> {
  const loaded = await loadActiveProjectWorkspace(uid);
  if (!loaded) {
    throw new Error('NO_PROJECTS');
  }
  return loaded;
}

async function saveProjectWorkspace(
  uid: string,
  projectId: string,
  workspacePartial: Record<string, unknown>,
  currentWorkspace?: UserWorkspace
): Promise<void> {
  const current = currentWorkspace ?? (await getProjectWorkspace(uid, projectId));
  const partial = workspacePartial as Partial<UserWorkspace>;
  const nextWorkspace: UserWorkspace = {
    ...current,
    agent1: partial.agent1 ? { ...current.agent1, ...partial.agent1 } : current.agent1,
    agent2: partial.agent2 ? { ...current.agent2, ...partial.agent2 } : current.agent2,
    agent3: partial.agent3 ? { ...current.agent3, ...partial.agent3 } : current.agent3,
    agent4: partial.agent4 ? { ...current.agent4, ...partial.agent4 } : current.agent4,
    agent5: partial.agent5 ? { ...current.agent5, ...partial.agent5 } : current.agent5,
    pipeline: partial.pipeline
      ? { ...current.pipeline, ...partial.pipeline }
      : current.pipeline,
    execution:
      partial.execution !== undefined ? partial.execution : current.execution,
  };
  const progress = computePipelineProgress(nextWorkspace);

  await projectDoc(uid, projectId).set(
    {
      workspace: workspacePartial,
      pipelineStep: progress.pipelineStep,
      pipelineLabel: progress.pipelineLabel,
      completionPercentage: progress.completionPercentage,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

async function resetAgentWithRegenerationCheck(
  uid: string,
  agent: RegenerationAgent,
  emptyState: Record<string, unknown>
): Promise<void> {
  await checkAndIncrementRegeneration(uid, agent);
  const projectId = await activeProject(uid);
  await saveProjectWorkspace(uid, projectId, emptyState);
}

export type { UpdateUserStoryOptions };

async function persistBacklogMutation(
  uid: string,
  projectId: string,
  previous: UserWorkspace,
  updated: UserWorkspace
): Promise<void> {
  if (isDashboardPhase(previous)) {
    const partial: Record<string, unknown> = {
      pipeline: { agent6Input: sanitize(updated.pipeline.agent6Input) },
    };
    if (updated.execution !== previous.execution) {
      partial.execution = sanitize(updated.execution ?? null);
    }
    await saveProjectWorkspace(uid, projectId, partial, previous);
    return;
  }

  await saveProjectWorkspace(
    uid,
    projectId,
    {
      agent2: sanitize(updated.agent2),
      agent3: sanitize(updated.agent3),
      agent4: sanitize(updated.agent4),
      agent5: sanitize(updated.agent5),
      pipeline: sanitize(updated.pipeline),
      ...(updated.execution ? { execution: sanitize(updated.execution) } : {}),
    },
    previous
  );
}

async function assertCanCreateEpic(uid: string, workspace: UserWorkspace): Promise<void> {
  const plan = await resolveUserPlan(uid);
  if (getLiveBacklog(workspace).epics.length >= plan.limits.maxEpics) {
    throw new PlanLimitError(
      `Tu plan ${plan.id} permite hasta ${plan.limits.maxEpics} épica(s).`,
      'PLAN_EPIC_LIMIT',
      { upgradeTo: plan.id === 'free' ? 'starter' : plan.id === 'starter' ? 'pro' : undefined }
    );
  }
}

async function assertCanCreateStory(
  uid: string,
  workspace: UserWorkspace,
  epicId: string
): Promise<void> {
  const plan = await resolveUserPlan(uid);
  const liveEpics = getLiveBacklog(workspace).epics;
  const totalStories = liveEpics.reduce((sum, epic) => sum + epic.userStories.length, 0);
  if (totalStories >= plan.limits.maxStories) {
    throw new PlanLimitError(
      `Tu plan ${plan.id} permite hasta ${plan.limits.maxStories} historia(s).`,
      'PLAN_STORY_LIMIT',
      { upgradeTo: plan.id === 'free' ? 'starter' : plan.id === 'starter' ? 'pro' : undefined }
    );
  }

  const epic = liveEpics.find((item) => item.id === epicId);
  if (epic && epic.userStories.length >= plan.limits.maxStoriesPerEpic) {
    throw new PlanLimitError(
      `Tu plan ${plan.id} permite hasta ${plan.limits.maxStoriesPerEpic} historia(s) por épica.`,
      'PLAN_STORY_LIMIT',
      { upgradeTo: plan.id === 'free' ? 'starter' : plan.id === 'starter' ? 'pro' : undefined }
    );
  }
}

export interface CreateEpicInput {
  title: string;
  description: string;
}

export interface UpdateEpicInput {
  title?: string;
  description?: string;
}

function generateMemberId(members: ProjectMember[]): string {
  const maxId = members.reduce((max, member) => {
    const match = member.id.match(/^MEM-(\d+)$/i);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `MEM-${String(maxId + 1).padStart(3, '0')}`;
}

function pickAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function appendActivity(
  current: StoryExecution,
  entry: ExecutionActivityEntry
): StoryExecution {
  const activity = [...(current.activity ?? []), entry].slice(-20);
  return { ...current, activity, updatedAt: Date.now() };
}

async function saveExecutionState(
  uid: string,
  execution: ExecutionState,
  ctx?: { projectId: string; workspace: UserWorkspace }
): Promise<UserWorkspace> {
  const projectId = ctx?.projectId ?? (await readActiveProjectId(uid));
  if (!projectId) {
    throw new Error('NO_PROJECTS');
  }
  const workspace = ctx?.workspace ?? (await getProjectWorkspace(uid, projectId));
  const sanitized = sanitize(execution);
  await saveProjectWorkspace(uid, projectId, { execution: sanitized }, workspace);
  return { ...workspace, execution: sanitized };
}

/** Inicializa el estado de ejecución a partir de las épicas del agent6Input. */
export function buildExecutionFromEpics(epics: Epic[]): ExecutionState {
  return buildInitialExecutionState(epics);
}

/** Asegura que execution exista (migración lazy para proyectos legacy). */
export async function ensureExecutionInitialized(uid: string): Promise<UserWorkspace> {
  await assertExecutionBoardAllowed(uid);
  const { projectId, workspace } = await loadProjectWorkspace(uid);
  const agent6 = workspace.pipeline.agent6Input;
  if (!agent6) {
    throw new Error('PIPELINE_INCOMPLETE');
  }
  if (workspace.execution?.initializedAt) {
    const synced = syncExecutionStories(workspace.execution, agent6.epics);
    if (synced !== workspace.execution) {
      return saveExecutionState(uid, synced, { projectId, workspace });
    }
    return workspace;
  }
  const execution = buildInitialExecutionState(agent6.epics);
  return saveExecutionState(uid, execution, { projectId, workspace });
}

export async function initializeExecution(uid: string): Promise<UserWorkspace> {
  return ensureExecutionInitialized(uid);
}

export async function upsertProjectMember(
  uid: string,
  memberInput: ProjectMemberInput
): Promise<UserWorkspace> {
  await assertExecutionBoardAllowed(uid);
  const { projectId, workspace: initialWorkspace } = await loadProjectWorkspace(uid);
  let workspace = initialWorkspace;
  let execution = workspace.execution;
  if (!execution?.initializedAt) {
    workspace = await ensureExecutionInitialized(uid);
    execution = workspace.execution!;
  }
  const existingIndex = memberInput.id
    ? execution.members.findIndex((m) => m.id === memberInput.id)
    : -1;

  let members: ProjectMember[];
  if (existingIndex >= 0) {
    members = execution.members.map((m, i) =>
      i === existingIndex
        ? {
            ...m,
            displayName: memberInput.displayName,
            email: memberInput.email,
            role: memberInput.role,
          }
        : m
    );
  } else {
    await assertTeamMemberLimit(uid, execution.members.length);
    const newMember: ProjectMember = {
      id: generateMemberId(execution.members),
      displayName: memberInput.displayName,
      email: memberInput.email,
      role: memberInput.role,
      avatarColor: pickAvatarColor(execution.members.length),
      createdAt: Date.now(),
    };
    members = [...execution.members, newMember];
  }

  return saveExecutionState(uid, { ...execution, members }, { projectId, workspace });
}

export async function deleteProjectMember(uid: string, memberId: string): Promise<UserWorkspace> {
  await assertExecutionBoardAllowed(uid);
  const { projectId, workspace } = await loadProjectWorkspace(uid);
  const execution = workspace.execution;
  if (!execution?.initializedAt) {
    return ensureExecutionInitialized(uid);
  }
  const members = execution.members.filter((m) => m.id !== memberId);
  const stories = { ...execution.stories };

  for (const [storyId, storyExec] of Object.entries(stories)) {
    if (storyExec.assigneeId === memberId) {
      stories[storyId] = { ...storyExec, assigneeId: null, updatedAt: Date.now() };
    }
  }

  return saveExecutionState(uid, { ...execution, members, stories }, { projectId, workspace });
}

export async function updateStoryExecution(
  uid: string,
  storyId: string,
  patch: Partial<Pick<StoryExecution, 'status' | 'assigneeId' | 'columnOrder'>>
): Promise<UserWorkspace> {
  await assertExecutionBoardAllowed(uid);
  const { projectId, workspace: initial } = await loadProjectWorkspace(uid);
  let workspace = initial;
  let execution = workspace.execution;

  if (!execution?.initializedAt) {
    workspace = await ensureExecutionInitialized(uid);
    execution = workspace.execution;
    if (!execution?.initializedAt) {
      throw new Error('No se pudo inicializar el tablero de ejecución.');
    }
  }

  const current = execution.stories[storyId] ?? createDefaultStoryExecution(0);
  const plan = getLiveBacklog(workspace).plan;
  if (
    (patch.status !== undefined && patch.status !== current.status) ||
    (patch.assigneeId !== undefined && patch.assigneeId !== current.assigneeId) ||
    (patch.columnOrder !== undefined && patch.columnOrder !== current.columnOrder)
  ) {
    assertStoryNotInCompletedSprint(plan, storyId);
  }
  let updated = { ...current, ...patch, updatedAt: Date.now() };

  if (patch.status !== undefined && patch.status !== current.status) {
    updated = appendActivity(updated, {
      type: 'status_change',
      from: current.status,
      to: patch.status,
      at: Date.now(),
    });
  }

  if (patch.assigneeId !== undefined && patch.assigneeId !== current.assigneeId) {
    updated = appendActivity(updated, {
      type: 'assignee_change',
      from: current.assigneeId,
      to: patch.assigneeId,
      at: Date.now(),
    });
  }

  const stories = { ...execution.stories, [storyId]: updated };
  return saveExecutionState(uid, { ...execution, stories }, { projectId, workspace });
}

export interface StoryExecutionReorderUpdate {
  storyId: string;
  status: KanbanStatus;
  columnOrder: number;
}

export async function bulkUpdateStoryExecutions(
  uid: string,
  updates: StoryExecutionReorderUpdate[]
): Promise<UserWorkspace> {
  await assertExecutionBoardAllowed(uid);
  const { projectId, workspace } = await loadProjectWorkspace(uid);
  const execution = workspace.execution;
  if (!execution?.initializedAt) {
    return ensureExecutionInitialized(uid);
  }
  const stories = { ...execution.stories };
  const now = Date.now();
  const plan = getLiveBacklog(workspace).plan;

  for (const update of updates) {
    const current = stories[update.storyId] ?? createDefaultStoryExecution(update.columnOrder);
    if (isStoryInCompletedSprint(plan, update.storyId)) {
      if (update.status !== current.status) {
        assertStoryNotInCompletedSprint(plan, update.storyId);
      }
      continue;
    }
    let next = { ...current, status: update.status, columnOrder: update.columnOrder, updatedAt: now };

    if (update.status !== current.status) {
      next = appendActivity(next, {
        type: 'status_change',
        from: current.status,
        to: update.status,
        at: now,
      });
    }

    stories[update.storyId] = next;
  }

  return saveExecutionState(uid, { ...execution, stories }, { projectId, workspace });
}

export async function updateExecutionSprintFilter(
  uid: string,
  sprintFilter: string | 'all'
): Promise<UserWorkspace> {
  await assertExecutionBoardAllowed(uid);
  const { projectId, workspace } = await loadProjectWorkspace(uid);
  const execution = workspace.execution;
  if (!execution?.initializedAt) {
    return ensureExecutionInitialized(uid);
  }
  return saveExecutionState(uid, { ...execution, sprintFilter }, { projectId, workspace });
}

/** Lee el workspace del proyecto activo + preferencias y plan del usuario. */
export async function getWorkspaceData(uid: string): Promise<WorkspaceResponse> {
  const snapshot = await ensureUserAccount(uid);
  const prefs = snapshot.data()?.preferences as Partial<WorkspacePreferences> | undefined;
  const preferences: WorkspacePreferences = {
    lastAgent: prefs?.lastAgent ?? '1',
  };

  const [plan, loaded] = await Promise.all([
    resolveUserPlan(uid, snapshot),
    loadActiveProjectWorkspace(uid, snapshot),
  ]);
  const planSnapshot = {
    id: plan.id,
    limits: plan.limits,
    usage: plan.usage,
    subscription: plan.subscription,
  };

  if (!loaded) {
    return {
      workspace: createEmptyWorkspace(),
      preferences,
      activeProjectId: null,
      plan: planSnapshot,
    };
  }

  return {
    workspace: loaded.workspace,
    preferences,
    activeProjectId: loaded.projectId,
    plan: planSnapshot,
  };
}

/** Guarda (merge) el estado del Agente 1. */
export async function saveAgent1State(uid: string, state: Agent1State): Promise<void> {
  const projectId = await activeProject(uid);
  await saveProjectWorkspace(uid, projectId, {
    agent1: sanitize(state),
  });
}

/** Guarda (merge) el estado del Agente 2. */
export async function saveAgent2State(uid: string, state: Agent2State): Promise<void> {
  const projectId = await activeProject(uid);
  await saveProjectWorkspace(uid, projectId, {
    agent2: sanitize(state),
  });
}

/** Actualiza una HU en todas las copias del backlog que conserva el pipeline. */
export async function updateUserStoryAcrossWorkspace(
  uid: string,
  storyId: string,
  updates: Partial<UserStory>,
  estimationUpdates?: Partial<StoryEstimation>,
  options?: UpdateUserStoryOptions,
  prioritizationUpdates?: Partial<StoryPrioritization>
): Promise<UserWorkspace> {
  const { projectId, workspace } = await loadProjectWorkspace(uid);
  const live = getLiveBacklog(workspace);
  const current = live.epics
    .flatMap((epic) => epic.userStories)
    .find((story) => story.id === storyId);
  if (!current) {
    throw new Error(`Historia no encontrada: ${storyId}`);
  }

  assertStoryNotInCompletedSprint(live.plan, storyId);

  // MVP: no se permite cambiar el tipo ni el id tras crear.
  const { type: _ignoredType, id: _ignoredId, ...safeUpdates } = updates;
  const type = resolveWorkItemType(current);

  const mergedForValidation = {
    type,
    title: safeUpdates.title ?? current.title,
    description: safeUpdates.description ?? current.description,
    acceptanceCriteria:
      safeUpdates.acceptanceCriteria ?? current.acceptanceCriteria ?? [],
    severity: safeUpdates.severity ?? current.severity,
    stepsToReproduce:
      safeUpdates.stepsToReproduce ?? current.stepsToReproduce ?? [],
    technicalNotes: safeUpdates.technicalNotes ?? current.technicalNotes,
  };
  const validationError = validateWorkItemFields(mergedForValidation, {
    partial: false,
  });
  if (validationError) {
    throw new Error(validationError);
  }

  const normalizedPatch: Partial<UserStory> = { ...safeUpdates };
  if (type === 'bug') {
    if (safeUpdates.severity !== undefined) {
      normalizedPatch.severity = isBugSeverity(safeUpdates.severity)
        ? safeUpdates.severity
        : 'medium';
    }
    if (safeUpdates.stepsToReproduce !== undefined) {
      normalizedPatch.stepsToReproduce = safeUpdates.stepsToReproduce
        .map((s) => s.trim())
        .filter(Boolean);
    }
    delete normalizedPatch.technicalNotes;
  } else if (type === 'task') {
    if (safeUpdates.technicalNotes !== undefined) {
      normalizedPatch.technicalNotes = safeUpdates.technicalNotes.trim();
    }
    delete normalizedPatch.severity;
    delete normalizedPatch.stepsToReproduce;
  } else {
    delete normalizedPatch.severity;
    delete normalizedPatch.stepsToReproduce;
    delete normalizedPatch.technicalNotes;
  }

  const updatedWorkspace = withUpdatedUserStory(
    workspace,
    storyId,
    normalizedPatch,
    estimationUpdates,
    options,
    prioritizationUpdates
  );

  await persistBacklogMutation(uid, projectId, workspace, updatedWorkspace);

  return updatedWorkspace;
}

export async function updateSprintPlanAcrossWorkspace(
  uid: string,
  plan: SprintPlan
): Promise<UserWorkspace> {
  const { projectId, workspace } = await loadProjectWorkspace(uid);
  const currentPlan = resolveSprintPlan(workspace);
  if (currentPlan) {
    assertCompletedSprintsUnchanged(currentPlan, plan);
  }
  const normalizedPlan = normalizeSprintPlan(plan);
  const updatedWorkspace = withUpdatedSprintPlan(workspace, normalizedPlan);

  await persistBacklogMutation(uid, projectId, workspace, updatedWorkspace);

  return updatedWorkspace;
}

function resolveSprintPlan(workspace: UserWorkspace): SprintPlan | null {
  return getLiveBacklog(workspace).plan;
}

export async function createSprintAcrossWorkspace(
  uid: string,
  input?: { goal?: string }
): Promise<{ workspace: UserWorkspace; sprintId: string; sprintGoal: string }> {
  const { workspace } = await getWorkspaceData(uid);
  const plan = resolveSprintPlan(workspace);
  if (!plan) {
    throw new Error('No hay plan de sprints en el workspace.');
  }
  const updatedPlan = addSprintToPlan(plan, input?.goal);
  const created = updatedPlan.sprints.at(-1);
  if (!created) {
    throw new Error('No se pudo crear el sprint.');
  }
  const nextWorkspace = await updateSprintPlanAcrossWorkspace(uid, updatedPlan);
  return {
    workspace: nextWorkspace,
    sprintId: created.id,
    sprintGoal: created.sprintGoal,
  };
}

export async function deleteSprintAcrossWorkspace(
  uid: string,
  sprintId: string
): Promise<UserWorkspace> {
  const { workspace } = await getWorkspaceData(uid);
  const plan = resolveSprintPlan(workspace);
  if (!plan) {
    throw new Error('No hay plan de sprints en el workspace.');
  }
  const normalized = normalizeSprintPlan(plan);
  const sprint = normalized.sprints.find((item) => item.id === sprintId);
  if (!sprint) {
    throw new Error(`Sprint no encontrado: ${sprintId}`);
  }
  if (sprint.storyIds.length > 0) {
    throw new Error(
      `No se puede eliminar ${sprintId}: tiene ${sprint.storyIds.length} historia(s) asignada(s). Reasígnalas o déjalas sin sprint primero.`
    );
  }
  const nextPlan = deleteEmptySprintFromPlan(normalized, sprintId);
  if (!nextPlan) {
    throw new Error(`No se puede eliminar ${sprintId}: el sprint no está vacío.`);
  }
  return updateSprintPlanAcrossWorkspace(uid, nextPlan);
}

export async function updateSprintAcrossWorkspace(
  uid: string,
  sprintId: string,
  updates: { goal?: string; dates?: SprintDatePatch }
): Promise<UserWorkspace> {
  const { workspace } = await getWorkspaceData(uid);
  const plan = resolveSprintPlan(workspace);
  if (!plan) {
    throw new Error('No hay plan de sprints en el workspace.');
  }
  let nextPlan = normalizeSprintPlan(plan);
  const sprint = nextPlan.sprints.find((item) => item.id === sprintId);
  if (!sprint) {
    throw new Error(`Sprint no encontrado: ${sprintId}`);
  }
  if (updates.goal !== undefined) {
    nextPlan = updateSprintGoal(nextPlan, sprintId, updates.goal);
  }
  if (updates.dates && Object.keys(updates.dates).length > 0) {
    nextPlan = updateSprintDates(nextPlan, sprintId, updates.dates);
  }
  return updateSprintPlanAcrossWorkspace(uid, nextPlan);
}

export async function startSprintAcrossWorkspace(
  uid: string,
  sprintId: string
): Promise<UserWorkspace> {
  const { workspace } = await getWorkspaceData(uid);
  const plan = resolveSprintPlan(workspace);
  if (!plan) {
    throw new Error('No hay plan de sprints en el workspace.');
  }
  const nextPlan = startSprintInPlan(plan, sprintId);
  let nextWorkspace = await updateSprintPlanAcrossWorkspace(uid, nextPlan);

  if (nextWorkspace.execution?.initializedAt) {
    nextWorkspace = await updateExecutionSprintFilter(uid, sprintId);
  }
  return nextWorkspace;
}

export async function completeSprintAcrossWorkspace(
  uid: string,
  sprintId: string,
  rollover: SprintCompleteRollover = 'backlog'
): Promise<UserWorkspace> {
  const { workspace } = await getWorkspaceData(uid);
  const plan = resolveSprintPlan(workspace);
  if (!plan) {
    throw new Error('No hay plan de sprints en el workspace.');
  }
  const normalized = normalizeSprintPlan(plan);
  const sprint = normalized.sprints.find((item) => item.id === sprintId);
  if (!sprint) {
    throw new Error(`Sprint no encontrado: ${sprintId}`);
  }

  const { estimations } = getLiveBacklog(workspace);
  const storyPointsById: Record<string, number> = {};
  for (const storyId of sprint.storyIds) {
    storyPointsById[storyId] = estimations[storyId]?.points ?? 0;
  }

  const incompleteStoryIds = sprint.storyIds.filter((storyId) => {
    const status = workspace.execution?.stories[storyId]?.status ?? 'todo';
    return status !== 'done';
  });

  const nextPlan = completeSprintInPlan(
    normalized,
    sprintId,
    incompleteStoryIds,
    storyPointsById,
    rollover
  );
  return updateSprintPlanAcrossWorkspace(uid, nextPlan);
}

export async function createUserStoryAcrossWorkspace(
  uid: string,
  input: CreateUserStoryInput
): Promise<{ workspace: UserWorkspace; storyId: string }> {
  const { projectId, workspace } = await loadProjectWorkspace(uid);
  if (!getLiveBacklog(workspace).epics.some((epic) => epic.id === input.epicId)) {
    throw new Error(`Épica no encontrada: ${input.epicId}`);
  }

  const type = isWorkItemType(input.type) ? input.type : 'story';
  const severity =
    type === 'bug'
      ? isBugSeverity(input.severity)
        ? input.severity
        : 'medium'
      : undefined;
  const stepsToReproduce =
    type === 'bug'
      ? (input.stepsToReproduce ?? []).map((s) => s.trim()).filter(Boolean)
      : undefined;
  const acceptanceCriteria = (input.acceptanceCriteria ?? [])
    .map((c) => c.trim())
    .filter(Boolean);
  const technicalNotes =
    type === 'task' && typeof input.technicalNotes === 'string'
      ? input.technicalNotes.trim()
      : undefined;

  const validationError = validateWorkItemFields({
    type,
    title: input.title,
    description: input.description,
    acceptanceCriteria,
    severity,
    stepsToReproduce,
    technicalNotes,
  });
  if (validationError) {
    throw new Error(validationError);
  }

  await assertCanCreateStory(uid, workspace, input.epicId);
  const storyId = nextLiveWorkItemId(workspace, type);
  const story = normalizeUserStory({
    id: storyId,
    type,
    title: input.title.trim(),
    description: input.description.trim(),
    acceptanceCriteria,
    ...(type === 'bug'
      ? { severity: severity ?? 'medium', stepsToReproduce: stepsToReproduce ?? [] }
      : {}),
    ...(type === 'task' && technicalNotes ? { technicalNotes } : {}),
    sourceWishIds: [],
    source: 'manual',
    isEdited: false,
    createdAt: Date.now(),
  });

  const defaultPoints = type === 'bug' ? 1 : input.points;
  const points = Number.isFinite(input.points) ? input.points : defaultPoints;
  const typeLabel =
    type === 'bug' ? 'Bug' : type === 'task' ? 'Task' : 'Historia';
  const estimation: StoryEstimation = {
    points,
    justification: `${typeLabel} creado(a) manualmente desde el dashboard.`,
    isModified: true,
  };
  const prioritization: StoryPrioritization | null = input.category
    ? {
        category: input.category,
        justification: 'Priorizacion creada manualmente desde el dashboard.',
        isModified: true,
      }
    : null;
  const updatedWorkspace = withCreatedUserStory(workspace, {
    story,
    epicId: input.epicId,
    sprintId: input.sprintId,
    estimation,
    prioritization,
  });

  await persistBacklogMutation(uid, projectId, workspace, updatedWorkspace);

  return { workspace: updatedWorkspace, storyId };
}

export async function deleteUserStoryAcrossWorkspace(
  uid: string,
  storyId: string
): Promise<UserWorkspace> {
  const { projectId, workspace } = await loadProjectWorkspace(uid);
  const live = getLiveBacklog(workspace);
  const exists = live.epics.some((epic) => epic.userStories.some((story) => story.id === storyId));
  if (!exists) {
    throw new Error(`Historia no encontrada: ${storyId}`);
  }
  assertStoryNotInCompletedSprint(live.plan, storyId, 'eliminar');
  const updatedWorkspace = withDeletedUserStory(workspace, storyId);
  await persistBacklogMutation(uid, projectId, workspace, updatedWorkspace);
  return updatedWorkspace;
}

export async function createEpicAcrossWorkspace(
  uid: string,
  input: CreateEpicInput
): Promise<{ workspace: UserWorkspace; epicId: string }> {
  const { projectId, workspace } = await loadProjectWorkspace(uid);
  await assertCanCreateEpic(uid, workspace);

  const epic: Epic = {
    id: nextLiveEpicId(workspace),
    title: input.title.trim(),
    description: input.description.trim(),
    userStories: [],
    source: 'manual',
    isEdited: false,
    createdAt: Date.now(),
  };

  const updatedWorkspace = withCreatedEpic(workspace, epic);
  await persistBacklogMutation(uid, projectId, workspace, updatedWorkspace);
  return { workspace: updatedWorkspace, epicId: epic.id };
}

export async function updateEpicAcrossWorkspace(
  uid: string,
  epicId: string,
  updates: UpdateEpicInput
): Promise<UserWorkspace> {
  const { projectId, workspace } = await loadProjectWorkspace(uid);
  const exists = getLiveBacklog(workspace).epics.some((epic) => epic.id === epicId);
  if (!exists) {
    throw new Error(`Épica no encontrada: ${epicId}`);
  }

  const updatedWorkspace = withUpdatedEpic(workspace, epicId, updates);
  await persistBacklogMutation(uid, projectId, workspace, updatedWorkspace);
  return updatedWorkspace;
}

export async function deleteEpicAcrossWorkspace(
  uid: string,
  epicId: string
): Promise<UserWorkspace> {
  const { projectId, workspace } = await loadProjectWorkspace(uid);
  const target = getLiveBacklog(workspace).epics.find((epic) => epic.id === epicId);
  if (!target) {
    throw new Error(`Épica no encontrada: ${epicId}`);
  }
  const plan = getLiveBacklog(workspace).plan;
  for (const story of target.userStories) {
    assertStoryNotInCompletedSprint(plan, story.id, 'eliminar');
  }

  const updatedWorkspace = withDeletedEpic(workspace, epicId);
  await persistBacklogMutation(uid, projectId, workspace, updatedWorkspace);
  return updatedWorkspace;
}

/** Guarda (merge) el estado del Agente 3. */
export async function saveAgent3State(uid: string, state: Agent3State): Promise<void> {
  const projectId = await activeProject(uid);
  await saveProjectWorkspace(uid, projectId, {
    agent3: sanitize(state),
  });
}

/** Marca el Agente 1 como aprobado y escribe el input para el Agente 2. */
export async function approveAgent1(uid: string, agent2Input: Agent2Input): Promise<void> {
  const { workspace } = await getWorkspaceData(uid);
  const projectId = await activeProject(uid);
  await saveProjectWorkspace(uid, projectId, {
    agent1: sanitize({
      ...workspace.agent1,
      transcription: agent2Input.transcription,
      wishes: agent2Input.wishes,
      status: 'approved',
      error: null,
    }),
    pipeline: { agent2Input: sanitize(agent2Input) },
  });
}

/** Marca el Agente 2 como aprobado y escribe el input para el Agente 3. */
export async function approveAgent2(uid: string, agent3Input: Agent3Input): Promise<void> {
  const { workspace } = await getWorkspaceData(uid);
  const projectId = await activeProject(uid);
  await saveProjectWorkspace(uid, projectId, {
    agent2: sanitize({
      ...workspace.agent2,
      status: 'approved',
      error: null,
    }),
    pipeline: { agent3Input: sanitize(agent3Input) },
  });
}

/** Marca el Agente 3 como aprobado y escribe el input para el Agente 4. */
export async function approveAgent3(uid: string, agent4Input: Agent4Input): Promise<void> {
  const { workspace } = await getWorkspaceData(uid);
  const agent3Input: Agent3Input = {
    epics: agent4Input.epics,
    sourceWishIds: agent4Input.sourceWishIds,
    approvedAt: agent4Input.approvedAt,
  };
  const projectId = await activeProject(uid);
  await saveProjectWorkspace(uid, projectId, {
    agent3: sanitize({
      ...workspace.agent3,
      input: agent3Input,
      estimations: agent4Input.estimations,
      status: 'approved',
      error: null,
    }),
    pipeline: {
      ...workspace.pipeline,
      agent4Input: sanitize(agent4Input),
    },
  });
}

/** Guarda (merge) el estado del Agente 4. */
export async function saveAgent4State(uid: string, state: Agent4State): Promise<void> {
  const projectId = await activeProject(uid);
  await saveProjectWorkspace(uid, projectId, {
    agent4: sanitize(state),
  });
}

/** Marca el Agente 4 como aprobado y abre el dashboard con plan de sprints vacío. */
export async function approveAgent4(uid: string, agent5Input: Agent5Input): Promise<void> {
  const { workspace } = await getWorkspaceData(uid);
  const agent4Input: Agent4Input = {
    epics: agent5Input.epics,
    estimations: agent5Input.estimations,
    sourceWishIds: agent5Input.sourceWishIds,
    approvedAt: agent5Input.approvedAt,
  };
  const agent6Input = buildAgent6InputFromAgent4(agent5Input);
  const execution = buildInitialExecutionState(agent6Input.epics);
  const projectId = await activeProject(uid);
  await saveProjectWorkspace(uid, projectId, {
    agent4: sanitize({
      ...workspace.agent4,
      input: agent4Input,
      priorities: agent5Input.priorities,
      framework: agent5Input.framework,
      status: 'approved',
      error: null,
    }),
    agent5: sanitize(EMPTY_AGENT5),
    pipeline: {
      ...workspace.pipeline,
      agent5Input: sanitize(agent5Input),
      agent6Input: sanitize(agent6Input),
    },
    execution: sanitize(execution),
  });
}

/**
 * Migración suave: si el Agente 4 está aprobado pero falta agent6Input
 * (proyectos creados antes de desactivar el Agente 5), lo materializa.
 */
export async function bootstrapDashboardFromAgent4(uid: string): Promise<UserWorkspace | null> {
  const { workspace } = await getWorkspaceData(uid);
  if (workspace.pipeline.agent6Input) return null;
  if (workspace.agent4.status !== 'approved') return null;

  const source: Agent5Input | null =
    workspace.pipeline.agent5Input ??
    (workspace.agent4.input && Object.keys(workspace.agent4.priorities).length > 0
      ? {
          epics: workspace.agent4.input.epics,
          estimations: workspace.agent4.input.estimations,
          priorities: workspace.agent4.priorities,
          framework: workspace.agent4.framework,
          sourceWishIds: workspace.agent4.input.sourceWishIds,
          approvedAt: workspace.agent4.input.approvedAt,
        }
      : null);

  if (!source?.epics.length) return null;

  const agent6Input = buildAgent6InputFromAgent4(source);
  if (workspace.agent5.plan) {
    agent6Input.plan = normalizeSprintPlan(workspace.agent5.plan);
  }
  const execution =
    workspace.execution ?? buildInitialExecutionState(agent6Input.epics);
  const projectId = await activeProject(uid);
  await saveProjectWorkspace(uid, projectId, {
    pipeline: {
      ...workspace.pipeline,
      agent5Input: sanitize(source),
      agent6Input: sanitize(agent6Input),
    },
    execution: sanitize(execution),
  });

  const { workspace: next } = await getWorkspaceData(uid);
  return next;
}

/** Limpia el estado del Agente 1 (todos sus campos vuelven al estado inicial). */
export async function resetAgent1(uid: string): Promise<void> {
  const projectId = await activeProject(uid);
  await saveProjectWorkspace(uid, projectId, {
    agent1: EMPTY_AGENT1,
  });
}

/** Limpia el estado del Agente 2 (precede regeneración IA). */
export async function resetAgent2(uid: string): Promise<void> {
  await resetAgentWithRegenerationCheck(uid, 'agent2', { agent2: EMPTY_AGENT2 });
}

/** Limpia el estado del Agente 3 (precede regeneración IA). */
export async function resetAgent3(uid: string): Promise<void> {
  await resetAgentWithRegenerationCheck(uid, 'agent3', { agent3: EMPTY_AGENT3 });
}

/** Limpia el estado del Agente 4 (precede regeneración IA). */
export async function resetAgent4(uid: string): Promise<void> {
  await resetAgentWithRegenerationCheck(uid, 'agent4', { agent4: EMPTY_AGENT4 });
}

/** Guarda (merge) el estado del Agente 5. */
export async function saveAgent5State(uid: string, state: Agent5State): Promise<void> {
  const normalizedState: Agent5State = {
    ...state,
    plan: state.plan ? normalizeSprintPlan(state.plan) : null,
  };
  const projectId = await activeProject(uid);
  await saveProjectWorkspace(uid, projectId, {
    agent5: sanitize(normalizedState),
  });
}

/** Marca el Agente 5 como aprobado y escribe el input para el Agente 6. */
export async function approveAgent5(uid: string, agent6Input: Agent6Input): Promise<void> {
  const { workspace } = await getWorkspaceData(uid);
  const agent5Input: Agent5Input = {
    epics: agent6Input.epics,
    estimations: agent6Input.estimations,
    priorities: agent6Input.priorities,
    framework: agent6Input.framework,
    sourceWishIds: agent6Input.sourceWishIds,
    approvedAt: agent6Input.approvedAt,
  };
  const projectId = await activeProject(uid);
  const execution = buildInitialExecutionState(agent6Input.epics);
  await saveProjectWorkspace(uid, projectId, {
    agent5: sanitize({
      ...workspace.agent5,
      input: agent5Input,
      plan: agent6Input.plan,
      status: 'approved',
      error: null,
    }),
    pipeline: {
      ...workspace.pipeline,
      agent6Input: sanitize(agent6Input),
    },
    execution: sanitize(execution),
  });
}

/** Limpia el estado del Agente 5 (precede regeneración IA). */
export async function resetAgent5(uid: string): Promise<void> {
  await resetAgentWithRegenerationCheck(uid, 'agent5', { agent5: EMPTY_AGENT5 });
}

/** Actualiza el último agente visitado (preferencia de navegación). */
export async function saveLastAgent(uid: string, lastAgent: string): Promise<void> {
  const projectId = await readActiveProjectId(uid);
  await userDoc(uid).set(
    {
      preferences: { lastAgent },
    },
    { merge: true }
  );
  if (projectId) {
    await projectDoc(uid, projectId).set({ lastAgent }, { merge: true });
  }
}

/** Reinicia el proyecto activo (conserva el proyecto, vacía el pipeline). */
export async function resetWorkspace(uid: string): Promise<void> {
  const projectId = await activeProject(uid);
  await saveProjectWorkspace(uid, projectId, {
    agent1: EMPTY_AGENT1,
    agent2: EMPTY_AGENT2,
    agent3: EMPTY_AGENT3,
    agent4: EMPTY_AGENT4,
    agent5: EMPTY_AGENT5,
    pipeline: {
      agent2Input: null,
      agent3Input: null,
      agent4Input: null,
      agent5Input: null,
      agent6Input: null,
    },
    execution: null,
  });
  await userDoc(uid).set(
    {
      preferences: { lastAgent: '1', activeProjectId: projectId },
    },
    { merge: true }
  );
  await projectDoc(uid, projectId).set({ lastAgent: '1' }, { merge: true });
}
