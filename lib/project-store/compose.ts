/**
 * @fileoverview Hidrata `UserWorkspace` desde el modelo físico (v3/v4).
 */

import 'server-only';

import type { Epic } from '@/lib/types/agent-2';
import type { StoryExecution } from '@/lib/types/execution';
import type { ProjectDocument } from '@/lib/types/project';
import type {
  PipelineHistoryKey,
  PipelineMeta,
  StoredEpic,
  StoredStory,
  WorkspaceMeta,
  WorkspaceScope,
} from '@/lib/types/project-schema';
import { PIPELINE_HISTORY_KEYS } from '@/lib/types/project-schema';
import { createEmptyWorkspace, type Agent6Input, type UserWorkspace } from '@/lib/types/workspace';
import {
  isTranscriptionPointer,
  pointerToSlimResult,
  readTranscriptionArtifact,
} from '@/lib/artifacts/transcription';
import { normalizeWorkspace } from '@/lib/project-schema';
import {
  backlogEpicsCol,
  backlogLiveDoc,
  backlogStoriesCol,
  executionStoriesCol,
  pipelineHistoryDoc,
  pipelineMetaDoc,
} from '@/lib/project-store/paths';
import { normalizeSprintPlan } from '@/lib/utils/sprint-plan-mutations';
import { normalizeEpics } from '@/lib/utils/work-item-validation';

function assembleEpics(storedEpics: StoredEpic[], storedStories: StoredStory[]): Epic[] {
  const storiesByEpic = new Map<string, StoredStory[]>();
  for (const story of storedStories) {
    const list = storiesByEpic.get(story.epicId) ?? [];
    list.push(story);
    storiesByEpic.set(story.epicId, list);
  }

  return normalizeEpics(
    storedEpics.map((epic) => {
      const fromIds = (epic.storyIds ?? [])
        .map((id) => storedStories.find((story) => story.id === id))
        .filter((story): story is StoredStory => Boolean(story));
      const fallback = storiesByEpic.get(epic.id) ?? [];
      const chosen = fromIds.length > 0 ? fromIds : fallback;
      return {
        id: epic.id,
        title: epic.title,
        description: epic.description,
        source: epic.source,
        isEdited: epic.isEdited,
        createdAt: epic.createdAt,
        userStories: chosen.map(({ epicId: _epicId, ...story }) => story),
      };
    })
  );
}

async function loadCanonicalBacklog(
  uid: string,
  projectId: string,
  skipLiveFallback = false
): Promise<{ epics: Epic[]; meta: PipelineMeta | null }> {
  const [epicsSnap, storiesSnap, metaSnap] = await Promise.all([
    backlogEpicsCol(uid, projectId).get(),
    backlogStoriesCol(uid, projectId).get(),
    pipelineMetaDoc(uid, projectId).get(),
  ]);

  if (!epicsSnap.empty || !storiesSnap.empty || skipLiveFallback) {
    const epics = assembleEpics(
      epicsSnap.docs.map((doc) => doc.data() as StoredEpic),
      storiesSnap.docs.map((doc) => doc.data() as StoredStory)
    );
    const meta = metaSnap.exists ? (metaSnap.data() as PipelineMeta) : null;
    return { epics, meta };
  }

  const liveSnap = await backlogLiveDoc(uid, projectId).get();
  if (liveSnap.exists) {
    const live = liveSnap.data() as Agent6Input;
    return {
      epics: normalizeEpics(live.epics ?? []),
      meta: {
        estimations: live.estimations ?? {},
        estimationMode: live.estimationMode,
        priorities: live.priorities ?? {},
        framework: live.framework ?? null,
        plan: live.plan ? normalizeSprintPlan(live.plan) : null,
        sourceWishIds: live.sourceWishIds ?? [],
        currentStep: 6,
        approvedAt: live.approvedAt,
      },
    };
  }

  return { epics: [], meta: null };
}

async function loadExecutionStories(
  uid: string,
  projectId: string
): Promise<Record<string, StoryExecution>> {
  const snap = await executionStoriesCol(uid, projectId).get();
  const stories: Record<string, StoryExecution> = {};
  for (const doc of snap.docs) {
    stories[doc.id] = doc.data() as StoryExecution;
  }
  return stories;
}

async function loadHistorySlice(
  uid: string,
  projectId: string,
  key: PipelineHistoryKey
): Promise<unknown | null> {
  const snap = await pipelineHistoryDoc(uid, projectId, key).get();
  return snap.exists ? snap.data()?.payload ?? null : null;
}

