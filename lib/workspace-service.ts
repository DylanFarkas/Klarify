/**
 * @fileoverview Servicio de workspace sobre Firestore (Admin SDK).
 *
 * Encapsula todas las lecturas/escrituras de `users/{uid}.workspace` y
 * `users/{uid}.preferences`. Sigue el mismo patrón que `lib/github-integration.ts`:
 * acceso server-side vía Admin SDK, expuesto a través de API routes autenticadas.
 */

import { FieldValue, type DocumentSnapshot } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebase-admin';
import {
  assertProjectSlotAccessible,
  checkAndIncrementRegeneration,
  ensureUserAccount,
  resolveUserPlan,
} from '@/lib/plans/plan-service';
import { PlanLimitError } from '@/lib/plans/plan-errors';
import type { RegenerationAgent } from '@/lib/plans/types';
import {
  getProjectWorkspace,
  loadActiveProjectWorkspace,
  projectDoc,
  readActiveProjectId,
  resolveActiveProject,
} from '@/lib/project-service';
import {
  persistAgent1Only,
  persistCanonicalBacklogWrite,
  persistCanonicalEpicPatch,
  persistCanonicalStoryPatch,
  persistExecutionStories,
  persistExecutionStoryFields,
  persistExecutionWorkspaceMeta,
  persistSprintFilterOnly,
  persistSprintPlanOnly,
  persistStackOnly,
  persistWorkspace,
  readBacklogIds,
  readCanonicalEpic,
  readCanonicalStory,
  readExecutionStories,
  readPipelineMeta,
  readPipelinePlan,
  projectRef,
  type PersistSlice,
} from '@/lib/project-store';
import { deleteProjectSlices } from '@/lib/project-store/cleanup';
import type { ProjectDocument } from '@/lib/types/project';
import { SCHEMA_VERSION_CURRENT } from '@/lib/types/project-schema';
import type { PipelineMeta, WorkspaceScope } from '@/lib/types/project-schema';
import { createEmptyWorkspace } from '@/lib/types/workspace';
import type { Agent1State } from '@/lib/types/agent-1';
import type {
  Agent2State,
  Agent2Input,
  BugSeverity,
  Epic,
  StorySubtask,
  UserStory,
  WorkItemType,
} from '@/lib/types/agent-2';
import type { Agent3State, EstimationMode, StoryEstimation } from '@/lib/types/agent-3';
import type { Agent4State, FrameworkCategory, StoryPrioritization } from '@/lib/types/agent-4';
import type { Agent5State, SprintDatePatch, SprintPlan } from '@/lib/types/agent-5';
import {
  addSprintToPlan,
  addStoryToSprintPlan,
  adjustSprintVelocityForStoryPoints,
  assertCompletedSprintsUnchanged,
  assertStoryNotInCompletedSprint,
  assignStoryToSprintInPlan,
  removeStoryFromSprintPlan,
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
import { generateSubtaskId, nextEpicIdFromIds, nextWorkItemIdFromIds } from '@/lib/utils/agent-2-ids';
import { MAX_SUBTASKS_PER_STORY } from '@/lib/constants/agent-2';
import {
  buildManualEstimation,
  getEffortValue,
  isEstimationMode,
  normalizeEstimationPatchForMode,
} from '@/lib/utils/estimation';
import {
  isBugSeverity,
  isWorkItemType,
  normalizeSubtasks,
  normalizeUserStory,
  resolveWorkItemType,
  validateWorkItemFields,
} from '@/lib/utils/work-item-validation';
import {
  updateStoryEstimation,
  updateStoryPrioritization,
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
import type { ProjectStack } from '@/lib/types/stack';
import { mergeStackUpdate, prepareStackForFirestore } from '@/lib/stack/normalize';
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
  estimationMode: null,
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
  points?: number;
  durationLabel?: string;
  /** Prioridad según el framework activo del Agente 4. */
  category?: FrameworkCategory;
  severity?: import('@/lib/types/agent-2').BugSeverity;
  stepsToReproduce?: string[];
  technicalNotes?: string;
  subtasks?: StorySubtask[] | string[];
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

/**
 * Proyecto sobre el que operar.
 *
 * Cuando el cliente manda `projectId` no hay que leer el doc de usuario para
 * resolver el proyecto activo: la ruta `users/{uid}/projects/{id}` hace
 * imposible tocar datos de otro usuario, y el estado del slot se valida en el
 * punto donde se lee el doc del proyecto.
 */
interface TargetProject {
  projectId: string;
  /** Doc del proyecto si hubo que leerlo para resolver el activo. */
  snapshot: DocumentSnapshot | null;
  /** Doc del usuario si hubo que leerlo (reutilizable en checks de plan). */
  userSnapshot: DocumentSnapshot | null;
}

async function resolveTargetProject(
  uid: string,
  clientProjectId?: string
): Promise<TargetProject> {
  const trimmed = clientProjectId?.trim();
  if (trimmed) {
    return { projectId: trimmed, snapshot: null, userSnapshot: null };
  }
  const resolved = await resolveActiveProject(uid);
  if (!resolved) {
    throw new Error('NO_PROJECTS');
  }
  return resolved;
}

/** Valida existencia y estado del slot a partir del doc raíz ya leído. */
function assertProjectDocAccessible(snap: DocumentSnapshot): ProjectDocument {
  if (!snap.exists) {
    throw new Error('PROJECT_NOT_FOUND');
  }
  const doc = snap.data() as ProjectDocument;
  assertProjectSlotAccessible(doc.status === 'locked' ? 'locked' : 'active');
  return doc;
}

async function loadProjectWorkspace(
  uid: string
): Promise<{ projectId: string; workspace: UserWorkspace }> {
  const loaded = await loadActiveProjectWorkspace(uid, undefined, 'shell');
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
  let nextWorkspace: UserWorkspace = {
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
    stack: partial.stack !== undefined ? partial.stack : current.stack,
  };
  const slices = inferPersistSlices(workspacePartial, nextWorkspace);
  await persistWorkspace(uid, projectId, nextWorkspace, slices, current);
}

function inferPersistSlices(
  partial: Record<string, unknown>,
  next: UserWorkspace
): PersistSlice[] {
  const keys = Object.keys(partial);
  if (keys.length === 0) return ['all'];
  const slices = new Set<PersistSlice>();
  if (keys.includes('agent1')) slices.add('transcription');
  if (
    keys.includes('agent2') ||
    keys.includes('agent3') ||
    keys.includes('agent4') ||
    keys.includes('agent5') ||
    keys.includes('pipeline')
  ) {
    slices.add('backlog');
  }
  if (keys.includes('agent2') || keys.includes('agent3') || keys.includes('agent4') || keys.includes('agent5')) {
    slices.add('history');
  }
  if (keys.includes('pipeline') && isDashboardPhase(next) && next.agent2.epics.length > 0) {
    slices.add('history');
  }
  if (keys.includes('execution')) slices.add('execution');
  return [...slices];
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

/** Contexto para mutar el backlog canónico sin cargar el workspace completo. */
interface CanonicalBacklogContext {
  meta: PipelineMeta;
  plan: SprintPlan | null;
  estimationMode: EstimationMode;
  executionInitialized: boolean;
}

/**
 * Devuelve `null` en proyectos pre-v4 o anteriores al dashboard, donde el
 * backlog vivo todavía es el fan-out de agentes 2–5 y hay que rematerializarlo.
 */
async function resolveCanonicalBacklogContext(
  uid: string,
  projectId: string,
  preloadedDoc?: DocumentSnapshot
): Promise<CanonicalBacklogContext | null> {
  const [snap, meta] = await Promise.all([
    preloadedDoc ?? projectRef(uid, projectId).get(),
    readPipelineMeta(uid, projectId),
  ]);
  const doc = assertProjectDocAccessible(snap);
  if (!meta) return null;
  if ((doc.schemaVersion ?? 1) < SCHEMA_VERSION_CURRENT || doc.workspace) return null;
  if ((doc.pipelineStep ?? 0) < 6) return null;

  return {
    meta,
    plan: meta.plan ? normalizeSprintPlan(meta.plan) : null,
    estimationMode: isEstimationMode(meta.estimationMode) ? meta.estimationMode : 'story_points',
    executionInitialized: Boolean(doc.workspaceMeta?.executionInitializedAt),
  };
}

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

type UserPlanSnapshot = Awaited<ReturnType<typeof resolveUserPlan>>;

function assertCanCreateEpicCount(plan: UserPlanSnapshot, epicCount: number): void {
  if (epicCount >= plan.limits.maxEpics) {
    throw new PlanLimitError(
      `Tu plan ${plan.id} permite hasta ${plan.limits.maxEpics} épica(s).`,
      'PLAN_EPIC_LIMIT',
      { upgradeTo: plan.id === 'free' ? 'starter' : plan.id === 'starter' ? 'pro' : undefined }
    );
  }
}

async function assertCanCreateEpic(uid: string, workspace: UserWorkspace): Promise<void> {
  assertCanCreateEpicCount(await resolveUserPlan(uid), getLiveBacklog(workspace).epics.length);
}

function assertCanCreateStoryCounts(
  plan: UserPlanSnapshot,
  totalStories: number,
  storiesInEpic: number | null
): void {
  if (totalStories >= plan.limits.maxStories) {
    throw new PlanLimitError(
      `Tu plan ${plan.id} permite hasta ${plan.limits.maxStories} historia(s).`,
      'PLAN_STORY_LIMIT',
      { upgradeTo: plan.id === 'free' ? 'starter' : plan.id === 'starter' ? 'pro' : undefined }
    );
  }

  if (storiesInEpic !== null && storiesInEpic >= plan.limits.maxStoriesPerEpic) {
    throw new PlanLimitError(
      `Tu plan ${plan.id} permite hasta ${plan.limits.maxStoriesPerEpic} historia(s) por épica.`,
      'PLAN_STORY_LIMIT',
      { upgradeTo: plan.id === 'free' ? 'starter' : plan.id === 'starter' ? 'pro' : undefined }
    );
  }
}

async function assertCanCreateStory(
  uid: string,
  workspace: UserWorkspace,
  epicId: string
): Promise<void> {
  const liveEpics = getLiveBacklog(workspace).epics;
  const totalStories = liveEpics.reduce((sum, epic) => sum + epic.userStories.length, 0);
  const epic = liveEpics.find((item) => item.id === epicId);
  assertCanCreateStoryCounts(
    await resolveUserPlan(uid),
    totalStories,
    epic ? epic.userStories.length : null
  );
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

async function saveExecutionState(
  uid: string,
  execution: ExecutionState,
  ctx?: { projectId: string; workspace: UserWorkspace },
  options?: { persistStories?: boolean }
): Promise<UserWorkspace> {
  const projectId = ctx?.projectId ?? (await readActiveProjectId(uid));
  if (!projectId) {
    throw new Error('NO_PROJECTS');
  }
  const workspace = ctx?.workspace ?? (await getProjectWorkspace(uid, projectId, 'shell'));
  const sanitized = sanitize(execution);
  const persistStories = options?.persistStories !== false;
  await Promise.all([
    persistStories
      ? persistExecutionStories(uid, projectId, sanitized.stories)
      : Promise.resolve(),
    persistExecutionWorkspaceMeta(uid, projectId, sanitized),
  ]);
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
  patch: Partial<Pick<StoryExecution, 'status' | 'assigneeId' | 'columnOrder'>>,
  clientProjectId?: string,
  previous?: { status?: KanbanStatus; assigneeId?: string | null }
): Promise<UserWorkspace> {
  const target = await resolveTargetProject(uid, clientProjectId);
  const projectId = target.projectId;
  const touchesLifecycle =
    patch.status !== undefined || patch.assigneeId !== undefined;

  // Sin leer la historia: el cliente manda el estado previo para el activity log.
  // El plan solo hace falta si cambia status/assignee (gate de sprint cerrado).
  const [, plan] = await Promise.all([
    assertExecutionBoardAllowed(uid, target.userSnapshot ?? undefined),
    touchesLifecycle
      ? readPipelinePlan(uid, projectId)
      : Promise.resolve(null),
  ]);

  if (touchesLifecycle) {
    assertStoryNotInCompletedSprint(plan, storyId);
  }

  const now = Date.now();
  const activityEntries: ExecutionActivityEntry[] = [];
  if (
    patch.status !== undefined &&
    previous?.status !== undefined &&
    patch.status !== previous.status
  ) {
    activityEntries.push({
      type: 'status_change',
      from: previous.status,
      to: patch.status,
      at: now,
    });
  } else if (patch.status !== undefined && previous?.status === undefined) {
    activityEntries.push({
      type: 'status_change',
      from: null,
      to: patch.status,
      at: now,
    });
  }

  if (
    patch.assigneeId !== undefined &&
    previous?.assigneeId !== undefined &&
    patch.assigneeId !== previous.assigneeId
  ) {
    activityEntries.push({
      type: 'assignee_change',
      from: previous.assigneeId,
      to: patch.assigneeId,
      at: now,
    });
  } else if (patch.assigneeId !== undefined && previous?.assigneeId === undefined) {
    activityEntries.push({
      type: 'assignee_change',
      from: null,
      to: patch.assigneeId,
      at: now,
    });
  }

  // Evitar activity duplicada cuando el patch no cambia nada respecto a previous.
  const meaningfulActivity = activityEntries.filter((entry) => entry.from !== entry.to);

  const data: FirebaseFirestore.DocumentData = { updatedAt: now };
  if (patch.status !== undefined) data.status = patch.status;
  if (patch.assigneeId !== undefined) data.assigneeId = patch.assigneeId;
  if (patch.columnOrder !== undefined) data.columnOrder = patch.columnOrder;
  if (meaningfulActivity.length > 0) {
    data.activity = FieldValue.arrayUnion(...meaningfulActivity);
  }

  await persistExecutionStoryFields(uid, projectId, { [storyId]: data });

  const empty = createEmptyWorkspace();
  return {
    ...empty,
    execution: {
      initializedAt: Date.now(),
      members: [],
      sprintFilter: 'all',
      stories: {
        [storyId]: {
          status: patch.status ?? previous?.status ?? 'todo',
          assigneeId:
            patch.assigneeId !== undefined ? patch.assigneeId : (previous?.assigneeId ?? null),
          columnOrder: patch.columnOrder ?? 0,
          updatedAt: now,
          activity: meaningfulActivity,
        },
      },
    },
  };
}

export interface StoryExecutionReorderUpdate {
  storyId: string;
  status: KanbanStatus;
  columnOrder: number;
  previousStatus?: KanbanStatus;
}

export async function bulkUpdateStoryExecutions(
  uid: string,
  updates: StoryExecutionReorderUpdate[],
  clientProjectId?: string
): Promise<UserWorkspace> {
  const target = await resolveTargetProject(uid, clientProjectId);
  const projectId = target.projectId;

  const [, plan] = await Promise.all([
    assertExecutionBoardAllowed(uid, target.userSnapshot ?? undefined),
    readPipelinePlan(uid, projectId),
  ]);

  const now = Date.now();
  const fields: Record<string, FirebaseFirestore.DocumentData> = {};
  const changed: Record<string, StoryExecution> = {};

  for (const update of updates) {
    if (isStoryInCompletedSprint(plan, update.storyId)) {
      if (
        update.previousStatus === undefined ||
        update.status !== update.previousStatus
      ) {
        // Reorden con cambio de columna en sprint cerrado → error; si no hay
        // previousStatus no podemos distinguir y omitimos por seguridad.
        if (
          update.previousStatus !== undefined &&
          update.status !== update.previousStatus
        ) {
          assertStoryNotInCompletedSprint(plan, update.storyId);
        }
      }
      continue;
    }

    const data: FirebaseFirestore.DocumentData = {
      status: update.status,
      columnOrder: update.columnOrder,
      updatedAt: now,
    };

    const statusChanged =
      update.previousStatus !== undefined && update.previousStatus !== update.status;
    if (statusChanged && update.previousStatus !== undefined) {
      const fromStatus = update.previousStatus;
      data.activity = FieldValue.arrayUnion({
        type: 'status_change',
        from: fromStatus,
        to: update.status,
        at: now,
      } satisfies ExecutionActivityEntry);
    }

    fields[update.storyId] = data;
    changed[update.storyId] = {
      status: update.status,
      assigneeId: null,
      columnOrder: update.columnOrder,
      updatedAt: now,
      activity:
        statusChanged && update.previousStatus !== undefined
          ? [
              {
                type: 'status_change',
                from: update.previousStatus,
                to: update.status,
                at: now,
              },
            ]
          : [],
    };
  }

  if (Object.keys(fields).length > 0) {
    await persistExecutionStoryFields(uid, projectId, fields);
  }

  const empty = createEmptyWorkspace();
  return {
    ...empty,
    execution: {
      initializedAt: Date.now(),
      members: [],
      sprintFilter: 'all',
      stories: changed,
    },
  };
}

/**
 * Cambia el filtro de sprint del tablero.
 *
 * Devuelve `null` en el camino rápido (el cliente ya aplicó el cambio de forma
 * optimista). El tablero se inicializa en un flujo aparte (`initializeExecution`).
 */
export async function updateExecutionSprintFilter(
  uid: string,
  sprintFilter: string | 'all',
  clientProjectId?: string
): Promise<UserWorkspace | null> {
  const target = await resolveTargetProject(uid, clientProjectId);
  await assertExecutionBoardAllowed(uid, target.userSnapshot ?? undefined);
  await persistSprintFilterOnly(uid, target.projectId, sprintFilter);
  return null;
}

/** Lee el workspace del proyecto activo + preferencias y plan del usuario. */
export async function getWorkspaceData(
  uid: string,
  options?: { scope?: WorkspaceScope; agent?: string; projectId?: string }
): Promise<WorkspaceResponse> {
  const clientProjectId = options?.projectId?.trim();

  // Con el projectId del cliente, el doc de usuario y el workspace del proyecto
  // se leen en paralelo en vez de encadenar usuario → proyecto → subcolecciones.
  if (clientProjectId) {
    try {
      const [snapshot, workspace] = await Promise.all([
        ensureUserAccount(uid),
        getProjectWorkspace(uid, clientProjectId, options?.scope ?? 'shell', options?.agent),
      ]);
      const plan = await resolveUserPlan(uid, snapshot);
      const prefs = snapshot.data()?.preferences as Partial<WorkspacePreferences> | undefined;
      return {
        workspace,
        preferences: { lastAgent: prefs?.lastAgent ?? '1' },
        activeProjectId: clientProjectId,
        plan: {
          id: plan.id,
          limits: plan.limits,
          usage: plan.usage,
          subscription: plan.subscription,
        },
        scope: options?.scope ?? 'shell',
        agent: options?.agent,
      };
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'PROJECT_NOT_FOUND') {
        throw error;
      }
      // El proyecto que el cliente creía activo ya no existe: resolver en servidor.
    }
  }

  const snapshot = await ensureUserAccount(uid);
  const prefs = snapshot.data()?.preferences as Partial<WorkspacePreferences> | undefined;
  const preferences: WorkspacePreferences = {
    lastAgent: prefs?.lastAgent ?? '1',
  };
  const scope = options?.scope ?? 'shell';

  const [plan, loaded] = await Promise.all([
    resolveUserPlan(uid, snapshot),
    loadActiveProjectWorkspace(uid, snapshot, scope, options?.agent),
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
      scope,
      agent: options?.agent,
    };
  }

  return {
    workspace: loaded.workspace,
    preferences,
    activeProjectId: loaded.projectId,
    plan: planSnapshot,
    scope,
    agent: options?.agent,
  };
}

/** Guarda (merge) el estado del Agente 1. */
export async function saveAgent1State(uid: string, state: Agent1State): Promise<void> {
  const projectId = await activeProject(uid);
  await persistAgent1Only(uid, projectId, sanitize(state));
}

/** Guarda (merge) el estado del Agente 2. */
export async function saveAgent2State(uid: string, state: Agent2State): Promise<void> {
  const projectId = await activeProject(uid);
  await saveProjectWorkspace(uid, projectId, {
    agent2: sanitize(state),
  });
}

function normalizeUserStoryPatch(
  current: UserStory,
  updates: Partial<UserStory>
): Partial<UserStory> {
  const { type: _ignoredType, id: _ignoredId, ...safeUpdates } = updates;
  const type = resolveWorkItemType(current);

  const validationError = validateWorkItemFields(
    {
      type,
      title: safeUpdates.title ?? current.title,
      description: safeUpdates.description ?? current.description,
      acceptanceCriteria:
        safeUpdates.acceptanceCriteria ?? current.acceptanceCriteria ?? [],
      severity: safeUpdates.severity ?? current.severity,
      stepsToReproduce:
        safeUpdates.stepsToReproduce ?? current.stepsToReproduce ?? [],
      technicalNotes: safeUpdates.technicalNotes ?? current.technicalNotes,
      subtasks: safeUpdates.subtasks ?? current.subtasks,
    },
    { partial: false }
  );
  if (validationError) {
    throw new Error(validationError);
  }

  const normalizedPatch: Partial<UserStory> = { ...safeUpdates };
  if (safeUpdates.subtasks !== undefined) {
    normalizedPatch.subtasks = normalizeSubtasks(safeUpdates.subtasks);
  }
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
  return normalizedPatch;
}

/** Actualiza una HU en el backlog canónico (story + meta, sin recargar el workspace). */
export async function updateUserStoryAcrossWorkspace(
  uid: string,
  storyId: string,
  updates: Partial<UserStory>,
  estimationUpdates?: Partial<StoryEstimation>,
  options?: UpdateUserStoryOptions,
  prioritizationUpdates?: Partial<StoryPrioritization>,
  clientProjectId?: string
): Promise<UserWorkspace> {
  const target = await resolveTargetProject(uid, clientProjectId);
  const projectId = target.projectId;
  const requestedEpicId = options?.epicId;
  const [rootSnap, stored, meta, targetEpic] = await Promise.all([
    target.snapshot ?? projectRef(uid, projectId).get(),
    readCanonicalStory(uid, projectId, storyId),
    readPipelineMeta(uid, projectId),
    requestedEpicId
      ? readCanonicalEpic(uid, projectId, requestedEpicId)
      : Promise.resolve(null),
  ]);
  assertProjectDocAccessible(rootSnap);

  const needsPipelineMeta =
    estimationUpdates !== undefined ||
    prioritizationUpdates !== undefined ||
    options?.sprintId !== undefined;

  if (!stored || (needsPipelineMeta && !meta)) {
    return updateUserStoryAcrossWorkspaceLegacy(
      uid,
      projectId,
      storyId,
      updates,
      estimationUpdates,
      options,
      prioritizationUpdates
    );
  }

  assertStoryNotInCompletedSprint(meta?.plan ?? null, storyId);

  const { epicId: currentEpicId, ...currentStory } = stored;
  const normalizedPatch = normalizeUserStoryPatch(currentStory, updates);
  const mode = isEstimationMode(meta?.estimationMode) ? meta.estimationMode : 'story_points';
  const normalizedEstimation = normalizeEstimationPatchForMode(mode, estimationUpdates);

  const nextStory = {
    ...stored,
    ...normalizedPatch,
    isEdited: true,
  };

  const shouldMoveEpic =
    options?.epicId !== undefined && options.epicId !== currentEpicId;
  if (shouldMoveEpic) {
    if (!targetEpic) {
      throw new Error(`Épica no encontrada: ${options.epicId}`);
    }
    nextStory.epicId = options.epicId!;
  }

  const currentEstimation = meta?.estimations[storyId];
  const nextEstimation = normalizedEstimation
    ? updateStoryEstimation(meta?.estimations ?? {}, storyId, normalizedEstimation)[storyId]
    : currentEstimation;
  const oldEffort = getEffortValue(currentEstimation, mode);
  const newEffort = getEffortValue(nextEstimation, mode);
  const effortChanged = normalizedEstimation !== undefined && oldEffort !== newEffort;

  let nextPlan = meta?.plan ?? null;
  if (nextPlan) {
    if (options?.sprintId !== undefined) {
      nextPlan = assignStoryToSprintInPlan(nextPlan, storyId, options.sprintId, newEffort);
    } else if (effortChanged) {
      nextPlan = adjustSprintVelocityForStoryPoints(nextPlan, storyId, oldEffort, newEffort);
    }
  }

  const nextPrioritization = prioritizationUpdates
    ? updateStoryPrioritization(meta?.priorities ?? {}, storyId, prioritizationUpdates)[storyId]
    : undefined;

  const metaPatch =
    normalizedEstimation !== undefined ||
    nextPrioritization !== undefined ||
    options?.sprintId !== undefined ||
    effortChanged
      ? {
          ...(normalizedEstimation && nextEstimation
            ? { estimation: nextEstimation }
            : {}),
          ...(nextPrioritization ? { prioritization: nextPrioritization } : {}),
          ...(options?.sprintId !== undefined || effortChanged ? { plan: nextPlan } : {}),
        }
      : null;

  // Mover de épica sin releer docs: arrayRemove / arrayUnion en un solo batch.
  if (shouldMoveEpic && options?.epicId) {
    await persistCanonicalBacklogWrite(uid, projectId, {
      stories: [nextStory],
      epicStoryIdPatches: [
        { epicId: currentEpicId, removeStoryIds: [storyId], markEdited: true },
        { epicId: options.epicId, addStoryIds: [storyId], markEdited: true },
      ],
      ...(metaPatch?.estimation
        ? { estimations: { [storyId]: metaPatch.estimation } }
        : {}),
      ...(metaPatch?.prioritization
        ? { prioritizations: { [storyId]: metaPatch.prioritization } }
        : {}),
      ...(metaPatch?.plan !== undefined ? { plan: metaPatch.plan } : {}),
    });
  } else {
    await persistCanonicalStoryPatch(uid, projectId, nextStory, metaPatch);
  }

  return createEmptyWorkspace();
}

async function updateUserStoryAcrossWorkspaceLegacy(
  uid: string,
  projectId: string,
  storyId: string,
  updates: Partial<UserStory>,
  estimationUpdates?: Partial<StoryEstimation>,
  options?: UpdateUserStoryOptions,
  prioritizationUpdates?: Partial<StoryPrioritization>
): Promise<UserWorkspace> {
  const workspace = await getProjectWorkspace(uid, projectId);
  const live = getLiveBacklog(workspace);
  const current = live.epics
    .flatMap((epic) => epic.userStories)
    .find((story) => story.id === storyId);
  if (!current) {
    throw new Error(`Historia no encontrada: ${storyId}`);
  }

  assertStoryNotInCompletedSprint(live.plan, storyId);
  const normalizedPatch = normalizeUserStoryPatch(current, updates);
  const normalizedEstimation = normalizeEstimationPatchForMode(live.estimationMode, estimationUpdates);
  const updatedWorkspace = withUpdatedUserStory(
    workspace,
    storyId,
    normalizedPatch,
    normalizedEstimation,
    options,
    prioritizationUpdates
  );

  await persistBacklogMutation(uid, projectId, workspace, updatedWorkspace);
  return updatedWorkspace;
}

async function loadLiveStoryForSubtask(
  uid: string,
  storyId: string
): Promise<UserStory> {
  const { workspace } = await getWorkspaceData(uid);
  const story = getLiveBacklog(workspace).epics
    .flatMap((epic) => epic.userStories)
    .find((item) => item.id === storyId);
  if (!story) {
    throw new Error(`Historia no encontrada: ${storyId}`);
  }
  assertStoryNotInCompletedSprint(getLiveBacklog(workspace).plan, storyId);
  return normalizeUserStory(story);
}

export async function createSubtaskAcrossWorkspace(
  uid: string,
  storyId: string,
  title: string
): Promise<{ workspace: UserWorkspace; subtask: StorySubtask }> {
  const story = await loadLiveStoryForSubtask(uid, storyId);
  const current = normalizeSubtasks(story.subtasks);
  if (current.length >= MAX_SUBTASKS_PER_STORY) {
    throw new Error(`Máximo ${MAX_SUBTASKS_PER_STORY} subtareas por historia.`);
  }
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error('Cada subtarea necesita un título.');
  }
  const subtask: StorySubtask = {
    id: generateSubtaskId(current),
    title: trimmed,
    done: false,
  };
  const workspace = await updateUserStoryAcrossWorkspace(uid, storyId, {
    subtasks: [...current, subtask],
  });
  return { workspace, subtask };
}

export async function updateSubtaskAcrossWorkspace(
  uid: string,
  storyId: string,
  subtaskId: string,
  updates: { title?: string; done?: boolean }
): Promise<{ workspace: UserWorkspace; subtask: StorySubtask }> {
  const story = await loadLiveStoryForSubtask(uid, storyId);
  const current = normalizeSubtasks(story.subtasks);
  const index = current.findIndex((item) => item.id === subtaskId);
  if (index === -1) {
    throw new Error(`Subtarea no encontrada: ${subtaskId}`);
  }
  const nextTitle =
    updates.title !== undefined ? updates.title.trim() : current[index].title;
  if (!nextTitle) {
    throw new Error('Cada subtarea necesita un título.');
  }
  const subtask: StorySubtask = {
    ...current[index],
    title: nextTitle,
    done: updates.done !== undefined ? updates.done : current[index].done,
  };
  const next = [...current];
  next[index] = subtask;
  const workspace = await updateUserStoryAcrossWorkspace(uid, storyId, {
    subtasks: next,
  });
  return { workspace, subtask };
}

export async function deleteSubtaskAcrossWorkspace(
  uid: string,
  storyId: string,
  subtaskId: string
): Promise<UserWorkspace> {
  const story = await loadLiveStoryForSubtask(uid, storyId);
  const current = normalizeSubtasks(story.subtasks);
  if (!current.some((item) => item.id === subtaskId)) {
    throw new Error(`Subtarea no encontrada: ${subtaskId}`);
  }
  return updateUserStoryAcrossWorkspace(uid, storyId, {
    subtasks: current.filter((item) => item.id !== subtaskId),
  });
}

function resolveSprintPlan(workspace: UserWorkspace): SprintPlan | null {
  return getLiveBacklog(workspace).plan;
}

/**
 * Contexto mínimo para operar sobre el plan de sprints.
 *
 * En el modelo canónico basta con `pipeline/meta`; sólo los proyectos pre-v4
 * obligan a cargar el workspace completo para poder rematerializarlo.
 */
type SprintPlanContext = { projectId: string; plan: SprintPlan | null } & (
  | { meta: PipelineMeta; legacyWorkspace: null }
  | { meta: null; legacyWorkspace: UserWorkspace }
);

async function resolveSprintPlanContext(
  uid: string,
  clientProjectId?: string
): Promise<SprintPlanContext> {
  const target = await resolveTargetProject(uid, clientProjectId);
  const projectId = target.projectId;
  // Doc raíz (valida existencia/slot) y meta del pipeline en un solo round-trip.
  const [rootSnap, meta] = await Promise.all([
    target.snapshot ?? projectRef(uid, projectId).get(),
    readPipelineMeta(uid, projectId),
  ]);
  assertProjectDocAccessible(rootSnap);
  if (meta) {
    return {
      projectId,
      meta,
      legacyWorkspace: null,
      plan: meta.plan ? normalizeSprintPlan(meta.plan) : null,
    };
  }

  const legacyWorkspace = await getProjectWorkspace(uid, projectId);
  return {
    projectId,
    meta: null,
    legacyWorkspace,
    plan: resolveSprintPlan(legacyWorkspace),
  };
}

function requireSprintPlan(ctx: SprintPlanContext): SprintPlan {
  if (!ctx.plan) {
    throw new Error('No hay plan de sprints en el workspace.');
  }
  return ctx.plan;
}

/** Persiste el plan: una escritura en el modelo canónico, rematerialización en legacy. */
async function applySprintPlan(
  uid: string,
  ctx: SprintPlanContext,
  plan: SprintPlan,
  options?: { sprintFilter?: string }
): Promise<void> {
  if (ctx.plan) {
    assertCompletedSprintsUnchanged(ctx.plan, plan);
  }
  const normalizedPlan = normalizeSprintPlan(plan);

  if (!ctx.meta) {
    const updated = withUpdatedSprintPlan(ctx.legacyWorkspace, normalizedPlan);
    await persistBacklogMutation(uid, ctx.projectId, ctx.legacyWorkspace, updated);
    if (options?.sprintFilter !== undefined && updated.execution?.initializedAt) {
      await updateExecutionSprintFilter(uid, options.sprintFilter);
    }
    return;
  }

  await persistSprintPlanOnly(uid, ctx.projectId, normalizedPlan, options);
}

export async function updateSprintPlanAcrossWorkspace(
  uid: string,
  plan: SprintPlan,
  clientProjectId?: string
): Promise<UserWorkspace> {
  const ctx = await resolveSprintPlanContext(uid, clientProjectId);
  await applySprintPlan(uid, ctx, plan);
  return createEmptyWorkspace();
}

export async function createSprintAcrossWorkspace(
  uid: string,
  input?: { goal?: string }
): Promise<{ workspace: UserWorkspace; sprintId: string; sprintGoal: string }> {
  const ctx = await resolveSprintPlanContext(uid);
  const updatedPlan = addSprintToPlan(requireSprintPlan(ctx), input?.goal);
  const created = updatedPlan.sprints.at(-1);
  if (!created) {
    throw new Error('No se pudo crear el sprint.');
  }
  await applySprintPlan(uid, ctx, updatedPlan);
  return {
    workspace: createEmptyWorkspace(),
    sprintId: created.id,
    sprintGoal: created.sprintGoal,
  };
}

export async function deleteSprintAcrossWorkspace(
  uid: string,
  sprintId: string
): Promise<UserWorkspace> {
  const ctx = await resolveSprintPlanContext(uid);
  const plan = requireSprintPlan(ctx);
  const sprint = plan.sprints.find((item) => item.id === sprintId);
  if (!sprint) {
    throw new Error(`Sprint no encontrado: ${sprintId}`);
  }
  if (sprint.storyIds.length > 0) {
    throw new Error(
      `No se puede eliminar ${sprintId}: tiene ${sprint.storyIds.length} historia(s) asignada(s). Reasígnalas o déjalas sin sprint primero.`
    );
  }
  const nextPlan = deleteEmptySprintFromPlan(plan, sprintId);
  if (!nextPlan) {
    throw new Error(`No se puede eliminar ${sprintId}: el sprint no está vacío.`);
  }
  await applySprintPlan(uid, ctx, nextPlan);
  return createEmptyWorkspace();
}

export async function updateSprintAcrossWorkspace(
  uid: string,
  sprintId: string,
  updates: { goal?: string; dates?: SprintDatePatch }
): Promise<UserWorkspace> {
  const ctx = await resolveSprintPlanContext(uid);
  let nextPlan = requireSprintPlan(ctx);
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
  await applySprintPlan(uid, ctx, nextPlan);
  return createEmptyWorkspace();
}

export async function startSprintAcrossWorkspace(
  uid: string,
  sprintId: string,
  clientProjectId?: string
): Promise<UserWorkspace> {
  const ctx = await resolveSprintPlanContext(uid, clientProjectId);
  const nextPlan = startSprintInPlan(requireSprintPlan(ctx), sprintId);
  // El filtro sólo se refleja si el tablero está inicializado, así que escribirlo
  // siempre es inocuo y ahorra una lectura del doc raíz.
  await applySprintPlan(uid, ctx, nextPlan, { sprintFilter: sprintId });
  return getProjectWorkspace(uid, ctx.projectId);
}

export async function completeSprintAcrossWorkspace(
  uid: string,
  sprintId: string,
  rollover: SprintCompleteRollover = 'backlog',
  clientProjectId?: string
): Promise<UserWorkspace> {
  const ctx = await resolveSprintPlanContext(uid, clientProjectId);
  const plan = requireSprintPlan(ctx);
  const sprint = plan.sprints.find((item) => item.id === sprintId);
  if (!sprint) {
    throw new Error(`Sprint no encontrado: ${sprintId}`);
  }

  const { estimations, estimationMode } = ctx.meta
    ? {
        estimations: ctx.meta.estimations ?? {},
        estimationMode: isEstimationMode(ctx.meta.estimationMode)
          ? ctx.meta.estimationMode
          : 'story_points',
      }
    : getLiveBacklog(ctx.legacyWorkspace);

  const storyPointsById: Record<string, number> = {};
  for (const storyId of sprint.storyIds) {
    storyPointsById[storyId] = getEffortValue(estimations[storyId], estimationMode);
  }

  const executions = ctx.meta
    ? await readExecutionStories(uid, ctx.projectId, sprint.storyIds)
    : ctx.legacyWorkspace.execution?.stories ?? {};

  const incompleteStoryIds = sprint.storyIds.filter(
    (storyId) => (executions[storyId]?.status ?? 'todo') !== 'done'
  );

  const nextPlan = completeSprintInPlan(
    plan,
    sprintId,
    incompleteStoryIds,
    storyPointsById,
    rollover
  );
  await applySprintPlan(uid, ctx, nextPlan);
  return getProjectWorkspace(uid, ctx.projectId);
}

/** Valida y normaliza los campos de un ítem nuevo (común a ambos caminos). */
function buildStoryDraft(input: CreateUserStoryInput): {
  type: WorkItemType;
  severity?: BugSeverity;
  stepsToReproduce?: string[];
  acceptanceCriteria: string[];
  technicalNotes?: string;
  subtasks: StorySubtask[];
} {
  const type = isWorkItemType(input.type) ? input.type : 'story';
  const severity =
    type === 'bug' ? (isBugSeverity(input.severity) ? input.severity : 'medium') : undefined;
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
  const subtasks = normalizeSubtasks(input.subtasks);

  const validationError = validateWorkItemFields({
    type,
    title: input.title,
    description: input.description,
    acceptanceCriteria,
    severity,
    stepsToReproduce,
    technicalNotes,
    subtasks,
  });
  if (validationError) {
    throw new Error(validationError);
  }

  return { type, severity, stepsToReproduce, acceptanceCriteria, technicalNotes, subtasks };
}

function buildStoryFromDraft(
  input: CreateUserStoryInput,
  storyId: string,
  draft: ReturnType<typeof buildStoryDraft>
): UserStory {
  return normalizeUserStory({
    id: storyId,
    type: draft.type,
    title: input.title.trim(),
    description: input.description.trim(),
    acceptanceCriteria: draft.acceptanceCriteria,
    subtasks: draft.subtasks,
    ...(draft.type === 'bug'
      ? {
          severity: draft.severity ?? 'medium',
          stepsToReproduce: draft.stepsToReproduce ?? [],
        }
      : {}),
    ...(draft.type === 'task' && draft.technicalNotes
      ? { technicalNotes: draft.technicalNotes }
      : {}),
    sourceWishIds: [],
    source: 'manual',
    isEdited: false,
    createdAt: Date.now(),
  });
}

function buildStoryEstimation(
  input: CreateUserStoryInput,
  type: WorkItemType,
  mode: EstimationMode
): StoryEstimation {
  const typeLabel = type === 'bug' ? 'Bug' : type === 'task' ? 'Task' : 'Historia';
  return buildManualEstimation({
    mode,
    points: input.points,
    durationLabel: input.durationLabel,
    workItemType: type,
    justification: `${typeLabel} creado(a) manualmente desde el dashboard.`,
  });
}

function buildStoryPrioritization(input: CreateUserStoryInput): StoryPrioritization | null {
  return input.category
    ? {
        category: input.category,
        justification: 'Priorizacion creada manualmente desde el dashboard.',
        isModified: true,
      }
    : null;
}

export async function createUserStoryAcrossWorkspace(
  uid: string,
  input: CreateUserStoryInput,
  clientProjectId?: string
): Promise<{ workspace: UserWorkspace; storyId: string }> {
  const draft = buildStoryDraft(input);
  const target = await resolveTargetProject(uid, clientProjectId);
  const projectId = target.projectId;

  // Una sola etapa de lecturas en paralelo; los límites del plan se validan
  // antes de escribir, así que el gate puede viajar junto al resto.
  const [ctx, epic, { storyIds }, userPlan] = await Promise.all([
    resolveCanonicalBacklogContext(uid, projectId, target.snapshot ?? undefined),
    readCanonicalEpic(uid, projectId, input.epicId),
    readBacklogIds(uid, projectId),
    resolveUserPlan(uid, target.userSnapshot ?? undefined),
  ]);

  if (ctx) {
    if (!epic) {
      throw new Error(`Épica no encontrada: ${input.epicId}`);
    }
    assertCanCreateStoryCounts(userPlan, storyIds.length, epic.storyIds.length);

    const storyId = nextWorkItemIdFromIds(draft.type, storyIds);
    const story = buildStoryFromDraft(input, storyId, draft);
    const estimation = buildStoryEstimation(input, draft.type, ctx.estimationMode);
    const prioritization = buildStoryPrioritization(input);
    const plan = ctx.plan
      ? addStoryToSprintPlan(ctx.plan, storyId, input.sprintId, getEffortValue(estimation, ctx.estimationMode))
      : null;

    await persistCanonicalBacklogWrite(uid, projectId, {
      stories: [{ ...story, epicId: input.epicId }],
      epicStoryIdPatches: [
        { epicId: input.epicId, addStoryIds: [storyId], markEdited: true },
      ],
      estimations: { [storyId]: estimation },
      ...(prioritization ? { prioritizations: { [storyId]: prioritization } } : {}),
      ...(plan ? { plan } : {}),
      ...(ctx.executionInitialized
        ? { executions: { [storyId]: createDefaultStoryExecution(storyIds.length) } }
        : {}),
    });

    return { workspace: createEmptyWorkspace(), storyId };
  }

  const workspace = await getProjectWorkspace(uid, projectId);
  const live = getLiveBacklog(workspace);
  if (!live.epics.some((epic) => epic.id === input.epicId)) {
    throw new Error(`Épica no encontrada: ${input.epicId}`);
  }

  await assertCanCreateStory(uid, workspace, input.epicId);
  const storyId = nextLiveWorkItemId(workspace, draft.type);
  const story = buildStoryFromDraft(input, storyId, draft);
  const updatedWorkspace = withCreatedUserStory(workspace, {
    story,
    epicId: input.epicId,
    sprintId: input.sprintId,
    estimation: buildStoryEstimation(input, draft.type, live.estimationMode),
    prioritization: buildStoryPrioritization(input),
  });

  await persistBacklogMutation(uid, projectId, workspace, updatedWorkspace);

  return { workspace: updatedWorkspace, storyId };
}

export async function deleteUserStoryAcrossWorkspace(
  uid: string,
  storyId: string,
  clientProjectId?: string
): Promise<UserWorkspace> {
  const target = await resolveTargetProject(uid, clientProjectId);
  const projectId = target.projectId;
  const [ctx, stored] = await Promise.all([
    resolveCanonicalBacklogContext(uid, projectId, target.snapshot ?? undefined),
    readCanonicalStory(uid, projectId, storyId),
  ]);

  if (ctx) {
    if (!stored) {
      throw new Error(`Historia no encontrada: ${storyId}`);
    }
    assertStoryNotInCompletedSprint(ctx.plan, storyId, 'eliminar');

    const effort = getEffortValue(ctx.meta.estimations?.[storyId], ctx.estimationMode);

    await persistCanonicalBacklogWrite(uid, projectId, {
      deletedStoryIds: [storyId],
      // arrayRemove evita leer la épica sólo para reescribir su lista de ids.
      epicStoryIdPatches: [{ epicId: stored.epicId, removeStoryIds: [storyId] }],
      removedMetaStoryIds: [storyId],
      ...(ctx.plan ? { plan: removeStoryFromSprintPlan(ctx.plan, storyId, effort) } : {}),
      ...(ctx.executionInitialized ? { deletedExecutionIds: [storyId] } : {}),
    });

    return createEmptyWorkspace();
  }

  const workspace = await getProjectWorkspace(uid, projectId);
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
  input: CreateEpicInput,
  clientProjectId?: string
): Promise<{ workspace: UserWorkspace; epicId: string }> {
  const target = await resolveTargetProject(uid, clientProjectId);
  const projectId = target.projectId;
  const [ctx, { epicIds }, userPlan] = await Promise.all([
    resolveCanonicalBacklogContext(uid, projectId, target.snapshot ?? undefined),
    readBacklogIds(uid, projectId),
    resolveUserPlan(uid, target.userSnapshot ?? undefined),
  ]);

  if (ctx) {
    assertCanCreateEpicCount(userPlan, epicIds.length);

    const epicId = nextEpicIdFromIds(epicIds);
    await persistCanonicalBacklogWrite(uid, projectId, {
      epics: [
        {
          id: epicId,
          title: input.title.trim(),
          description: input.description.trim(),
          source: 'manual',
          isEdited: false,
          createdAt: Date.now(),
          storyIds: [],
        },
      ],
    });

    return { workspace: createEmptyWorkspace(), epicId };
  }

  const workspace = await getProjectWorkspace(uid, projectId);
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
  updates: UpdateEpicInput,
  clientProjectId?: string
): Promise<UserWorkspace> {
  const target = await resolveTargetProject(uid, clientProjectId);
  const projectId = target.projectId;
  const [rootSnap, epic] = await Promise.all([
    target.snapshot ?? projectRef(uid, projectId).get(),
    readCanonicalEpic(uid, projectId, epicId),
  ]);
  assertProjectDocAccessible(rootSnap);
  if (!epic) {
    const workspace = await getProjectWorkspace(uid, projectId);
    const exists = getLiveBacklog(workspace).epics.some((item) => item.id === epicId);
    if (!exists) {
      throw new Error(`Épica no encontrada: ${epicId}`);
    }
    const updatedWorkspace = withUpdatedEpic(workspace, epicId, updates);
    await persistBacklogMutation(uid, projectId, workspace, updatedWorkspace);
    return updatedWorkspace;
  }

  await persistCanonicalEpicPatch(uid, projectId, {
    ...epic,
    ...(updates.title !== undefined ? { title: updates.title.trim() } : {}),
    ...(updates.description !== undefined ? { description: updates.description.trim() } : {}),
    isEdited: true,
  });
  return createEmptyWorkspace();
}

export async function deleteEpicAcrossWorkspace(
  uid: string,
  epicId: string,
  clientProjectId?: string
): Promise<UserWorkspace> {
  const target = await resolveTargetProject(uid, clientProjectId);
  const projectId = target.projectId;
  const [ctx, epic] = await Promise.all([
    resolveCanonicalBacklogContext(uid, projectId, target.snapshot ?? undefined),
    readCanonicalEpic(uid, projectId, epicId),
  ]);

  if (ctx) {
    if (!epic) {
      throw new Error(`Épica no encontrada: ${epicId}`);
    }
    for (const storyId of epic.storyIds) {
      assertStoryNotInCompletedSprint(ctx.plan, storyId, 'eliminar');
    }

    let plan = ctx.plan;
    for (const storyId of epic.storyIds) {
      if (!plan) break;
      const effort = getEffortValue(ctx.meta.estimations?.[storyId], ctx.estimationMode);
      plan = removeStoryFromSprintPlan(plan, storyId, effort);
    }

    await persistCanonicalBacklogWrite(uid, projectId, {
      deletedEpicIds: [epicId],
      deletedStoryIds: epic.storyIds,
      removedMetaStoryIds: epic.storyIds,
      ...(plan ? { plan } : {}),
      ...(ctx.executionInitialized ? { deletedExecutionIds: epic.storyIds } : {}),
    });

    return createEmptyWorkspace();
  }

  const workspace = await getProjectWorkspace(uid, projectId);
  const live = getLiveBacklog(workspace);
  const targetEpic = live.epics.find((epic) => epic.id === epicId);
  if (!targetEpic) {
    throw new Error(`Épica no encontrada: ${epicId}`);
  }
  for (const story of targetEpic.userStories) {
    assertStoryNotInCompletedSprint(live.plan, story.id, 'eliminar');
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
      estimationMode: agent4Input.estimationMode ?? workspace.agent3.estimationMode ?? 'story_points',
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
    estimationMode: agent5Input.estimationMode ?? workspace.agent3.estimationMode ?? 'story_points',
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
          estimationMode:
            workspace.agent4.input.estimationMode ??
            workspace.agent3.estimationMode ??
            'story_points',
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
    estimationMode: agent6Input.estimationMode ?? 'story_points',
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
  await deleteProjectSlices(uid, projectId);
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
    stack: null,
  });
  await userDoc(uid).set(
    {
      preferences: { lastAgent: '1', activeProjectId: projectId },
    },
    { merge: true }
  );
  await projectDoc(uid, projectId).set({ lastAgent: '1' }, { merge: true });
}

/**
 * Persiste el stack tecnológico del proyecto activo.
 *
 * El stack vive en un único campo del doc raíz, así que no hace falta cargar ni
 * rematerializar el backlog. Devuelve el stack ya normalizado.
 */
export async function saveStackAcrossWorkspace(
  uid: string,
  stack: ProjectStack,
  clientProjectId?: string
): Promise<ProjectStack> {
  const target = await resolveTargetProject(uid, clientProjectId);
  const projectId = target.projectId;
  const rootSnap = target.snapshot ?? (await projectRef(uid, projectId).get());
  const doc = assertProjectDocAccessible(rootSnap);
  const current = doc.workspaceMeta?.stack ?? doc.workspace?.stack ?? null;
  const merged = mergeStackUpdate(current ?? undefined, {
    ...stack,
    updatedAt: Date.now(),
  });
  const prepared = sanitize(prepareStackForFirestore(merged));
  await persistStackOnly(uid, projectId, prepared);

  return prepared;
}

/** Elimina el stack tecnológico del proyecto activo. */
export async function clearStackAcrossWorkspace(
  uid: string,
  clientProjectId?: string
): Promise<void> {
  const target = await resolveTargetProject(uid, clientProjectId);
  await persistStackOnly(uid, target.projectId, null);
}

/** Lee el stack del workspace activo. */
export async function getStackFromWorkspace(uid: string): Promise<ProjectStack | null> {
  const { workspace } = await getWorkspaceData(uid);
  return workspace.stack ?? null;
}
