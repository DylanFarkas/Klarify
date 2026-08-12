/**
 * @fileoverview Mutaciones puras de HU — compartidas entre API y dashboard.
 */

import type { Epic, UserStory } from '@/lib/types/agent-2';
import type { StoryEstimation } from '@/lib/types/agent-3';
import type { StoryPrioritization } from '@/lib/types/agent-4';
import type { UserWorkspace } from '@/lib/types/workspace';
import { createDefaultStoryExecution } from '@/lib/board/board-utils';
import { getLiveBacklog, isDashboardPhase, patchLiveAgent6 } from '@/lib/utils/live-backlog';
import {
  addStoryToSprintPlan,
  adjustSprintVelocityForStoryPoints,
  assignStoryToSprintInPlan,
  removeStoryFromSprintPlan,
} from '@/lib/utils/sprint-plan-mutations';

export interface UpdateUserStoryOptions {
  epicId?: string;
  sprintId?: string | null;
}

export interface CreatedUserStoryInput {
  story: UserStory;
  epicId: string;
  sprintId?: string | null;
  estimation: StoryEstimation;
  prioritization: StoryPrioritization | null;
}

export function updateStoryInEpics(
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

export function addStoryToEpics(
  epics: Epic[] | null | undefined,
  epicId: string,
  story: UserStory
): Epic[] | null | undefined {
  if (!epics) return epics;

  return epics.map((epic) =>
    epic.id === epicId
      ? { ...epic, userStories: [...epic.userStories, story], isEdited: true }
      : epic
  );
}

export function deleteStoryFromEpics(
  epics: Epic[] | null | undefined,
  storyId: string
): Epic[] | null | undefined {
  if (!epics) return epics;

  return epics.map((epic) => ({
    ...epic,
    userStories: epic.userStories.filter((story) => story.id !== storyId),
  }));
}

export function deleteRecordEntry<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}