function applyMetaToWorkspace(
  workspace: UserWorkspace,
  meta: WorkspaceMeta | undefined
): UserWorkspace {
  if (!meta) return workspace;
  return {
    ...workspace,
    agent1: {
      ...workspace.agent1,
      status: (meta.agent1.status as UserWorkspace['agent1']['status']) ?? workspace.agent1.status,
      error: meta.agent1.error,
      file: meta.agent1.file,
      discovery: meta.agent1.discovery,
      enrichedContext: meta.agent1.enrichedContext,
      wishes: meta.agent1.wishes ?? [],
    },
    agent2: {
      ...workspace.agent2,
      status: (meta.agent2.status as UserWorkspace['agent2']['status']) ?? workspace.agent2.status,
      error: meta.agent2.error,
    },
    agent3: {
      ...workspace.agent3,
      status: (meta.agent3.status as UserWorkspace['agent3']['status']) ?? workspace.agent3.status,
      error: meta.agent3.error,
      estimationMode: meta.agent3.estimationMode ?? workspace.agent3.estimationMode,
    },
    agent4: {
      ...workspace.agent4,
      status: (meta.agent4.status as UserWorkspace['agent4']['status']) ?? workspace.agent4.status,
      error: meta.agent4.error,
      framework: meta.agent4.framework ?? workspace.agent4.framework,
    },
    agent5: {
      ...workspace.agent5,
      status: (meta.agent5.status as UserWorkspace['agent5']['status']) ?? workspace.agent5.status,
      error: meta.agent5.error,
    },
    stack: meta.stack ?? workspace.stack ?? null,
  };
}

function applyLiveBacklog(
  workspace: UserWorkspace,
  epics: Epic[],
  pipelineMeta: PipelineMeta | null,
  isDashboard: boolean
): UserWorkspace {
  if (epics.length === 0 && !pipelineMeta) return workspace;

  const estimations = pipelineMeta?.estimations ?? {};
  const priorities = pipelineMeta?.priorities ?? {};
  const framework = pipelineMeta?.framework ?? workspace.agent4.framework;
  const plan = pipelineMeta?.plan ?? workspace.agent5.plan;
  const sourceWishIds = pipelineMeta?.sourceWishIds ?? workspace.agent1.wishes.map((wish) => wish.id);
  const approvedAt = pipelineMeta?.approvedAt ?? Date.now();
  const estimationMode = pipelineMeta?.estimationMode ?? workspace.agent3.estimationMode ?? 'story_points';

  const next: UserWorkspace = { ...workspace };

  if (isDashboard) {
    next.pipeline = {
      ...workspace.pipeline,
      agent6Input: {
        epics,
        estimations,
        estimationMode,
        priorities,
        framework: framework ?? 'moscow',
        plan: plan ?? {
          sprints: [],
          dependencies: [],
          config: {
            sprintCapacitySp: 20,
            sprintDurationWeeks: 2,
            projectStartDate: new Date().toISOString().slice(0, 10),
          },
          unassignedStoryIds: epics.flatMap((epic) => epic.userStories.map((story) => story.id)),
        },
        sourceWishIds,
        approvedAt,
      },
    };
    return next;
  }

  next.agent2 = { ...workspace.agent2, epics };
  if (workspace.agent3.status !== 'idle' || workspace.agent3.input) {
    next.agent3 = {
      ...workspace.agent3,
      estimations: Object.keys(estimations).length ? estimations : workspace.agent3.estimations,
      estimationMode,
      input: {
        epics,
        sourceWishIds,
        approvedAt,
      },
    };
    next.pipeline = { ...next.pipeline, agent3Input: next.agent3.input };
  }
  if (workspace.agent4.status !== 'idle' || workspace.agent4.input) {
    next.agent4 = {
      ...workspace.agent4,
      priorities: Object.keys(priorities).length ? priorities : workspace.agent4.priorities,
      framework: framework ?? workspace.agent4.framework,
      input: {
        epics,
        estimations,
        estimationMode,
        sourceWishIds,
        approvedAt,
      },
    };
    next.pipeline = { ...next.pipeline, agent4Input: next.agent4.input };
  }
  if (workspace.agent5.status !== 'idle' || workspace.agent5.input || plan) {
    next.agent5 = {
      ...workspace.agent5,
      plan,
      input: {
        epics,
        estimations,
        estimationMode,
        priorities,
        framework: framework ?? 'moscow',
        sourceWishIds,
        approvedAt,
      },
    };
    next.pipeline = { ...next.pipeline, agent5Input: next.agent5.input };
  }

  return next;
}

