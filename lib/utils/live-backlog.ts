/**
 * @fileoverview Fuente de verdad del backlog vivo.
 *
 * Tras entrar al Dashboard (`pipeline.agent6Input`), el backlog canónico
 * vive ahí. agent1–agent5 quedan como snapshots históricos.
 * Antes del dashboard se usa el fallback del pipeline.
 */

import type { Epic, UserStory, WorkItemType } from '@/lib/types/agent-2';
import type { EstimationMode, StoryEstimation } from '@/lib/types/agent-3';
import { isEstimationMode } from '@/lib/utils/estimation';
import type { PrioritizationFramework, StoryPrioritization } from '@/lib/types/agent-4';
import type { SprintPlan } from '@/lib/types/agent-5';
import type { Agent6Input, UserWorkspace } from '@/lib/types/workspace';
import { generateEpicId, generateWorkItemId } from '@/lib/utils/agent-2-ids';
import { normalizeSprintPlan } from '@/lib/utils/sprint-plan-mutations';
import { normalizeEpics, resolveWorkItemType } from '@/lib/utils/work-item-validation';

export interface LiveBacklog {
  epics: Epic[];
  estimations: Record<string, StoryEstimation>;
  estimationMode: EstimationMode;
  priorities: Record<string, StoryPrioritization>;
  framework: PrioritizationFramework | null;
  plan: SprintPlan | null;
  sourceWishIds: string[];
  isDashboard: boolean;
}

function resolveLiveEstimationMode(
  workspace: UserWorkspace,
  preferred?: EstimationMode | null
): EstimationMode {
  if (isEstimationMode(preferred)) return preferred;
  if (isEstimationMode(workspace.pipeline.agent5Input?.estimationMode)) {
    return workspace.pipeline.agent5Input.estimationMode;
  }
  if (isEstimationMode(workspace.agent5.input?.estimationMode)) {
    return workspace.agent5.input.estimationMode;
  }
  if (isEstimationMode(workspace.pipeline.agent4Input?.estimationMode)) {
    return workspace.pipeline.agent4Input.estimationMode;
  }
  if (isEstimationMode(workspace.agent4.input?.estimationMode)) {
    return workspace.agent4.input.estimationMode;
  }
  if (isEstimationMode(workspace.agent3.estimationMode)) {
    return workspace.agent3.estimationMode;
  }
  return 'story_points';
}

export interface LiveStory extends UserStory {
  epicId: string;
}

export function isDashboardPhase(workspace: UserWorkspace): boolean {
  return Boolean(workspace.pipeline.agent6Input);
}

export function getLiveAgent6(workspace: UserWorkspace): Agent6Input | null {
  return workspace.pipeline.agent6Input ?? null;
}

export function getLiveBacklog(workspace: UserWorkspace): LiveBacklog {
  const agent6 = workspace.pipeline.agent6Input;
  if (agent6) {
    return {
      epics: normalizeEpics(agent6.epics ?? []),
      estimations: agent6.estimations ?? {},
      estimationMode: resolveLiveEstimationMode(workspace, agent6.estimationMode),
      priorities: agent6.priorities ?? {},
      framework: agent6.framework ?? null,
      plan: agent6.plan ? normalizeSprintPlan(agent6.plan) : null,
      sourceWishIds: agent6.sourceWishIds ?? [],
      isDashboard: true,
    };
  }

  return {
    epics: normalizeEpics(
      workspace.agent5.input?.epics ??
        workspace.pipeline.agent5Input?.epics ??
        workspace.agent4.input?.epics ??
        workspace.pipeline.agent4Input?.epics ??
        workspace.agent3.input?.epics ??
        workspace.pipeline.agent3Input?.epics ??
        workspace.agent2.epics ??
        []
    ),
    estimations:
      workspace.agent5.input?.estimations ??
      workspace.pipeline.agent5Input?.estimations ??
      workspace.agent3.estimations ??
      {},
    estimationMode: resolveLiveEstimationMode(workspace),
    priorities:
      workspace.agent5.input?.priorities ??
      workspace.pipeline.agent5Input?.priorities ??
      workspace.agent4.priorities ??
      {},
    framework:
      workspace.agent5.input?.framework ??
      workspace.pipeline.agent5Input?.framework ??
      workspace.agent4.framework ??
      null,
    plan: workspace.agent5.plan ? normalizeSprintPlan(workspace.agent5.plan) : null,
    sourceWishIds:
      workspace.agent5.input?.sourceWishIds ??
      workspace.pipeline.agent5Input?.sourceWishIds ??
      workspace.agent4.input?.sourceWishIds ??
      workspace.agent3.input?.sourceWishIds ??
      [],
    isDashboard: false,
  };
}

export function listLiveStories(workspace: UserWorkspace): LiveStory[] {
  return getLiveBacklog(workspace).epics.flatMap((epic) =>
    epic.userStories.map((story) => ({ ...story, epicId: epic.id }))
  );
}

export function nextLiveStoryId(workspace: UserWorkspace): string {
  return nextLiveWorkItemId(workspace, 'story');
}

export function nextLiveWorkItemId(
  workspace: UserWorkspace,
  type: WorkItemType = 'story'
): string {
  return generateWorkItemId(type, listLiveStories(workspace));
}

export function resolveLiveWorkItemType(
  story: Pick<UserStory, 'type'> | null | undefined
): WorkItemType {
  return resolveWorkItemType(story);
}

export function nextLiveEpicId(workspace: UserWorkspace): string {
  return generateEpicId(getLiveBacklog(workspace).epics);
}

export function patchLiveAgent6(
  workspace: UserWorkspace,
  patch: Partial<Agent6Input>
): UserWorkspace {
  const current = workspace.pipeline.agent6Input;
  if (!current) return workspace;
  return {
    ...workspace,
    pipeline: {
      ...workspace.pipeline,
      agent6Input: { ...current, ...patch },
    },
  };
}
