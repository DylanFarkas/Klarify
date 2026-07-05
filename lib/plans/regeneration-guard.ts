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
      return workspace.agent2.status === 'review' || workspace.agent2.epics.length > 0;
    case 'agent3':
      return (
        workspace.agent3.status === 'review' ||
        Object.keys(workspace.agent3.estimations).length > 0
      );
    case 'agent4':
      return (
        workspace.agent4.status === 'review' ||
        Object.keys(workspace.agent4.priorities).length > 0
      );
    case 'agent5':
      return workspace.agent5.status === 'review' || Boolean(workspace.agent5.plan);
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
