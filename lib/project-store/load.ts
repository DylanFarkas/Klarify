/**
 * @fileoverview Carga el workspace del proyecto (migra lazy + hidrata por scope).
 */

import 'server-only';

import type { DocumentSnapshot } from 'firebase-admin/firestore';

import type { ProjectDocument } from '@/lib/types/project';
import type { WorkspaceScope } from '@/lib/types/project-schema';
import type { UserWorkspace } from '@/lib/types/workspace';
import { composeWorkspaceFromPhysical } from '@/lib/project-store/compose';
import { ensureCanonicalWorkspace } from '@/lib/project-store/migrate';
import { projectRef } from '@/lib/project-store/paths';
import { applyWorkspaceScope } from '@/lib/project-store/scope';
import { SCHEMA_VERSION_CURRENT } from '@/lib/types/project-schema';
import { resolveSchemaVersion } from '@/lib/project-schema';
import { assertProjectSlotAccessible } from '@/lib/plans/plan-service';
import { DASHBOARD_PROGRESS, isProjectDashboardReady } from '@/lib/utils/pipeline-ready';

export async function loadWorkspace(
  uid: string,
  projectId: string,
  scope: WorkspaceScope = 'full',
  pipelineAgent?: string,
  /** Snapshot ya leído del mismo proyecto, para ahorrar un round-trip. */
  preloadedDoc?: DocumentSnapshot
): Promise<UserWorkspace> {
  const snap = preloadedDoc ?? (await projectRef(uid, projectId).get());
  if (!snap.exists) {
    throw new Error('PROJECT_NOT_FOUND');
  }
  const data = snap.data() as ProjectDocument;
  assertProjectSlotAccessible(data.status === 'locked' ? 'locked' : 'active');
  const version = resolveSchemaVersion(data);

  let workspace: UserWorkspace;
  if (version < SCHEMA_VERSION_CURRENT || data.workspace != null) {
    workspace = await ensureCanonicalWorkspace(uid, projectId, data);
    if (scope !== 'full') {
      const fresh = (await projectRef(uid, projectId).get()).data() as ProjectDocument;
      workspace = await composeWorkspaceFromPhysical(uid, projectId, fresh, scope, pipelineAgent);
    }
  } else {
    workspace = await composeWorkspaceFromPhysical(uid, projectId, data, scope, pipelineAgent);
  }

  if (isProjectDashboardReady(data) && (data.pipelineStep ?? 0) < 6) {
    await projectRef(uid, projectId).set({ ...DASHBOARD_PROGRESS }, { merge: true });
  }

  return applyWorkspaceScope(workspace, scope, pipelineAgent);
}
