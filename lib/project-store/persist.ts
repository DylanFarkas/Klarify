/**
 * @fileoverview Escribe `UserWorkspace` en el modelo canónico (schema v4).
 */

import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import type { Agent1State } from '@/lib/types/agent-1';
import type { Epic } from '@/lib/types/agent-2';
import type { StoryEstimation } from '@/lib/types/agent-3';
import type { StoryPrioritization } from '@/lib/types/agent-4';
import type { SprintPlan } from '@/lib/types/agent-5';
import type { StoryExecution } from '@/lib/types/execution';
import type { ProjectDocument } from '@/lib/types/project';
import type { ProjectStack } from '@/lib/types/stack';
import {
  SCHEMA_VERSION_CURRENT,
  type PipelineHistoryKey,
  type PipelineMeta,
  type StoredEpic,
  type StoredStory,
} from '@/lib/types/project-schema';
import type { UserWorkspace } from '@/lib/types/workspace';
import {
  deleteTranscriptionArtifact,
  isSlimTranscription,
  isTranscriptionPointer,
  isTranscriptionResult,
  toTranscriptionPointer,
  writeTranscriptionArtifact,
} from '@/lib/artifacts/transcription';
import { isHydratedAgent2, isHydratedAgent3, isHydratedAgent4, isHydratedAgent5, workspaceMetaFromWorkspace } from '@/lib/project-schema';
import {
  backlogEpicsCol,
  backlogStoriesCol,
  executionStoriesCol,
  pipelineHistoryDoc,
  pipelineMetaDoc,
  projectRef,
} from '@/lib/project-store/paths';
import { getLiveBacklog, isDashboardPhase } from '@/lib/utils/live-backlog';
import { DASHBOARD_PROGRESS } from '@/lib/utils/pipeline-ready';
import { computePipelineProgress } from '@/lib/utils/project-progress';
import {
  getCachedPipelinePlan,
  invalidatePipelinePlan,
  setCachedPipelinePlan,
} from '@/lib/server/runtime-cache';

function sanitize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null)) as T;
}

type BatchOp = {
  ref: FirebaseFirestore.DocumentReference;
  data?: FirebaseFirestore.DocumentData;
  /** `update` admite rutas con punto y `FieldValue.delete()`, pero exige que el doc exista. */
  mode?: 'set' | 'update';
};

async function commitOps(ops: BatchOp[]): Promise<void> {
  const CHUNK = 400;
  for (let i = 0; i < ops.length; i += CHUNK) {
    const batch = adminDb.batch();
    for (const op of ops.slice(i, i + CHUNK)) {
      if (!op.data) batch.delete(op.ref);
      else if (op.mode === 'update') batch.update(op.ref, op.data);
      else batch.set(op.ref, op.data, { merge: true });
    }
    await batch.commit();
  }
}

function upsertOps(
  col: FirebaseFirestore.CollectionReference,
  docs: Array<{ id: string; data: FirebaseFirestore.DocumentData }>,
  removeIds?: string[]
): BatchOp[] {
  const ops: BatchOp[] = docs.map((item) => ({ ref: col.doc(item.id), data: item.data }));
  if (removeIds) {
    const keep = new Set(docs.map((doc) => doc.id));
    for (const id of removeIds) {
      if (!keep.has(id)) ops.push({ ref: col.doc(id) });
    }
  }
  return ops;
}

function explodeBacklog(epics: Epic[]): { storedEpics: StoredEpic[]; storedStories: StoredStory[] } {
  const storedEpics: StoredEpic[] = [];
  const storedStories: StoredStory[] = [];
  for (const epic of epics) {
    storedEpics.push({
      id: epic.id,
      title: epic.title,
      description: epic.description,
      source: epic.source,
      isEdited: epic.isEdited,
      createdAt: epic.createdAt,
      storyIds: epic.userStories.map((story) => story.id),
    });
    for (const story of epic.userStories) {
      storedStories.push({ ...story, epicId: epic.id });
    }
  }
  return { storedEpics, storedStories };
}

function stripTranscriptionFromHistory(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload;
  const record = payload as Record<string, unknown>;
  if (isTranscriptionResult(record.transcription) && !isSlimTranscription(record.transcription)) {
    return { ...record, transcription: toTranscriptionPointer(record.transcription) };
  }
  if (
    record.input &&
    typeof record.input === 'object' &&
    isTranscriptionResult((record.input as { transcription?: unknown }).transcription) &&
    !isSlimTranscription((record.input as { transcription: import('@/lib/types/agent-1').TranscriptionResult }).transcription)
  ) {
    const input = record.input as { transcription: import('@/lib/types/agent-1').TranscriptionResult };
    return {
      ...record,
      input: { ...input, transcription: toTranscriptionPointer(input.transcription) },
    };
  }
  return payload;
}

