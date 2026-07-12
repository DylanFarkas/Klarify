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
import type { RegenerationAgent } from '@/lib/plans/types';
import {
  getProjectWorkspace,
  projectDoc,
  readActiveProjectId,
} from '@/lib/project-service';
import { createEmptyWorkspace } from '@/lib/types/workspace';
import type { Agent1State } from '@/lib/types/agent-1';
import type { Agent2State, Agent2Input, Epic, UserStory } from '@/lib/types/agent-2';
import type { Agent3State, StoryEstimation } from '@/lib/types/agent-3';
import type { Agent4State, FrameworkCategory, StoryPrioritization } from '@/lib/types/agent-4';
import type { Agent5State, SprintPlan } from '@/lib/types/agent-5';
import {
  addStoryToSprintPlan,
  adjustSprintVelocityForStoryPoints,
  assignStoryToSprintInPlan,
  normalizeSprintPlan,
  removeStoryFromSprintPlan,
  withUpdatedSprintPlan,
} from '@/lib/utils/sprint-plan-mutations';
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
  title: string;
  description: string;
  acceptanceCriteria: string[];
  points: number;
  /** Prioridad según el framework activo del Agente 4. */
  category?: FrameworkCategory;
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
  const projectId = await readActiveProjectId(uid);
  if (!projectId) {
    throw new Error('NO_PROJECTS');
  }
  const workspace = await getProjectWorkspace(uid, projectId);
  return { projectId, workspace };
}

