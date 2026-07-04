/**
 * @fileoverview Servicio de workspace sobre Firestore (Admin SDK).
 *
 * Encapsula todas las lecturas/escrituras de `users/{uid}.workspace` y
 * `users/{uid}.preferences`. Sigue el mismo patrón que `lib/github-integration.ts`:
 * acceso server-side vía Admin SDK, expuesto a través de API routes autenticadas.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import type { Agent1State } from '@/lib/types/agent-1';
import type { Agent2State, Agent2Input, Epic, UserStory } from '@/lib/types/agent-2';
import type { Agent3State, StoryEstimation } from '@/lib/types/agent-3';
import type { Agent4State } from '@/lib/types/agent-4';
import type { Agent5State } from '@/lib/types/agent-5';
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

/** Lee el workspace + preferencias del usuario, rellenando valores por defecto. */
export async function getWorkspaceData(uid: string): Promise<WorkspaceResponse> {
  const snapshot = await userDoc(uid).get();
  const data = snapshot.data();
  const ws = data?.workspace as Partial<UserWorkspace> | undefined;
  const prefs = data?.preferences as Partial<WorkspacePreferences> | undefined;

  return {
    workspace: {
      agent1: { ...EMPTY_AGENT1, ...(ws?.agent1 ?? {}) },
      agent2: { ...EMPTY_AGENT2, ...(ws?.agent2 ?? {}) },
      agent3: {
        ...EMPTY_AGENT3,
        ...(ws?.agent3 ?? {}),
        estimations: { ...EMPTY_AGENT3.estimations, ...(ws?.agent3?.estimations ?? {}) },
      },
      agent4: {
        ...EMPTY_AGENT4,
        ...(ws?.agent4 ?? {}),
        priorities: { ...EMPTY_AGENT4.priorities, ...(ws?.agent4?.priorities ?? {}) },
      },
      agent5: { ...EMPTY_AGENT5, ...(ws?.agent5 ?? {}) },
      pipeline: {
        agent2Input: ws?.pipeline?.agent2Input ?? null,
        agent3Input: ws?.pipeline?.agent3Input ?? null,
        agent4Input: ws?.pipeline?.agent4Input ?? null,
        agent5Input: ws?.pipeline?.agent5Input ?? null,
        agent6Input: ws?.pipeline?.agent6Input ?? null,
      },
    },
    preferences: {
      lastAgent: prefs?.lastAgent ?? '1',
    },
  };
}

