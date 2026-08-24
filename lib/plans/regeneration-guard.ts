/**
 * @fileoverview Guardia server-side para regeneraciones de IA.
 */

import { getWorkspaceData } from '@/lib/workspace-service';
import { checkAndIncrementRegeneration } from '@/lib/plans/plan-service';
import type { RegenerationAgent } from '@/lib/plans/types';
import type { UserWorkspace } from '@/lib/types/workspace';

function inferRegeneration(workspace: UserWorkspace, agent: RegenerationAgent): boolean {
  switch (agent) {
    case 'agent2':
      return (
        workspace.agent2.status === 'review' ||
        workspace.agent2.status === 'approved' ||
        workspace.agent2.epics.length > 0
      );
    case 'agent3':
      return (
        workspace.agent3.status === 'review' ||
        workspace.agent3.status === 'approved' ||
        Object.keys(workspace.agent3.estimations).length > 0
      );
    case 'agent4':
      return (
        workspace.agent4.status === 'review' ||
        workspace.agent4.status === 'approved' ||
        Object.keys(workspace.agent4.priorities).length > 0
      );
    case 'agent5':
      return (
        workspace.agent5.status === 'review' ||
        workspace.agent5.status === 'approved' ||
        Boolean(workspace.agent5.plan)
      );
    case 'stack':
      return (
        workspace.stack != null &&
        workspace.stack.status !== 'empty' &&
        (workspace.stack.status === 'saved' || Boolean(workspace.stack.rationale))
      );
    default:
      return false;
  }
}

export async function assertAiRegenerationAllowed(
  uid: string,
  agent: RegenerationAgent,
  isRegeneration?: boolean
): Promise<void> {
  const shouldCheck =
    isRegeneration === true ||
    inferRegeneration((await getWorkspaceData(uid)).workspace, agent);

  if (shouldCheck) {
    await checkAndIncrementRegeneration(uid, agent);
  }
}
