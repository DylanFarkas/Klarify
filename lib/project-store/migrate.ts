/**
 * @fileoverview Migración lazy del documento de proyecto hacia schema v4.
 */

import 'server-only';

import type { ProjectDocument } from '@/lib/types/project';
import { SCHEMA_VERSION_CURRENT } from '@/lib/types/project-schema';
import { isTranscriptionPointer, readTranscriptionArtifact } from '@/lib/artifacts/transcription';
import { normalizeWorkspace, resolveSchemaVersion } from '@/lib/project-schema';
import { composeWorkspaceFromPhysical } from '@/lib/project-store/compose';
import { persistWorkspace, stubWorkspaceAfterDashboard } from '@/lib/project-store/persist';
import { isDashboardPhase } from '@/lib/utils/live-backlog';
import type { UserWorkspace } from '@/lib/types/workspace';

async function hydrateLegacyTranscription(
  uid: string,
  projectId: string,
  workspace: UserWorkspace
): Promise<UserWorkspace> {
  const tx = workspace.agent1.transcription;
  if (!isTranscriptionPointer(tx)) return workspace;
  const artifact = await readTranscriptionArtifact(uid, projectId);
  if (!artifact) return workspace;
  return {
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

/**
 * Si el proyecto no está en v4, hidrata el workspace completo y lo reescribe.
 * Idempotente: v4 sin campo `workspace` no vuelve a persistir.
 */
export async function ensureCanonicalWorkspace(
  uid: string,
  projectId: string,
  data: ProjectDocument
): Promise<UserWorkspace> {
  const version = resolveSchemaVersion(data);
  const hasLegacyWorkspace = data.workspace != null;

  if (version >= SCHEMA_VERSION_CURRENT && !hasLegacyWorkspace) {
    return composeWorkspaceFromPhysical(uid, projectId, data, 'full');
  }

  let workspace =
    version >= 3 || data.workspaceMeta
      ? await composeWorkspaceFromPhysical(uid, projectId, data, 'full')
      : normalizeWorkspace(data.workspace);

  workspace = await hydrateLegacyTranscription(uid, projectId, workspace);

  if (isDashboardPhase(workspace)) {
    await persistWorkspace(uid, projectId, workspace);
    return stubWorkspaceAfterDashboard(workspace);
  }

  await persistWorkspace(uid, projectId, workspace);
  return workspace;
}