/** Guarda (merge) el estado del Agente 1. */
export async function saveAgent1State(uid: string, state: Agent1State): Promise<void> {
  await userDoc(uid).set(
    {
      workspace: {
        agent1: sanitize(state),
        updatedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );
}

/** Guarda (merge) el estado del Agente 2. */
export async function saveAgent2State(uid: string, state: Agent2State): Promise<void> {
  await userDoc(uid).set(
    {
      workspace: {
        agent2: sanitize(state),
        updatedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );
}

/** Actualiza una HU en todas las copias del backlog que conserva el pipeline. */
export async function updateUserStoryAcrossWorkspace(
  uid: string,
  storyId: string,
  updates: Partial<UserStory>,
  estimationUpdates?: Partial<StoryEstimation>
): Promise<UserWorkspace> {
  const { workspace } = await getWorkspaceData(uid);
  const agent3Estimations = updateStoryEstimation(workspace.agent3.estimations, storyId, estimationUpdates);
  const updatedWorkspace: UserWorkspace = {
    ...workspace,
    agent2: {
      ...workspace.agent2,
      epics: updateStoryInEpics(workspace.agent2.epics, storyId, updates) ?? [],
    },
    agent3: {
      ...workspace.agent3,
      estimations: agent3Estimations,
      input: workspace.agent3.input
        ? {
            ...workspace.agent3.input,
            epics: updateStoryInEpics(workspace.agent3.input.epics, storyId, updates) ?? [],
          }
        : null,
    },
    agent4: {
      ...workspace.agent4,
      input: workspace.agent4.input
        ? {
            ...workspace.agent4.input,
            epics: updateStoryInEpics(workspace.agent4.input.epics, storyId, updates) ?? [],
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
      input: workspace.agent5.input
        ? {
            ...workspace.agent5.input,
            epics: updateStoryInEpics(workspace.agent5.input.epics, storyId, updates) ?? [],
            estimations: updateStoryEstimation(
              workspace.agent5.input.estimations,
              storyId,
              estimationUpdates
            ),
          }
        : null,
    },
    pipeline: {
      agent2Input: workspace.pipeline.agent2Input,
      agent3Input: workspace.pipeline.agent3Input
        ? {
            ...workspace.pipeline.agent3Input,
            epics: updateStoryInEpics(workspace.pipeline.agent3Input.epics, storyId, updates) ?? [],
          }
        : null,
      agent4Input: workspace.pipeline.agent4Input
        ? {
            ...workspace.pipeline.agent4Input,
            epics: updateStoryInEpics(workspace.pipeline.agent4Input.epics, storyId, updates) ?? [],
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
            epics: updateStoryInEpics(workspace.pipeline.agent5Input.epics, storyId, updates) ?? [],
            estimations: updateStoryEstimation(
              workspace.pipeline.agent5Input.estimations,
              storyId,
              estimationUpdates
            ),
          }
        : null,
      agent6Input: workspace.pipeline.agent6Input
        ? {
            ...workspace.pipeline.agent6Input,
            epics: updateStoryInEpics(workspace.pipeline.agent6Input.epics, storyId, updates) ?? [],
            estimations: updateStoryEstimation(
              workspace.pipeline.agent6Input.estimations,
              storyId,
              estimationUpdates
            ),
          }
        : null,
    },
  };

  await userDoc(uid).set(
    {
      workspace: {
        agent2: sanitize(updatedWorkspace.agent2),
        agent3: sanitize(updatedWorkspace.agent3),
        agent4: sanitize(updatedWorkspace.agent4),
        agent5: sanitize(updatedWorkspace.agent5),
        pipeline: sanitize(updatedWorkspace.pipeline),
        updatedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );

  return updatedWorkspace;
}

/** Guarda (merge) el estado del Agente 3. */
export async function saveAgent3State(uid: string, state: Agent3State): Promise<void> {
  await userDoc(uid).set(
    {
      workspace: {
        agent3: sanitize(state),
        updatedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );
}

/** Marca el Agente 1 como aprobado y escribe el input para el Agente 2. */
export async function approveAgent1(uid: string, agent2Input: Agent2Input): Promise<void> {
  const { workspace } = await getWorkspaceData(uid);
  await userDoc(uid).set(
    {
      workspace: {
        agent1: sanitize({
          ...workspace.agent1,
          transcription: agent2Input.transcription,
          wishes: agent2Input.wishes,
          status: 'approved',
          error: null,
        }),
        pipeline: { agent2Input: sanitize(agent2Input) },
        updatedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );
}

/** Marca el Agente 2 como aprobado y escribe el input para el Agente 3. */
export async function approveAgent2(uid: string, agent3Input: Agent3Input): Promise<void> {
  const { workspace } = await getWorkspaceData(uid);
  await userDoc(uid).set(
    {
      workspace: {
        agent2: sanitize({
          ...workspace.agent2,
          status: 'approved',
          error: null,
        }),
        pipeline: { agent3Input: sanitize(agent3Input) },
        updatedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );
}

/** Marca el Agente 3 como aprobado y escribe el input para el Agente 4. */
export async function approveAgent3(uid: string, agent4Input: Agent4Input): Promise<void> {
  const { workspace } = await getWorkspaceData(uid);
  const agent3Input: Agent3Input = {
    epics: agent4Input.epics,
    sourceWishIds: agent4Input.sourceWishIds,
    approvedAt: agent4Input.approvedAt,
  };
  await userDoc(uid).set(
    {
      workspace: {
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
        updatedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );
}

/** Guarda (merge) el estado del Agente 4. */
export async function saveAgent4State(uid: string, state: Agent4State): Promise<void> {
  await userDoc(uid).set(
    {
      workspace: {
        agent4: sanitize(state),
        updatedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );
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
  await userDoc(uid).set(
    {
      workspace: {
        agent4: sanitize({
          ...workspace.agent4,
          input: agent4Input,
          priorities: agent5Input.priorities,
          framework: agent5Input.framework,
          status: 'approved',
          error: null,
        }),
        pipeline: {
          ...workspace.pipeline,
          agent5Input: sanitize(agent5Input),
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );
}

/** Limpia el estado del Agente 1 (todos sus campos vuelven al estado inicial). */
export async function resetAgent1(uid: string): Promise<void> {
  await userDoc(uid).set(
    {
      workspace: {
        agent1: EMPTY_AGENT1,
        updatedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );
}

/** Limpia el estado del Agente 2 (todos sus campos vuelven al estado inicial). */
export async function resetAgent2(uid: string): Promise<void> {
  await userDoc(uid).set(
    {
      workspace: {
        agent2: EMPTY_AGENT2,
        updatedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );
}

/** Limpia el estado del Agente 3 (todos sus campos vuelven al estado inicial). */
export async function resetAgent3(uid: string): Promise<void> {
  await userDoc(uid).set(
    {
      workspace: {
        agent3: EMPTY_AGENT3,
        updatedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );
}

/** Limpia el estado del Agente 4 (todos sus campos vuelven al estado inicial). */
export async function resetAgent4(uid: string): Promise<void> {
  await userDoc(uid).set(
    {
      workspace: {
        agent4: EMPTY_AGENT4,
        updatedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );
}

/** Guarda (merge) el estado del Agente 5. */
export async function saveAgent5State(uid: string, state: Agent5State): Promise<void> {
  await userDoc(uid).set(
    {
      workspace: {
        agent5: sanitize(state),
        updatedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );
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
  await userDoc(uid).set(
    {
      workspace: {
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
        updatedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );
}

/** Limpia el estado del Agente 5 (todos sus campos vuelven al estado inicial). */
export async function resetAgent5(uid: string): Promise<void> {
  await userDoc(uid).set(
    {
      workspace: {
        agent5: EMPTY_AGENT5,
        updatedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );
}

/** Actualiza el último agente visitado (preferencia de navegación). */
export async function saveLastAgent(uid: string, lastAgent: string): Promise<void> {
  await userDoc(uid).set(
    {
      preferences: { lastAgent },
    },
    { merge: true }
  );
}

/** Limpia todo el workspace (agentes 1–5 + pipeline). MVP: una sesión por usuario. */
export async function resetWorkspace(uid: string): Promise<void> {
  await userDoc(uid).set(
    {
      workspace: {
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
        updatedAt: FieldValue.serverTimestamp(),
      },
      preferences: { lastAgent: '1' },
    },
    { merge: true }
  );
}