async function persistHistoryIfHydrated(
  uid: string,
  projectId: string,
  workspace: UserWorkspace
): Promise<void> {
  const entries: Array<{ key: PipelineHistoryKey; payload: unknown; hydrated: boolean }> = [
    { key: 'agent2', payload: workspace.agent2, hydrated: isHydratedAgent2(workspace.agent2) },
    { key: 'agent3', payload: workspace.agent3, hydrated: isHydratedAgent3(workspace.agent3) },
    { key: 'agent4', payload: workspace.agent4, hydrated: isHydratedAgent4(workspace.agent4) },
    { key: 'agent5', payload: workspace.agent5, hydrated: isHydratedAgent5(workspace.agent5) },
    {
      key: 'agent2Input',
      payload: workspace.pipeline.agent2Input,
      hydrated: workspace.pipeline.agent2Input != null,
    },
    {
      key: 'agent3Input',
      payload: workspace.pipeline.agent3Input,
      hydrated: workspace.pipeline.agent3Input != null,
    },
    {
      key: 'agent4Input',
      payload: workspace.pipeline.agent4Input,
      hydrated: workspace.pipeline.agent4Input != null,
    },
    {
      key: 'agent5Input',
      payload: workspace.pipeline.agent5Input,
      hydrated: workspace.pipeline.agent5Input != null,
    },
  ];

  await Promise.all(
    entries
      .filter((entry) => entry.hydrated && entry.payload != null)
      .map((entry) =>
        pipelineHistoryDoc(uid, projectId, entry.key).set({
          payload: sanitize(stripTranscriptionFromHistory(entry.payload)),
          archivedAt: Date.now(),
        })
      )
  );
}

export type PersistSlice = 'all' | 'backlog' | 'execution' | 'transcription' | 'history';

