/**
 * @fileoverview Persistencia del historial corto del harness por proyecto.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { projectDoc, readActiveProjectId } from '@/lib/project-service';
import {
  HARNESS_HISTORY_LIMIT,
  type HarnessChatMessage,
} from '@/lib/harness/types';
import { isProjectDashboardReady } from '@/lib/utils/pipeline-ready';

interface HarnessChatDoc {
  messages?: HarnessChatMessage[];
  /** Outcomes cortos del último turno (para anclar el siguiente). */
  toolOutcomes?: string[];
  updatedAt?: unknown;
}

interface ProjectHarnessSnapshot {
  harnessChat?: HarnessChatDoc;
  /** Legacy v1–v3: el blob monolítico desaparece al migrar a schema v4. */
  workspace?: {
    pipeline?: {
      agent6Input?: unknown;
    };
  };
  workspaceMeta?: {
    agent4?: { status?: string };
  };
  pipelineStep?: number;
  lastAgent?: string;
}

/**
 * Klark se habilita al llegar al dashboard: HITL web o backlog creado por CLI.
 *
 * Misma regla que `composeWorkspaceFromPhysical`: en schema v4 el campo legacy
 * `workspace.pipeline.agent6Input` ya no existe, así que se deriva del doc raíz.
 */
export function resolvePipelineReady(data: ProjectHarnessSnapshot | undefined): boolean {
  return isProjectDashboardReady(data);
}

export async function getHarnessHistory(
  uid: string,
  projectId?: string | null
): Promise<{
  projectId: string;
  messages: HarnessChatMessage[];
  toolOutcomes: string[];
  pipelineReady: boolean;
}> {
  const activeId = projectId ?? (await readActiveProjectId(uid));
  if (!activeId) {
    throw new Error('NO_PROJECTS');
  }

  const snap = await projectDoc(uid, activeId).get();
  const data = snap.data() as ProjectHarnessSnapshot | undefined;
  const messages = Array.isArray(data?.harnessChat?.messages)
    ? data.harnessChat.messages.slice(-HARNESS_HISTORY_LIMIT)
    : [];
  const toolOutcomes = Array.isArray(data?.harnessChat?.toolOutcomes)
    ? data.harnessChat.toolOutcomes.filter(
        (line): line is string => typeof line === 'string' && line.trim().length > 0
      )
    : [];

  return {
    projectId: activeId,
    messages,
    toolOutcomes,
    pipelineReady: resolvePipelineReady(data),
  };
}

export async function saveHarnessHistory(
  uid: string,
  projectId: string,
  messages: HarnessChatMessage[],
  toolOutcomes: string[] = []
): Promise<HarnessChatMessage[]> {
  const trimmed = messages.slice(-HARNESS_HISTORY_LIMIT);
  const outcomes = toolOutcomes
    .filter((line) => typeof line === 'string' && line.trim())
    .slice(-12);
  await projectDoc(uid, projectId).set(
    {
      harnessChat: {
        messages: trimmed,
        toolOutcomes: outcomes,
        updatedAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return trimmed;
}

/** Borra el historial del harness del proyecto activo (o el indicado). */
export async function clearHarnessHistory(
  uid: string,
  projectId?: string | null
): Promise<{ projectId: string; pipelineReady: boolean }> {
  const activeId = projectId ?? (await readActiveProjectId(uid));
  if (!activeId) {
    throw new Error('NO_PROJECTS');
  }

  const snap = await projectDoc(uid, activeId).get();
  const data = snap.data() as ProjectHarnessSnapshot | undefined;
  const pipelineReady = resolvePipelineReady(data);
  if (!pipelineReady) {
    return { projectId: activeId, pipelineReady: false };
  }

  await projectDoc(uid, activeId).set(
    {
      harnessChat: {
        messages: [],
        toolOutcomes: [],
        updatedAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { projectId: activeId, pipelineReady: true };
}

export function createHarnessMessage(
  role: HarnessChatMessage['role'],
  content: string
): HarnessChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: Date.now(),
  };
}