async function saveProjectWorkspace(
  uid: string,
  projectId: string,
  workspacePartial: Record<string, unknown>
): Promise<void> {
  await projectDoc(uid, projectId).set(
    {
      workspace: workspacePartial,
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

function updateStoryInEpics(
  epics: Epic[] | null | undefined,
  storyId: string,
  updates: Partial<UserStory>
): Epic[] | null | undefined {
  if (!epics) return epics;

  return epics.map((epic) => ({
    ...epic,
    userStories: epic.userStories.map((story) =>
      story.id === storyId ? { ...story, ...updates, isEdited: true } : story
    ),
  }));
}

function addStoryToEpics(
  epics: Epic[] | null | undefined,
  epicId: string,
  story: UserStory
): Epic[] | null | undefined {
  if (!epics) return epics;

  return epics.map((epic) =>
    epic.id === epicId
      ? { ...epic, userStories: [...epic.userStories, story], isEdited: true }
      : epic
  );
}

function deleteStoryFromEpics(
  epics: Epic[] | null | undefined,
  storyId: string
): Epic[] | null | undefined {
  if (!epics) return epics;

  return epics.map((epic) => ({
    ...epic,
    userStories: epic.userStories.filter((story) => story.id !== storyId),
  }));
}

function updateStoryEstimation(
  estimations: Record<string, StoryEstimation>,
  storyId: string,
  updates?: Partial<StoryEstimation>
): Record<string, StoryEstimation> {
  if (!updates) return estimations;

  const current = estimations[storyId] ?? {
    points: 0,
    justification: '',
    isModified: false,
  };

  return {
    ...estimations,
    [storyId]: {
      ...current,
      ...updates,
      isModified: true,
    },
  };
}

function updateStoryPrioritization(
  priorities: Record<string, StoryPrioritization>,
  storyId: string,
  updates?: Partial<StoryPrioritization>
): Record<string, StoryPrioritization> {
  if (!updates) return priorities;

  const current = priorities[storyId] ?? {
    category: 'must' as FrameworkCategory,
    justification: '',
    isModified: false,
  };

  return {
    ...priorities,
    [storyId]: {
      ...current,
      ...updates,
      isModified: true,
    },
  };
}

function deleteRecordEntry<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}

export interface UpdateUserStoryOptions {
  epicId?: string;
  sprintId?: string | null;
}

function moveStoryBetweenEpics(
  epics: Epic[] | null | undefined,
  storyId: string,
  toEpicId: string
): Epic[] | null | undefined {
  if (!epics) return epics;

  let story: UserStory | null = null;
  const withoutStory = epics.map((epic) => {
    const found = epic.userStories.find((s) => s.id === storyId);
    if (found) story = found;
    return {
      ...epic,
      userStories: epic.userStories.filter((s) => s.id !== storyId),
    };
  });

  if (!story) return epics;

  return withoutStory.map((epic) =>
    epic.id === toEpicId
      ? { ...epic, userStories: [...epic.userStories, story!], isEdited: true }
      : epic
  );
}


function findStoryEpicId(epics: Epic[], storyId: string): string | null {
  for (const epic of epics) {
    if (epic.userStories.some((story) => story.id === storyId)) {
      return epic.id;
    }
  }
  return null;
}

function collectEpics(workspace: UserWorkspace): Epic[] {
  return [
    ...workspace.agent2.epics,
    ...(workspace.agent3.input?.epics ?? []),
    ...(workspace.agent4.input?.epics ?? []),
    ...(workspace.agent5.input?.epics ?? []),
    ...(workspace.pipeline.agent3Input?.epics ?? []),
    ...(workspace.pipeline.agent4Input?.epics ?? []),
    ...(workspace.pipeline.agent5Input?.epics ?? []),
    ...(workspace.pipeline.agent6Input?.epics ?? []),
  ];
}

function generateUserStoryId(workspace: UserWorkspace): string {
  const maxId = collectEpics(workspace)
    .flatMap((epic) => epic.userStories)
    .reduce((max, story) => {
      const match = story.id.match(/^HU-(\d+)$/i);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);

  return `HU-${String(maxId + 1).padStart(3, '0')}`;
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
  await saveProjectWorkspace(uid, projectId, { execution: sanitized });
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
  const { projectId, workspace } = await loadProjectWorkspace(uid);
  const execution = workspace.execution;
  if (!execution?.initializedAt) {
    return ensureExecutionInitialized(uid);
  }
  const current = execution.stories[storyId] ?? createDefaultStoryExecution(0);
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

  for (const update of updates) {
    const current = stories[update.storyId] ?? createDefaultStoryExecution(update.columnOrder);
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
  const projectId = await readActiveProjectId(uid);

  if (!projectId) {
    const snapshot = await ensureUserAccount(uid);
    const plan = await resolveUserPlan(uid, snapshot);
    const prefs = snapshot.data()?.preferences as Partial<WorkspacePreferences> | undefined;
    return {
      workspace: createEmptyWorkspace(),
      preferences: {
        lastAgent: prefs?.lastAgent ?? '1',
      },
      activeProjectId: null,
      plan: {
        id: plan.id,
        limits: plan.limits,
        usage: plan.usage,
        subscription: plan.subscription,
      },
    };
  }

  const [snapshot, workspace] = await Promise.all([
    ensureUserAccount(uid),
    getProjectWorkspace(uid, projectId),
  ]);
  const plan = await resolveUserPlan(uid, snapshot);
  const prefs = snapshot.data()?.preferences as Partial<WorkspacePreferences> | undefined;

  return {
    workspace,
    preferences: {
      lastAgent: prefs?.lastAgent ?? '1',
    },
    activeProjectId: projectId,
    plan: {
      id: plan.id,
      limits: plan.limits,
      usage: plan.usage,
      subscription: plan.subscription,
    },
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
  const { workspace } = await getWorkspaceData(uid);
  const epics = workspace.agent2.epics;
  const currentEpicId = findStoryEpicId(epics, storyId);
  const shouldMoveEpic = options?.epicId !== undefined && options.epicId !== currentEpicId;
  const oldPoints =
    workspace.agent5.input?.estimations[storyId]?.points ??
    workspace.agent3.estimations[storyId]?.points ??
    0;
  const newPoints = estimationUpdates?.points ?? oldPoints;

  let updatedPlan = workspace.agent5.plan;
  if (updatedPlan) {
    if (options?.sprintId !== undefined) {
      updatedPlan = assignStoryToSprintInPlan(updatedPlan, storyId, options.sprintId, newPoints);
    } else if (estimationUpdates?.points !== undefined && oldPoints !== newPoints) {
      updatedPlan = adjustSprintVelocityForStoryPoints(updatedPlan, storyId, oldPoints, newPoints);
    }
  }

  let updatedPipelinePlan = workspace.pipeline.agent6Input?.plan ?? null;
  if (updatedPipelinePlan) {
    if (options?.sprintId !== undefined) {
      updatedPipelinePlan = assignStoryToSprintInPlan(
        updatedPipelinePlan,
        storyId,
        options.sprintId,
        newPoints
      );
    } else if (estimationUpdates?.points !== undefined && oldPoints !== newPoints) {
      updatedPipelinePlan = adjustSprintVelocityForStoryPoints(
        updatedPipelinePlan,
        storyId,
        oldPoints,
        newPoints
      );
    }
  }

  const applyStoryUpdate = (sourceEpics: Epic[] | null | undefined) => {
    if (!sourceEpics) return sourceEpics;
    if (shouldMoveEpic && options?.epicId) {
      const moved = moveStoryBetweenEpics(sourceEpics, storyId, options.epicId) ?? [];
      return updateStoryInEpics(moved, storyId, updates);
    }
    return updateStoryInEpics(sourceEpics, storyId, updates);
  };

  const agent3Estimations = updateStoryEstimation(workspace.agent3.estimations, storyId, estimationUpdates);
  const agent4Priorities = updateStoryPrioritization(
    workspace.agent4.priorities,
    storyId,
    prioritizationUpdates
  );
  const updatedWorkspace: UserWorkspace = {
    ...workspace,
    agent2: {
      ...workspace.agent2,
      epics: applyStoryUpdate(workspace.agent2.epics) ?? [],
    },
    agent3: {
      ...workspace.agent3,
      estimations: agent3Estimations,
      input: workspace.agent3.input
        ? {
            ...workspace.agent3.input,
            epics: applyStoryUpdate(workspace.agent3.input.epics) ?? [],
          }
        : null,
    },
    agent4: {
      ...workspace.agent4,
      priorities: agent4Priorities,
      input: workspace.agent4.input
        ? {
            ...workspace.agent4.input,
            epics: applyStoryUpdate(workspace.agent4.input.epics) ?? [],
            estimations: updateStoryEstimation(
              workspace.agent4.input.estimations,
              storyId,
              estimationUpdates
            ),
          }
        : null,
    },
    agent5: {
      ...workspace.agent5,
      plan: updatedPlan,
      input: workspace.agent5.input
        ? {
            ...workspace.agent5.input,
            epics: applyStoryUpdate(workspace.agent5.input.epics) ?? [],
            estimations: updateStoryEstimation(
              workspace.agent5.input.estimations,
              storyId,
              estimationUpdates
            ),
            priorities: updateStoryPrioritization(
              workspace.agent5.input.priorities,
              storyId,
              prioritizationUpdates
            ),
          }
        : null,
    },
    pipeline: {
      agent2Input: workspace.pipeline.agent2Input,
      agent3Input: workspace.pipeline.agent3Input
        ? {
            ...workspace.pipeline.agent3Input,
            epics: applyStoryUpdate(workspace.pipeline.agent3Input.epics) ?? [],
          }
        : null,
      agent4Input: workspace.pipeline.agent4Input
        ? {
            ...workspace.pipeline.agent4Input,
            epics: applyStoryUpdate(workspace.pipeline.agent4Input.epics) ?? [],
            estimations: updateStoryEstimation(
              workspace.pipeline.agent4Input.estimations,
              storyId,
              estimationUpdates
            ),
          }
        : null,
      agent5Input: workspace.pipeline.agent5Input
        ? {
            ...workspace.pipeline.agent5Input,
            epics: applyStoryUpdate(workspace.pipeline.agent5Input.epics) ?? [],
            estimations: updateStoryEstimation(
              workspace.pipeline.agent5Input.estimations,
              storyId,
              estimationUpdates
            ),
            priorities: updateStoryPrioritization(
              workspace.pipeline.agent5Input.priorities,
              storyId,
              prioritizationUpdates
            ),
          }
        : null,
      agent6Input: workspace.pipeline.agent6Input
        ? {
            ...workspace.pipeline.agent6Input,
            epics: applyStoryUpdate(workspace.pipeline.agent6Input.epics) ?? [],
            estimations: updateStoryEstimation(
              workspace.pipeline.agent6Input.estimations,
              storyId,
              estimationUpdates
            ),
            priorities: updateStoryPrioritization(
              workspace.pipeline.agent6Input.priorities,
              storyId,
              prioritizationUpdates
            ),
            plan: updatedPipelinePlan ?? workspace.pipeline.agent6Input.plan,
          }
        : null,
    },
  };

  await saveProjectWorkspace(uid, (await activeProject(uid)), {
    agent2: sanitize(updatedWorkspace.agent2),
    agent3: sanitize(updatedWorkspace.agent3),
    agent4: sanitize(updatedWorkspace.agent4),
    agent5: sanitize(updatedWorkspace.agent5),
    pipeline: sanitize(updatedWorkspace.pipeline),
  });

  return updatedWorkspace;
}

export async function updateSprintPlanAcrossWorkspace(
  uid: string,
  plan: SprintPlan
): Promise<UserWorkspace> {
  const { workspace } = await getWorkspaceData(uid);
  const normalizedPlan = normalizeSprintPlan(plan);
  const updatedWorkspace = withUpdatedSprintPlan(workspace, normalizedPlan);

  await saveProjectWorkspace(uid, (await activeProject(uid)), {
    agent5: sanitize(updatedWorkspace.agent5),
    pipeline: sanitize(updatedWorkspace.pipeline),
  });

  return updatedWorkspace;
}

export async function createUserStoryAcrossWorkspace(
  uid: string,
  input: CreateUserStoryInput
): Promise<UserWorkspace> {
  const { workspace } = await getWorkspaceData(uid);
  const storyId = generateUserStoryId(workspace);
  const story: UserStory = {
    id: storyId,
    title: input.title,
    description: input.description,
    acceptanceCriteria: input.acceptanceCriteria,
    sourceWishIds: [],
    source: 'manual',
    isEdited: false,
    createdAt: Date.now(),
  };
  const estimation: StoryEstimation = {
    points: input.points,
    justification: 'Estimacion creada manualmente desde el dashboard.',
    isModified: true,
  };
  const prioritization: StoryPrioritization | null = input.category
    ? {
        category: input.category,
        justification: 'Priorizacion creada manualmente desde el dashboard.',
        isModified: true,
      }
    : null;
  const updatedAgent5Plan = workspace.agent5.plan
    ? addStoryToSprintPlan(workspace.agent5.plan, storyId, input.sprintId, input.points)
    : null;
  const updatedPipelinePlan = workspace.pipeline.agent6Input?.plan
    ? addStoryToSprintPlan(
        workspace.pipeline.agent6Input.plan,
        storyId,
        input.sprintId,
        input.points
      )
    : null;
  const updatedWorkspace: UserWorkspace = {
    ...workspace,
    agent2: {
      ...workspace.agent2,
      epics: addStoryToEpics(workspace.agent2.epics, input.epicId, story) ?? [],
    },
    agent3: {
      ...workspace.agent3,
      estimations: updateStoryEstimation(workspace.agent3.estimations, storyId, estimation),
      input: workspace.agent3.input
        ? {
            ...workspace.agent3.input,
            epics: addStoryToEpics(workspace.agent3.input.epics, input.epicId, story) ?? [],
          }
        : null,
    },
    agent4: {
      ...workspace.agent4,
      priorities: prioritization
        ? updateStoryPrioritization(workspace.agent4.priorities, storyId, prioritization)
        : workspace.agent4.priorities,
      input: workspace.agent4.input
        ? {
            ...workspace.agent4.input,
            epics: addStoryToEpics(workspace.agent4.input.epics, input.epicId, story) ?? [],
            estimations: updateStoryEstimation(
              workspace.agent4.input.estimations,
              storyId,
              estimation
            ),
          }
        : null,
    },
    agent5: {
      ...workspace.agent5,
      plan: updatedAgent5Plan,
      input: workspace.agent5.input
        ? {
            ...workspace.agent5.input,
            epics: addStoryToEpics(workspace.agent5.input.epics, input.epicId, story) ?? [],
            estimations: updateStoryEstimation(
              workspace.agent5.input.estimations,
              storyId,
              estimation
            ),
            priorities: prioritization
              ? updateStoryPrioritization(workspace.agent5.input.priorities, storyId, prioritization)
              : workspace.agent5.input.priorities,
          }
        : null,
    },
    pipeline: {
      agent2Input: workspace.pipeline.agent2Input,
      agent3Input: workspace.pipeline.agent3Input
        ? {
            ...workspace.pipeline.agent3Input,
            epics: addStoryToEpics(workspace.pipeline.agent3Input.epics, input.epicId, story) ?? [],
          }
        : null,
      agent4Input: workspace.pipeline.agent4Input
        ? {
            ...workspace.pipeline.agent4Input,
            epics: addStoryToEpics(workspace.pipeline.agent4Input.epics, input.epicId, story) ?? [],
            estimations: updateStoryEstimation(
              workspace.pipeline.agent4Input.estimations,
              storyId,
              estimation
            ),
          }
        : null,
      agent5Input: workspace.pipeline.agent5Input
        ? {
            ...workspace.pipeline.agent5Input,
            epics: addStoryToEpics(workspace.pipeline.agent5Input.epics, input.epicId, story) ?? [],
            estimations: updateStoryEstimation(
              workspace.pipeline.agent5Input.estimations,
              storyId,
              estimation
            ),
            priorities: prioritization
              ? updateStoryPrioritization(
                  workspace.pipeline.agent5Input.priorities,
                  storyId,
                  prioritization
                )
              : workspace.pipeline.agent5Input.priorities,
          }
        : null,
      agent6Input: workspace.pipeline.agent6Input
        ? {
            ...workspace.pipeline.agent6Input,
            epics: addStoryToEpics(workspace.pipeline.agent6Input.epics, input.epicId, story) ?? [],
            estimations: updateStoryEstimation(
              workspace.pipeline.agent6Input.estimations,
              storyId,
              estimation
            ),
            priorities: prioritization
              ? updateStoryPrioritization(
                  workspace.pipeline.agent6Input.priorities,
                  storyId,
                  prioritization
                )
              : workspace.pipeline.agent6Input.priorities,
            plan: updatedPipelinePlan ?? workspace.pipeline.agent6Input.plan,
          }
        : null,
    },
    execution: workspace.execution
      ? {
          ...workspace.execution,
          stories: {
            ...workspace.execution.stories,
            [storyId]: createDefaultStoryExecution(
              Object.keys(workspace.execution.stories).length
            ),
          },
        }
      : workspace.execution,
  };

  await saveProjectWorkspace(uid, (await activeProject(uid)), {
    agent2: sanitize(updatedWorkspace.agent2),
    agent3: sanitize(updatedWorkspace.agent3),
    agent4: sanitize(updatedWorkspace.agent4),
    agent5: sanitize(updatedWorkspace.agent5),
    pipeline: sanitize(updatedWorkspace.pipeline),
    ...(updatedWorkspace.execution ? { execution: sanitize(updatedWorkspace.execution) } : {}),
  });

  return updatedWorkspace;
}

export async function deleteUserStoryAcrossWorkspace(
  uid: string,
  storyId: string
): Promise<UserWorkspace> {
  const { workspace } = await getWorkspaceData(uid);
  const storyPoints =
    workspace.agent5.input?.estimations[storyId]?.points ??
    workspace.agent3.estimations[storyId]?.points ??
    0;
  const updatedAgent5Plan = workspace.agent5.plan
    ? removeStoryFromSprintPlan(workspace.agent5.plan, storyId, storyPoints)
    : null;
  const updatedPipelinePlan = workspace.pipeline.agent6Input?.plan
    ? removeStoryFromSprintPlan(workspace.pipeline.agent6Input.plan, storyId, storyPoints)
    : null;
  const updatedWorkspace: UserWorkspace = {
    ...workspace,
    agent2: {
      ...workspace.agent2,
      epics: deleteStoryFromEpics(workspace.agent2.epics, storyId) ?? [],
    },
    agent3: {
      ...workspace.agent3,
      estimations: deleteRecordEntry(workspace.agent3.estimations, storyId),
      input: workspace.agent3.input
        ? {
            ...workspace.agent3.input,
            epics: deleteStoryFromEpics(workspace.agent3.input.epics, storyId) ?? [],
          }
        : null,
    },
    agent4: {
      ...workspace.agent4,
      priorities: deleteRecordEntry(workspace.agent4.priorities, storyId),
      input: workspace.agent4.input
        ? {
            ...workspace.agent4.input,
            epics: deleteStoryFromEpics(workspace.agent4.input.epics, storyId) ?? [],
            estimations: deleteRecordEntry(workspace.agent4.input.estimations, storyId),
          }
        : null,
    },
    agent5: {
      ...workspace.agent5,
      plan: updatedAgent5Plan,
      input: workspace.agent5.input
        ? {
            ...workspace.agent5.input,
            epics: deleteStoryFromEpics(workspace.agent5.input.epics, storyId) ?? [],
            estimations: deleteRecordEntry(workspace.agent5.input.estimations, storyId),
            priorities: deleteRecordEntry(workspace.agent5.input.priorities, storyId),
          }
        : null,
    },
    pipeline: {
      agent2Input: workspace.pipeline.agent2Input,
      agent3Input: workspace.pipeline.agent3Input
        ? {
            ...workspace.pipeline.agent3Input,
            epics: deleteStoryFromEpics(workspace.pipeline.agent3Input.epics, storyId) ?? [],
          }
        : null,
      agent4Input: workspace.pipeline.agent4Input
        ? {
            ...workspace.pipeline.agent4Input,
            epics: deleteStoryFromEpics(workspace.pipeline.agent4Input.epics, storyId) ?? [],
            estimations: deleteRecordEntry(workspace.pipeline.agent4Input.estimations, storyId),
          }
        : null,
      agent5Input: workspace.pipeline.agent5Input
        ? {
            ...workspace.pipeline.agent5Input,
            epics: deleteStoryFromEpics(workspace.pipeline.agent5Input.epics, storyId) ?? [],
            estimations: deleteRecordEntry(workspace.pipeline.agent5Input.estimations, storyId),
            priorities: deleteRecordEntry(workspace.pipeline.agent5Input.priorities, storyId),
          }
        : null,
      agent6Input: workspace.pipeline.agent6Input
        ? {
            ...workspace.pipeline.agent6Input,
            epics: deleteStoryFromEpics(workspace.pipeline.agent6Input.epics, storyId) ?? [],
            estimations: deleteRecordEntry(workspace.pipeline.agent6Input.estimations, storyId),
            priorities: deleteRecordEntry(workspace.pipeline.agent6Input.priorities, storyId),
            plan: updatedPipelinePlan ?? workspace.pipeline.agent6Input.plan,
          }
        : null,
    },
    execution: workspace.execution
      ? {
          ...workspace.execution,
          stories: deleteRecordEntry(workspace.execution.stories, storyId),
        }
      : workspace.execution,
  };

  await saveProjectWorkspace(uid, (await activeProject(uid)), {
    agent2: sanitize(updatedWorkspace.agent2),
    agent3: sanitize(updatedWorkspace.agent3),
    agent4: sanitize(updatedWorkspace.agent4),
    agent5: sanitize(updatedWorkspace.agent5),
    pipeline: sanitize(updatedWorkspace.pipeline),
    ...(updatedWorkspace.execution ? { execution: sanitize(updatedWorkspace.execution) } : {}),
  });

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

/** Marca el Agente 4 como aprobado y escribe el input para el Agente 5. */
export async function approveAgent4(uid: string, agent5Input: Agent5Input): Promise<void> {
  const { workspace } = await getWorkspaceData(uid);
  const agent4Input: Agent4Input = {
    epics: agent5Input.epics,
    estimations: agent5Input.estimations,
    sourceWishIds: agent5Input.sourceWishIds,
    approvedAt: agent5Input.approvedAt,
  };
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
      agent6Input: null,
    },
  });
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