export async function persistWorkspace(
  uid: string,
  projectId: string,
  workspace: UserWorkspace,
  slices: PersistSlice[] = ['all'],
  previous?: UserWorkspace
): Promise<void> {
  const live = getLiveBacklog(workspace);
  const dashboard = isDashboardPhase(workspace);
  const progress = computePipelineProgress(workspace);
  const meta = workspaceMetaFromWorkspace(workspace);

  const writeAll = slices.includes('all');
  const writeBacklog = writeAll || slices.includes('backlog');
  const writeExecution = writeAll || slices.includes('execution');
  const writeTranscription = writeAll || slices.includes('transcription');
  const writeHistory = writeAll || slices.includes('history');

  const transcription = workspace.agent1.transcription;
  if (writeTranscription) {
    if (transcription == null) {
      await deleteTranscriptionArtifact(uid, projectId);
      meta.agent1.transcription = null;
    } else if (isTranscriptionPointer(transcription)) {
      meta.agent1.transcription = transcription;
    } else if (isTranscriptionResult(transcription) && !isSlimTranscription(transcription)) {
      meta.agent1.transcription = await writeTranscriptionArtifact(uid, projectId, transcription);
    } else if (isTranscriptionResult(transcription)) {
      meta.agent1.transcription = toTranscriptionPointer(transcription);
    }
  } else if (isTranscriptionPointer(transcription)) {
    meta.agent1.transcription = transcription;
  } else if (isTranscriptionResult(transcription)) {
    meta.agent1.transcription = toTranscriptionPointer(transcription);
  }

  const previousLive = previous ? getLiveBacklog(previous) : null;
  const ops: BatchOp[] = [];

  if (writeBacklog) {
    const { storedEpics, storedStories } = explodeBacklog(live.epics);
    const previousExploded = previousLive ? explodeBacklog(previousLive.epics) : null;
    ops.push(
      ...upsertOps(
        backlogEpicsCol(uid, projectId),
        storedEpics.map((epic) => ({ id: epic.id, data: sanitize(epic) })),
        previousExploded?.storedEpics.map((epic) => epic.id)
      ),
      ...upsertOps(
        backlogStoriesCol(uid, projectId),
        storedStories.map((story) => ({ id: story.id, data: sanitize(story) })),
        previousExploded?.storedStories.map((story) => story.id)
      )
    );

    const pipelineMeta: PipelineMeta = {
      estimations: live.estimations,
      estimationMode: live.estimationMode,
      priorities: live.priorities,
      framework: live.framework,
      plan: live.plan,
      sourceWishIds: live.sourceWishIds,
      currentStep: dashboard ? 6 : progress.pipelineStep,
      approvedAt: workspace.pipeline.agent6Input?.approvedAt ?? Date.now(),
    };
    ops.push({ ref: pipelineMetaDoc(uid, projectId), data: sanitize(pipelineMeta) });
  }

  if (writeExecution) {
    const executionStories = Object.entries(workspace.execution?.stories ?? {}).map(([id, data]) => ({
      id,
      data: sanitize(data),
    }));
    const previousIds = previous?.execution
      ? Object.keys(previous.execution.stories)
      : undefined;
    ops.push(...upsertOps(executionStoriesCol(uid, projectId), executionStories, previousIds));
  }

  const rootUpdate: FirebaseFirestore.DocumentData = {
    schemaVersion: SCHEMA_VERSION_CURRENT,
    workspaceMeta: sanitize(meta),
    pipelineStep: progress.pipelineStep,
    pipelineLabel: progress.pipelineLabel,
    completionPercentage: progress.completionPercentage,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (dashboard) {
    rootUpdate.lastAgent = DASHBOARD_PROGRESS.lastAgent;
  }
  if (writeAll) {
    rootUpdate.workspace = FieldValue.delete();
    rootUpdate.stack = FieldValue.delete();
  }
  ops.push({ ref: projectRef(uid, projectId), data: rootUpdate });

  const persistTasks: Array<Promise<unknown>> = [commitOps(ops)];
  if (dashboard && writeHistory) {
    persistTasks.push(persistHistoryIfHydrated(uid, projectId, workspace));
  }
  await Promise.all(persistTasks);
}

export async function persistExecutionWorkspaceMeta(
  uid: string,
  projectId: string,
  execution: Pick<import('@/lib/types/execution').ExecutionState, 'initializedAt' | 'members' | 'sprintFilter'>
): Promise<void> {
  // Mapa anidado, no claves con punto: `set({merge:true})` no interpreta rutas
  // (a diferencia de `update`), así que una clave "a.b" crearía un campo literal.
  await projectRef(uid, projectId).set(
    {
      workspaceMeta: {
        executionInitializedAt: execution.initializedAt,
        sprintFilter: execution.sprintFilter,
        members: sanitize(execution.members),
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function persistExecutionStories(
  uid: string,
  projectId: string,
  stories: Record<string, StoryExecution>
): Promise<void> {
  await commitOps(
    upsertOps(
      executionStoriesCol(uid, projectId),
      Object.entries(stories).map(([id, data]) => ({ id, data: sanitize(data) }))
    )
  );
}

/**
 * Merge parcial de docs de ejecución. Permite `FieldValue.arrayUnion` en
 * `activity` sin releer el documento (camino de 1 RTT).
 */
export async function persistExecutionStoryFields(
  uid: string,
  projectId: string,
  stories: Record<string, FirebaseFirestore.DocumentData>
): Promise<void> {
  const entries = Object.entries(stories);
  if (entries.length === 0) return;
  await commitOps(
    entries.map(([id, data]) => ({
      ref: executionStoriesCol(uid, projectId).doc(id),
      data,
    }))
  );
}

export async function readExecutionStory(
  uid: string,
  projectId: string,
  storyId: string
): Promise<StoryExecution | null> {
  const snap = await executionStoriesCol(uid, projectId).doc(storyId).get();
  return snap.exists ? (snap.data() as StoryExecution) : null;
}

export async function readPipelinePlan(
  uid: string,
  projectId: string
): Promise<import('@/lib/types/agent-5').SprintPlan | null> {
  const cached = getCachedPipelinePlan(uid, projectId);
  if (cached !== undefined) return cached;

  const snap = await pipelineMetaDoc(uid, projectId).get();
  if (!snap.exists) {
    setCachedPipelinePlan(uid, projectId, null);
    return null;
  }
  const plan = (snap.data() as PipelineMeta | undefined)?.plan ?? null;
  setCachedPipelinePlan(uid, projectId, plan);
  return plan;
}

export function stubWorkspaceAfterDashboard(workspace: UserWorkspace): UserWorkspace {
  if (!isDashboardPhase(workspace)) return workspace;
  return {
    ...workspace,
    agent2: {
      input: null,
      epics: [],
      status: workspace.agent2.status,
      error: workspace.agent2.error,
    },
    agent3: {
      input: null,
      estimations: {},
      estimationMode: workspace.agent3.estimationMode ?? null,
      status: workspace.agent3.status,
      error: workspace.agent3.error,
    },
    agent4: {
      input: null,
      priorities: {},
      framework: workspace.agent4.framework,
      status: workspace.agent4.status,
      error: workspace.agent4.error,
    },
    agent5: {
      input: null,
      plan: null,
      status: workspace.agent5.status,
      error: workspace.agent5.error,
    },
    pipeline: {
      agent2Input: null,
      agent3Input: null,
      agent4Input: null,
      agent5Input: null,
      agent6Input: workspace.pipeline.agent6Input,
    },
    execution: workspace.execution,
    stack: workspace.stack,
    agent1: workspace.agent1,
  };
}

/** Guardado rápido del Agente 1: no recarga backlog ni reescribe colecciones. */
export async function persistAgent1Only(
  uid: string,
  projectId: string,
  state: Agent1State
): Promise<void> {
  const snapPromise = projectRef(uid, projectId).get();

  let pointer = null as ReturnType<typeof toTranscriptionPointer> | null;
  const transcription = state.transcription;
  let artifactTask: Promise<unknown> = Promise.resolve();
  if (transcription == null) {
    artifactTask = deleteTranscriptionArtifact(uid, projectId);
  } else if (isTranscriptionPointer(transcription)) {
    pointer = transcription;
  } else if (isTranscriptionResult(transcription) && !isSlimTranscription(transcription)) {
    artifactTask = writeTranscriptionArtifact(uid, projectId, transcription).then((value) => {
      pointer = value;
    });
  } else if (isTranscriptionResult(transcription)) {
    pointer = toTranscriptionPointer(transcription);
  }

  const [snap] = await Promise.all([snapPromise, artifactTask]);
  const existing = (snap.data() as ProjectDocument | undefined)?.workspaceMeta;
  const nextMeta = {
    ...(existing ?? {}),
    agent1: {
      status: state.status,
      error: state.error,
      file: state.file,
      discovery: state.discovery,
      enrichedContext: state.enrichedContext,
      wishes: state.wishes,
      transcription: pointer,
    },
  };

  await projectRef(uid, projectId).set(
    {
      workspaceMeta: sanitize(nextMeta),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function readCanonicalStory(
  uid: string,
  projectId: string,
  storyId: string
): Promise<StoredStory | null> {
  const snap = await backlogStoriesCol(uid, projectId).doc(storyId).get();
  return snap.exists ? (snap.data() as StoredStory) : null;
}

export async function readCanonicalEpic(
  uid: string,
  projectId: string,
  epicId: string
): Promise<StoredEpic | null> {
  const snap = await backlogEpicsCol(uid, projectId).doc(epicId).get();
  return snap.exists ? (snap.data() as StoredEpic) : null;
}

export async function readPipelineMeta(
  uid: string,
  projectId: string
): Promise<PipelineMeta | null> {
  const snap = await pipelineMetaDoc(uid, projectId).get();
  if (!snap.exists) {
    setCachedPipelinePlan(uid, projectId, null);
    return null;
  }
  const meta = snap.data() as PipelineMeta;
  setCachedPipelinePlan(uid, projectId, meta.plan ?? null);
  return meta;
}

/**
 * Escribe sólo el plan de sprints (y opcionalmente el filtro del tablero).
 *
 * Mover una HU entre sprints o crear uno sólo cambia `pipeline/meta.plan`, así
 * que no hace falta rematerializar las colecciones de épicas e historias.
 */
export async function persistSprintPlanOnly(
  uid: string,
  projectId: string,
  plan: SprintPlan | null,
  options?: { sprintFilter?: string }
): Promise<void> {
  const rootData: FirebaseFirestore.DocumentData = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (options?.sprintFilter !== undefined) {
    rootData.workspaceMeta = { sprintFilter: options.sprintFilter };
  }
  await commitOps([
    { ref: pipelineMetaDoc(uid, projectId), data: { plan: sanitize(plan) } },
    { ref: projectRef(uid, projectId), data: rootData },
  ]);
  invalidatePipelinePlan(uid, projectId);
  setCachedPipelinePlan(uid, projectId, plan);
}

/** Lee sólo el stack del proyecto, sin componer el workspace completo. */
export async function readProjectStack(
  uid: string,
  projectId: string
): Promise<ProjectStack | null> {
  const snap = await projectRef(uid, projectId).get();
  if (!snap.exists) return null;
  const data = snap.data() as ProjectDocument;
  return data.workspaceMeta?.stack ?? data.workspace?.stack ?? null;
}

/** Escribe sólo los miembros del proyecto, sin reescribir historias de ejecución. */
export async function persistMembersOnly(
  uid: string,
  projectId: string,
  members: import('@/lib/types/execution').ProjectMember[]
): Promise<void> {
  await projectRef(uid, projectId).set(
    {
      workspaceMeta: { members: sanitize(members) },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/** Escribe sólo el filtro de sprint del tablero, sin cargar el workspace. */
export async function persistSprintFilterOnly(
  uid: string,
  projectId: string,
  sprintFilter: string
): Promise<void> {
  await projectRef(uid, projectId).set(
    {
      workspaceMeta: { sprintFilter },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/** Escribe sólo el stack: vive en un único campo del doc raíz. */
export async function persistStackOnly(
  uid: string,
  projectId: string,
  stack: ProjectStack | null
): Promise<void> {
  await projectRef(uid, projectId).set(
    {
      workspaceMeta: { stack: sanitize(stack) },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/** Lee varias historias de ejecución en un solo round-trip. */
export async function readExecutionStories(
  uid: string,
  projectId: string,
  storyIds: string[]
): Promise<Record<string, StoryExecution>> {
  const uniqueIds = [...new Set(storyIds)];
  if (uniqueIds.length === 0) return {};

  const col = executionStoriesCol(uid, projectId);
  const stories: Record<string, StoryExecution> = {};
  const CHUNK = 300;
  for (let i = 0; i < uniqueIds.length; i += CHUNK) {
    const refs = uniqueIds.slice(i, i + CHUNK).map((id) => col.doc(id));
    const snaps = await adminDb.getAll(...refs);
    for (const snap of snaps) {
      if (snap.exists) stories[snap.id] = snap.data() as StoryExecution;
    }
  }
  return stories;
}

export interface CanonicalStoryMetaPatch {
  estimation?: import('@/lib/types/agent-3').StoryEstimation;
  prioritization?: import('@/lib/types/agent-4').StoryPrioritization;
  plan?: import('@/lib/types/agent-5').SprintPlan | null;
}

export async function persistCanonicalStoryPatch(
  uid: string,
  projectId: string,
  story: StoredStory,
  metaPatch?: CanonicalStoryMetaPatch | null,
  epics?: StoredEpic[]
): Promise<void> {
  const ops: BatchOp[] = [
    { ref: backlogStoriesCol(uid, projectId).doc(story.id), data: sanitize(story) },
  ];
  if (metaPatch) {
    const data: FirebaseFirestore.DocumentData = {};
    if (metaPatch.estimation) {
      data.estimations = { [story.id]: sanitize(metaPatch.estimation) };
    }
    if (metaPatch.prioritization) {
      data.priorities = { [story.id]: sanitize(metaPatch.prioritization) };
    }
    if (metaPatch.plan !== undefined) {
      data.plan = sanitize(metaPatch.plan);
    }
    if (Object.keys(data).length > 0) {
      ops.push({ ref: pipelineMetaDoc(uid, projectId), data });
    }
  }
  if (epics) {
    for (const epic of epics) {
      ops.push({ ref: backlogEpicsCol(uid, projectId).doc(epic.id), data: sanitize(epic) });
    }
  }
  await commitOps(ops);
  if (metaPatch?.plan !== undefined) {
    invalidatePipelinePlan(uid, projectId);
    setCachedPipelinePlan(uid, projectId, metaPatch.plan);
  }
}

export async function persistCanonicalEpicPatch(
  uid: string,
  projectId: string,
  epic: StoredEpic
): Promise<void> {
  await backlogEpicsCol(uid, projectId).doc(epic.id).set(sanitize(epic), { merge: true });
}

/** Ids del backlog sin traer el contenido de los documentos. */
export async function readBacklogIds(
  uid: string,
  projectId: string
): Promise<{ storyIds: string[]; epicIds: string[] }> {
  const [storiesSnap, epicsSnap] = await Promise.all([
    backlogStoriesCol(uid, projectId).select().get(),
    backlogEpicsCol(uid, projectId).select().get(),
  ]);
  return {
    storyIds: storiesSnap.docs.map((doc) => doc.id),
    epicIds: epicsSnap.docs.map((doc) => doc.id),
  };
}

/**
 * Mutación puntual del backlog canónico: toca sólo los documentos afectados en
 * vez de rematerializar las colecciones completas.
 */
export interface CanonicalBacklogWrite {
  stories?: StoredStory[];
  deletedStoryIds?: string[];
  epics?: StoredEpic[];
  deletedEpicIds?: string[];
  /**
   * Altas/bajas en `storyIds` de una épica vía arrayUnion/arrayRemove:
   * evita leer el doc de la épica sólo para reescribir su lista.
   */
  epicStoryIdPatches?: Array<{
    epicId: string;
    addStoryIds?: string[];
    removeStoryIds?: string[];
    /** Marca la épica como editada sin reescribir todo el doc. */
    markEdited?: boolean;
  }>;
  estimations?: Record<string, StoryEstimation>;
  prioritizations?: Record<string, StoryPrioritization>;
  /** Limpia estimación y priorización de estas historias en `pipeline/meta`. */
  removedMetaStoryIds?: string[];
  plan?: SprintPlan | null;
  executions?: Record<string, StoryExecution>;
  deletedExecutionIds?: string[];
}

export async function persistCanonicalBacklogWrite(
  uid: string,
  projectId: string,
  write: CanonicalBacklogWrite
): Promise<void> {
  const storiesCol = backlogStoriesCol(uid, projectId);
  const epicsCol = backlogEpicsCol(uid, projectId);
  const execCol = executionStoriesCol(uid, projectId);
  const ops: BatchOp[] = [];

  for (const story of write.stories ?? []) {
    ops.push({ ref: storiesCol.doc(story.id), data: sanitize(story) });
  }
  for (const storyId of write.deletedStoryIds ?? []) {
    ops.push({ ref: storiesCol.doc(storyId) });
  }
  for (const epic of write.epics ?? []) {
    ops.push({ ref: epicsCol.doc(epic.id), data: sanitize(epic) });
  }
  for (const epicId of write.deletedEpicIds ?? []) {
    ops.push({ ref: epicsCol.doc(epicId) });
  }
  for (const patch of write.epicStoryIdPatches ?? []) {
    const data: FirebaseFirestore.DocumentData = {};
    if (patch.markEdited) {
      data.isEdited = true;
    }
    // arrayUnion y arrayRemove no pueden ir juntos sobre el mismo campo:
    // un patch = una sola transformación de storyIds.
    if (patch.addStoryIds?.length) {
      data.storyIds = FieldValue.arrayUnion(...patch.addStoryIds);
    } else if (patch.removeStoryIds?.length) {
      data.storyIds = FieldValue.arrayRemove(...patch.removeStoryIds);
    }
    if (Object.keys(data).length > 0) {
      ops.push({ ref: epicsCol.doc(patch.epicId), data });
    }
  }
  for (const [storyId, execution] of Object.entries(write.executions ?? {})) {
    ops.push({ ref: execCol.doc(storyId), data: sanitize(execution) });
  }
  for (const storyId of write.deletedExecutionIds ?? []) {
    ops.push({ ref: execCol.doc(storyId) });
  }

  // Los sentinelas `delete()` no pueden pasar por `sanitize` (round-trip JSON),
  // así que se insertan directamente en el mapa anidado.
  const estimations: FirebaseFirestore.DocumentData = {};
  const priorities: FirebaseFirestore.DocumentData = {};
  for (const [storyId, value] of Object.entries(write.estimations ?? {})) {
    estimations[storyId] = sanitize(value);
  }
  for (const [storyId, value] of Object.entries(write.prioritizations ?? {})) {
    priorities[storyId] = sanitize(value);
  }
  for (const storyId of write.removedMetaStoryIds ?? []) {
    estimations[storyId] = FieldValue.delete();
    priorities[storyId] = FieldValue.delete();
  }

  const metaData: FirebaseFirestore.DocumentData = {};
  if (Object.keys(estimations).length > 0) metaData.estimations = estimations;
  if (Object.keys(priorities).length > 0) metaData.priorities = priorities;
  if (write.plan !== undefined) metaData.plan = sanitize(write.plan);
  if (Object.keys(metaData).length > 0) {
    ops.push({ ref: pipelineMetaDoc(uid, projectId), data: metaData });
  }

  ops.push({
    ref: projectRef(uid, projectId),
    data: {
      ...DASHBOARD_PROGRESS,
      updatedAt: FieldValue.serverTimestamp(),
    },
  });

  await commitOps(ops);
  if (write.plan !== undefined) {
    invalidatePipelinePlan(uid, projectId);
    setCachedPipelinePlan(uid, projectId, write.plan);
  }
}
