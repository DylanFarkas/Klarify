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
import type { Agent2State, Agent2Input } from '@/lib/types/agent-2';
import type {
  UserWorkspace,
  WorkspacePreferences,
  WorkspaceResponse,
  Agent3Input,
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
      pipeline: {
        agent2Input: ws?.pipeline?.agent2Input ?? null,
        agent3Input: ws?.pipeline?.agent3Input ?? null,
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

/** Actualiza el último agente visitado (preferencia de navegación). */
export async function saveLastAgent(uid: string, lastAgent: string): Promise<void> {
  await userDoc(uid).set(
    {
      preferences: { lastAgent },
    },
    { merge: true }
  );
}

/** Limpia todo el workspace (agentes 1 y 2 + pipeline). MVP: una sesión por usuario. */
export async function resetWorkspace(uid: string): Promise<void> {
  await userDoc(uid).set(
    {
      workspace: {
        agent1: EMPTY_AGENT1,
        agent2: EMPTY_AGENT2,
        pipeline: { agent2Input: null, agent3Input: null },
        updatedAt: FieldValue.serverTimestamp(),
      },
      preferences: { lastAgent: '1' },
    },
    { merge: true }
  );
}