export async function composeWorkspaceFromPhysical(
  uid: string,
  projectId: string,
  data: ProjectDocument,
  scope: WorkspaceScope,
  pipelineAgent?: string
): Promise<UserWorkspace> {
  const base = normalizeWorkspace(data.workspace);
  const meta = data.workspaceMeta;
  let workspace = applyMetaToWorkspace(base, meta);

  const isDashboard =
    Boolean(workspace.pipeline.agent6Input) ||
    (meta?.agent4.status === 'approved' && (data.pipelineStep ?? 0) >= 6);

  const pointer = meta?.agent1.transcription ?? null;
  const needsFullTranscription = scope === 'full' || scope === 'agent1' || pipelineAgent === '2';
  const skipLiveFallback = (data.schemaVersion ?? 1) >= 4 && !data.workspace;
  const needsExecution = Boolean(meta?.executionInitializedAt) || isDashboard;

  const [backlog, executionStories, artifact] = await Promise.all([
    loadCanonicalBacklog(uid, projectId, skipLiveFallback),
    needsExecution ? loadExecutionStories(uid, projectId) : Promise.resolve({} as Record<string, StoryExecution>),
    needsFullTranscription && pointer ? readTranscriptionArtifact(uid, projectId) : Promise.resolve(null),
  ]);

  workspace = applyLiveBacklog(workspace, backlog.epics, backlog.meta, isDashboard);

  if (meta && (meta.executionInitializedAt || Object.keys(executionStories).length > 0)) {
    workspace = {
      ...workspace,
      execution: {
        initializedAt: meta.executionInitializedAt ?? Date.now(),
        members: meta.members ?? [],
        sprintFilter: meta.sprintFilter ?? 'all',
        stories:
          Object.keys(executionStories).length > 0
            ? executionStories
            : workspace.execution?.stories ?? {},
      },
    };
  }

  if (pointer && isTranscriptionPointer(pointer)) {
    workspace = {
      ...workspace,
      agent1: {
        ...workspace.agent1,
        transcription: pointerToSlimResult(pointer),
      },
    };
  }

  if (artifact) {
    workspace = {
      ...workspace,
      agent1: { ...workspace.agent1, transcription: artifact },
      pipeline: workspace.pipeline.agent2Input
        ? {
            ...workspace.pipeline,
            agent2Input: { ...workspace.pipeline.agent2Input, transcription: artifact },
          }
        : workspace.pipeline,
    };
  }

  const needsHistory = scope === 'full' || scope === 'pipeline';

  if (needsHistory && isDashboard) {
    const keys: PipelineHistoryKey[] =
      scope === 'full'
        ? [...PIPELINE_HISTORY_KEYS]
        : pipelineAgent === '2'
          ? ['agent2', 'agent2Input']
          : pipelineAgent === '3'
            ? ['agent3', 'agent3Input']
            : pipelineAgent === '4'
              ? ['agent4', 'agent4Input']
              : pipelineAgent === '5'
                ? ['agent5', 'agent5Input']
                : [];

    const snapshots = await Promise.all(keys.map((key) => loadHistorySlice(uid, projectId, key)));
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const payload = snapshots[i];
      if (!payload) continue;
      if (key === 'agent2') workspace = { ...workspace, agent2: payload as UserWorkspace['agent2'] };
      if (key === 'agent3') workspace = { ...workspace, agent3: payload as UserWorkspace['agent3'] };
      if (key === 'agent4') workspace = { ...workspace, agent4: payload as UserWorkspace['agent4'] };
      if (key === 'agent5') workspace = { ...workspace, agent5: payload as UserWorkspace['agent5'] };
      if (key === 'agent2Input') {
        workspace = {
          ...workspace,
          pipeline: { ...workspace.pipeline, agent2Input: payload as UserWorkspace['pipeline']['agent2Input'] },
        };
      }
      if (key === 'agent3Input') {
        workspace = {
          ...workspace,
          pipeline: { ...workspace.pipeline, agent3Input: payload as UserWorkspace['pipeline']['agent3Input'] },
        };
      }
      if (key === 'agent4Input') {
        workspace = {
          ...workspace,
          pipeline: { ...workspace.pipeline, agent4Input: payload as UserWorkspace['pipeline']['agent4Input'] },
        };
      }
      if (key === 'agent5Input') {
        workspace = {
          ...workspace,
          pipeline: { ...workspace.pipeline, agent5Input: payload as UserWorkspace['pipeline']['agent5Input'] },
        };
      }
    }
  }

  return normalizeWorkspace(workspace);
}