export function updateStoryEstimation(
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

export function updateStoryPrioritization(
  priorities: Record<string, StoryPrioritization>,
  storyId: string,
  updates?: Partial<StoryPrioritization>
): Record<string, StoryPrioritization> {
  if (!updates) return priorities;

  const current = priorities[storyId] ?? {
    category: 'must',
    justification: '',
    isModified: false,
  };

  return {
    ...priorities,
    [storyId]: {
      ...current,
      ...updates,
      isModified: true,
    },
  };
}

function moveStoryBetweenEpics(
  epics: Epic[] | null | undefined,
  storyId: string,
  toEpicId: string
): Epic[] | null | undefined {
  if (!epics) return epics;

  let story: UserStory | null = null;
  const withoutStory = epics.map((epic) => {
    const found = epic.userStories.find((item) => item.id === storyId);
    if (found) story = found;
    return {
      ...epic,
      userStories: epic.userStories.filter((item) => item.id !== storyId),
    };
  });

  if (!story) return epics;

  return withoutStory.map((epic) =>
    epic.id === toEpicId
      ? { ...epic, userStories: [...epic.userStories, story!], isEdited: true }
      : epic
  );
}

function findStoryEpicId(epics: Epic[], storyId: string): string | null {
  for (const epic of epics) {
    if (epic.userStories.some((story) => story.id === storyId)) {
      return epic.id;
    }
  }
  return null;
}

function applyStoryUpdateToEpics(
  sourceEpics: Epic[] | null | undefined,
  storyId: string,
  updates: Partial<UserStory>,
  shouldMoveEpic: boolean,
  toEpicId?: string
) {
  if (!sourceEpics) return sourceEpics;
  if (shouldMoveEpic && toEpicId) {
    const moved = moveStoryBetweenEpics(sourceEpics, storyId, toEpicId) ?? [];
    return updateStoryInEpics(moved, storyId, updates);
  }
  return updateStoryInEpics(sourceEpics, storyId, updates);
}

function withUpdatedExecutionStoryRemoved(
  workspace: UserWorkspace,
  storyIds: string[]
): UserWorkspace {
  if (!workspace.execution) return workspace;
  let stories = workspace.execution.stories;
  for (const storyId of storyIds) {
    stories = deleteRecordEntry(stories, storyId);
  }
  return {
    ...workspace,
    execution: {
      ...workspace.execution,
      stories,
    },
  };
}

/** Aplica una edición de HU. En Dashboard solo muta agent6Input. */
export function withUpdatedUserStory(
  workspace: UserWorkspace,
  storyId: string,
  updates: Partial<UserStory>,
  estimationUpdates?: Partial<StoryEstimation>,
  options?: UpdateUserStoryOptions,
  prioritizationUpdates?: Partial<StoryPrioritization>
): UserWorkspace {
  const live = getLiveBacklog(workspace);
  const currentEpicId = findStoryEpicId(live.epics, storyId);
  const shouldMoveEpic = options?.epicId !== undefined && options.epicId !== currentEpicId;
  const oldPoints = live.estimations[storyId]?.points ?? 0;
  const newPoints = estimationUpdates?.points ?? oldPoints;

  const applyStoryUpdate = (sourceEpics: Epic[] | null | undefined) =>
    applyStoryUpdateToEpics(sourceEpics, storyId, updates, shouldMoveEpic, options?.epicId);

  if (isDashboardPhase(workspace) && workspace.pipeline.agent6Input) {
    const agent6 = workspace.pipeline.agent6Input;
    let updatedPlan = agent6.plan ?? null;
    if (updatedPlan) {
      if (options?.sprintId !== undefined) {
        updatedPlan = assignStoryToSprintInPlan(updatedPlan, storyId, options.sprintId, newPoints);
      } else if (estimationUpdates?.points !== undefined && oldPoints !== newPoints) {
        updatedPlan = adjustSprintVelocityForStoryPoints(updatedPlan, storyId, oldPoints, newPoints);
      }
    }

    return patchLiveAgent6(workspace, {
      epics: applyStoryUpdate(agent6.epics) ?? [],
      estimations: updateStoryEstimation(agent6.estimations, storyId, estimationUpdates),
      priorities: updateStoryPrioritization(agent6.priorities, storyId, prioritizationUpdates),
      plan: updatedPlan ?? agent6.plan,
    });
  }

  let updatedPlan = workspace.agent5.plan;
  if (updatedPlan) {
    if (options?.sprintId !== undefined) {
      updatedPlan = assignStoryToSprintInPlan(updatedPlan, storyId, options.sprintId, newPoints);
    } else if (estimationUpdates?.points !== undefined && oldPoints !== newPoints) {
      updatedPlan = adjustSprintVelocityForStoryPoints(updatedPlan, storyId, oldPoints, newPoints);
    }
  }

  let updatedPipelinePlan = workspace.pipeline.agent6Input?.plan ?? null;
  if (updatedPipelinePlan) {
    if (options?.sprintId !== undefined) {
      updatedPipelinePlan = assignStoryToSprintInPlan(
        updatedPipelinePlan,
        storyId,
        options.sprintId,
        newPoints
      );
    } else if (estimationUpdates?.points !== undefined && oldPoints !== newPoints) {
      updatedPipelinePlan = adjustSprintVelocityForStoryPoints(
        updatedPipelinePlan,
        storyId,
        oldPoints,
        newPoints
      );
    }
  }

  const agent3Estimations = updateStoryEstimation(
    workspace.agent3.estimations,
    storyId,
    estimationUpdates
  );
  const agent4Priorities = updateStoryPrioritization(
    workspace.agent4.priorities,
    storyId,
    prioritizationUpdates
  );

  return {
    ...workspace,
    agent2: {
      ...workspace.agent2,
      epics: applyStoryUpdate(workspace.agent2.epics) ?? [],
    },
    agent3: {
      ...workspace.agent3,
      estimations: agent3Estimations,
      input: workspace.agent3.input
        ? {
            ...workspace.agent3.input,
            epics: applyStoryUpdate(workspace.agent3.input.epics) ?? [],
          }
        : null,
    },
    agent4: {
      ...workspace.agent4,
      priorities: agent4Priorities,
      input: workspace.agent4.input
        ? {
            ...workspace.agent4.input,
            epics: applyStoryUpdate(workspace.agent4.input.epics) ?? [],
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
      plan: updatedPlan,
      input: workspace.agent5.input
        ? {
            ...workspace.agent5.input,
            epics: applyStoryUpdate(workspace.agent5.input.epics) ?? [],
            estimations: updateStoryEstimation(
              workspace.agent5.input.estimations,
              storyId,
              estimationUpdates
            ),
            priorities: updateStoryPrioritization(
              workspace.agent5.input.priorities,
              storyId,
              prioritizationUpdates
            ),
          }
        : null,
    },
    pipeline: {
      agent2Input: workspace.pipeline.agent2Input,
      agent3Input: workspace.pipeline.agent3Input
        ? {
            ...workspace.pipeline.agent3Input,
            epics: applyStoryUpdate(workspace.pipeline.agent3Input.epics) ?? [],
          }
        : null,
      agent4Input: workspace.pipeline.agent4Input
        ? {
            ...workspace.pipeline.agent4Input,
            epics: applyStoryUpdate(workspace.pipeline.agent4Input.epics) ?? [],
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
            epics: applyStoryUpdate(workspace.pipeline.agent5Input.epics) ?? [],
            estimations: updateStoryEstimation(
              workspace.pipeline.agent5Input.estimations,
              storyId,
              estimationUpdates
            ),
            priorities: updateStoryPrioritization(
              workspace.pipeline.agent5Input.priorities,
              storyId,
              prioritizationUpdates
            ),
          }
        : null,
      agent6Input: workspace.pipeline.agent6Input
        ? {
            ...workspace.pipeline.agent6Input,
            epics: applyStoryUpdate(workspace.pipeline.agent6Input.epics) ?? [],
            estimations: updateStoryEstimation(
              workspace.pipeline.agent6Input.estimations,
              storyId,
              estimationUpdates
            ),
            priorities: updateStoryPrioritization(
              workspace.pipeline.agent6Input.priorities,
              storyId,
              prioritizationUpdates
            ),
            plan: updatedPipelinePlan ?? workspace.pipeline.agent6Input.plan,
          }
        : null,
    },
  };
}

export function withCreatedUserStory(
  workspace: UserWorkspace,
  input: CreatedUserStoryInput
): UserWorkspace {
  const { story, epicId, sprintId, estimation, prioritization } = input;
  const storyId = story.id;

  if (isDashboardPhase(workspace) && workspace.pipeline.agent6Input) {
    const agent6 = workspace.pipeline.agent6Input;
    const updatedPlan = agent6.plan
      ? addStoryToSprintPlan(agent6.plan, storyId, sprintId, estimation.points)
      : agent6.plan;
    let next = patchLiveAgent6(workspace, {
      epics: addStoryToEpics(agent6.epics, epicId, story) ?? [],
      estimations: updateStoryEstimation(agent6.estimations, storyId, estimation),
      priorities: prioritization
        ? updateStoryPrioritization(agent6.priorities, storyId, prioritization)
        : agent6.priorities,
      plan: updatedPlan ?? agent6.plan,
    });
    if (next.execution) {
      next = {
        ...next,
        execution: {
          ...next.execution,
          stories: {
            ...next.execution.stories,
            [storyId]: createDefaultStoryExecution(Object.keys(next.execution.stories).length),
          },
        },
      };
    }
    return next;
  }

  const updatedAgent5Plan = workspace.agent5.plan
    ? addStoryToSprintPlan(workspace.agent5.plan, storyId, sprintId, estimation.points)
    : null;
  const updatedPipelinePlan = workspace.pipeline.agent6Input?.plan
    ? addStoryToSprintPlan(
        workspace.pipeline.agent6Input.plan,
        storyId,
        sprintId,
        estimation.points
      )
    : null;

  return {
    ...workspace,
    agent2: {
      ...workspace.agent2,
      epics: addStoryToEpics(workspace.agent2.epics, epicId, story) ?? [],
    },
    agent3: {
      ...workspace.agent3,
      estimations: updateStoryEstimation(workspace.agent3.estimations, storyId, estimation),
      input: workspace.agent3.input
        ? {
            ...workspace.agent3.input,
            epics: addStoryToEpics(workspace.agent3.input.epics, epicId, story) ?? [],
          }
        : null,
    },
    agent4: {
      ...workspace.agent4,
      priorities: prioritization
        ? updateStoryPrioritization(workspace.agent4.priorities, storyId, prioritization)
        : workspace.agent4.priorities,
      input: workspace.agent4.input
        ? {
            ...workspace.agent4.input,
            epics: addStoryToEpics(workspace.agent4.input.epics, epicId, story) ?? [],
            estimations: updateStoryEstimation(
              workspace.agent4.input.estimations,
              storyId,
              estimation
            ),
          }
        : null,
    },
    agent5: {
      ...workspace.agent5,
      plan: updatedAgent5Plan,
      input: workspace.agent5.input
        ? {
            ...workspace.agent5.input,
            epics: addStoryToEpics(workspace.agent5.input.epics, epicId, story) ?? [],
            estimations: updateStoryEstimation(
              workspace.agent5.input.estimations,
              storyId,
              estimation
            ),
            priorities: prioritization
              ? updateStoryPrioritization(workspace.agent5.input.priorities, storyId, prioritization)
              : workspace.agent5.input.priorities,
          }
        : null,
    },
    pipeline: {
      agent2Input: workspace.pipeline.agent2Input,
      agent3Input: workspace.pipeline.agent3Input
        ? {
            ...workspace.pipeline.agent3Input,
            epics: addStoryToEpics(workspace.pipeline.agent3Input.epics, epicId, story) ?? [],
          }
        : null,
      agent4Input: workspace.pipeline.agent4Input
        ? {
            ...workspace.pipeline.agent4Input,
            epics: addStoryToEpics(workspace.pipeline.agent4Input.epics, epicId, story) ?? [],
            estimations: updateStoryEstimation(
              workspace.pipeline.agent4Input.estimations,
              storyId,
              estimation
            ),
          }
        : null,
      agent5Input: workspace.pipeline.agent5Input
        ? {
            ...workspace.pipeline.agent5Input,
            epics: addStoryToEpics(workspace.pipeline.agent5Input.epics, epicId, story) ?? [],
            estimations: updateStoryEstimation(
              workspace.pipeline.agent5Input.estimations,
              storyId,
              estimation
            ),
            priorities: prioritization
              ? updateStoryPrioritization(
                  workspace.pipeline.agent5Input.priorities,
                  storyId,
                  prioritization
                )
              : workspace.pipeline.agent5Input.priorities,
          }
        : null,
      agent6Input: workspace.pipeline.agent6Input
        ? {
            ...workspace.pipeline.agent6Input,
            epics: addStoryToEpics(workspace.pipeline.agent6Input.epics, epicId, story) ?? [],
            estimations: updateStoryEstimation(
              workspace.pipeline.agent6Input.estimations,
              storyId,
              estimation
            ),
            priorities: prioritization
              ? updateStoryPrioritization(
                  workspace.pipeline.agent6Input.priorities,
                  storyId,
                  prioritization
                )
              : workspace.pipeline.agent6Input.priorities,
            plan: updatedPipelinePlan ?? workspace.pipeline.agent6Input.plan,
          }
        : null,
    },
    execution: workspace.execution
      ? {
          ...workspace.execution,
          stories: {
            ...workspace.execution.stories,
            [storyId]: createDefaultStoryExecution(Object.keys(workspace.execution.stories).length),
          },
        }
      : workspace.execution,
  };
}

export function withDeletedUserStory(workspace: UserWorkspace, storyId: string): UserWorkspace {
  const live = getLiveBacklog(workspace);
  const storyPoints = live.estimations[storyId]?.points ?? 0;

  if (isDashboardPhase(workspace) && workspace.pipeline.agent6Input) {
    const agent6 = workspace.pipeline.agent6Input;
    const updatedPlan = agent6.plan
      ? removeStoryFromSprintPlan(agent6.plan, storyId, storyPoints)
      : agent6.plan;
    const next = patchLiveAgent6(workspace, {
      epics: deleteStoryFromEpics(agent6.epics, storyId) ?? [],
      estimations: deleteRecordEntry(agent6.estimations, storyId),
      priorities: deleteRecordEntry(agent6.priorities, storyId),
      plan: updatedPlan ?? agent6.plan,
    });
    return withUpdatedExecutionStoryRemoved(next, [storyId]);
  }

  const updatedAgent5Plan = workspace.agent5.plan
    ? removeStoryFromSprintPlan(workspace.agent5.plan, storyId, storyPoints)
    : null;
  const updatedPipelinePlan = workspace.pipeline.agent6Input?.plan
    ? removeStoryFromSprintPlan(workspace.pipeline.agent6Input.plan, storyId, storyPoints)
    : null;

  return {
    ...workspace,
    agent2: {
      ...workspace.agent2,
      epics: deleteStoryFromEpics(workspace.agent2.epics, storyId) ?? [],
    },
    agent3: {
      ...workspace.agent3,
      estimations: deleteRecordEntry(workspace.agent3.estimations, storyId),
      input: workspace.agent3.input
        ? {
            ...workspace.agent3.input,
            epics: deleteStoryFromEpics(workspace.agent3.input.epics, storyId) ?? [],
          }
        : null,
    },
    agent4: {
      ...workspace.agent4,
      priorities: deleteRecordEntry(workspace.agent4.priorities, storyId),
      input: workspace.agent4.input
        ? {
            ...workspace.agent4.input,
            epics: deleteStoryFromEpics(workspace.agent4.input.epics, storyId) ?? [],
            estimations: deleteRecordEntry(workspace.agent4.input.estimations, storyId),
          }
        : null,
    },
    agent5: {
      ...workspace.agent5,
      plan: updatedAgent5Plan,
      input: workspace.agent5.input
        ? {
            ...workspace.agent5.input,
            epics: deleteStoryFromEpics(workspace.agent5.input.epics, storyId) ?? [],
            estimations: deleteRecordEntry(workspace.agent5.input.estimations, storyId),
            priorities: deleteRecordEntry(workspace.agent5.input.priorities, storyId),
          }
        : null,
    },
    pipeline: {
      agent2Input: workspace.pipeline.agent2Input,
      agent3Input: workspace.pipeline.agent3Input
        ? {
            ...workspace.pipeline.agent3Input,
            epics: deleteStoryFromEpics(workspace.pipeline.agent3Input.epics, storyId) ?? [],
          }
        : null,
      agent4Input: workspace.pipeline.agent4Input
        ? {
            ...workspace.pipeline.agent4Input,
            epics: deleteStoryFromEpics(workspace.pipeline.agent4Input.epics, storyId) ?? [],
            estimations: deleteRecordEntry(workspace.pipeline.agent4Input.estimations, storyId),
          }
        : null,
      agent5Input: workspace.pipeline.agent5Input
        ? {
            ...workspace.pipeline.agent5Input,
            epics: deleteStoryFromEpics(workspace.pipeline.agent5Input.epics, storyId) ?? [],
            estimations: deleteRecordEntry(workspace.pipeline.agent5Input.estimations, storyId),
            priorities: deleteRecordEntry(workspace.pipeline.agent5Input.priorities, storyId),
          }
        : null,
      agent6Input: workspace.pipeline.agent6Input
        ? {
            ...workspace.pipeline.agent6Input,
            epics: deleteStoryFromEpics(workspace.pipeline.agent6Input.epics, storyId) ?? [],
            estimations: deleteRecordEntry(workspace.pipeline.agent6Input.estimations, storyId),
            priorities: deleteRecordEntry(workspace.pipeline.agent6Input.priorities, storyId),
            plan: updatedPipelinePlan ?? workspace.pipeline.agent6Input.plan,
          }
        : null,
    },
    execution: workspace.execution
      ? {
          ...workspace.execution,
          stories: deleteRecordEntry(workspace.execution.stories, storyId),
        }
      : workspace.execution,
  };
}

export function withCreatedEpic(workspace: UserWorkspace, epic: Epic): UserWorkspace {
  if (isDashboardPhase(workspace) && workspace.pipeline.agent6Input) {
    const agent6 = workspace.pipeline.agent6Input;
    return patchLiveAgent6(workspace, { epics: [...agent6.epics, epic] });
  }
  return transformEpicsInWorkspace(workspace, (epics) => [...epics, epic]);
}

export function withUpdatedEpic(
  workspace: UserWorkspace,
  epicId: string,
  updates: { title?: string; description?: string }
): UserWorkspace {
  const mapEpic = (epics: Epic[]) =>
    epics.map((epic) =>
      epic.id === epicId
        ? {
            ...epic,
            ...(updates.title !== undefined ? { title: updates.title.trim() } : {}),
            ...(updates.description !== undefined
              ? { description: updates.description.trim() }
              : {}),
            isEdited: true,
          }
        : epic
    );

  if (isDashboardPhase(workspace) && workspace.pipeline.agent6Input) {
    const agent6 = workspace.pipeline.agent6Input;
    return patchLiveAgent6(workspace, { epics: mapEpic(agent6.epics) });
  }
  return transformEpicsInWorkspace(workspace, mapEpic);
}

export function withDeletedEpic(workspace: UserWorkspace, epicId: string): UserWorkspace {
  const live = getLiveBacklog(workspace);
  const target = live.epics.find((epic) => epic.id === epicId);
  if (!target) return workspace;

  let next = workspace;
  for (const story of target.userStories) {
    next = withDeletedUserStory(next, story.id);
  }

  if (isDashboardPhase(next) && next.pipeline.agent6Input) {
    return patchLiveAgent6(next, {
      epics: next.pipeline.agent6Input.epics.filter((epic) => epic.id !== epicId),
    });
  }
  return transformEpicsInWorkspace(next, (epics) => epics.filter((epic) => epic.id !== epicId));
}

export function transformEpicsInWorkspace(
  workspace: UserWorkspace,
  transform: (epics: Epic[]) => Epic[]
): UserWorkspace {
  const mapInputEpics = <T extends { epics: Epic[] } | null | undefined>(input: T): T => {
    if (!input) return input;
    return { ...input, epics: transform(input.epics) };
  };

  if (isDashboardPhase(workspace) && workspace.pipeline.agent6Input) {
    return patchLiveAgent6(workspace, {
      epics: transform(workspace.pipeline.agent6Input.epics),
    });
  }

  return {
    ...workspace,
    agent2: {
      ...workspace.agent2,
      epics: transform(workspace.agent2.epics),
    },
    agent3: {
      ...workspace.agent3,
      input: mapInputEpics(workspace.agent3.input),
    },
    agent4: {
      ...workspace.agent4,
      input: mapInputEpics(workspace.agent4.input),
    },
    agent5: {
      ...workspace.agent5,
      input: mapInputEpics(workspace.agent5.input),
    },
    pipeline: {
      agent2Input: workspace.pipeline.agent2Input,
      agent3Input: mapInputEpics(workspace.pipeline.agent3Input),
      agent4Input: mapInputEpics(workspace.pipeline.agent4Input),
      agent5Input: mapInputEpics(workspace.pipeline.agent5Input),
      agent6Input: mapInputEpics(workspace.pipeline.agent6Input),
    },
  };
}
