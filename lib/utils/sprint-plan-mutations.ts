/**
 * @fileoverview Mutaciones puras del plan de sprints — compartidas entre Agente 5 y dashboard.
 */

import {
  DEFAULT_SPRINT_CAPACITY_SP,
  DEFAULT_SPRINT_DURATION_WEEKS,
  SPRINT_ID_PREFIX,
} from '@/lib/constants/agent-5';
import type { Epic } from '@/lib/types/agent-2';
import type {
  PlannedSprint,
  SprintDatePatch,
  SprintPlan,
} from '@/lib/types/agent-5';
import type { Agent5Input, Agent6Input, UserWorkspace } from '@/lib/types/workspace';
import { applySprintDatePatch, computeEndDateForDuration } from '@/lib/utils/sprint-dates';

/** Plan vacío: todas las HU en backlog, sin sprints (planificación manual tipo Jira). */
export function createEmptySprintPlan(epics: Epic[]): SprintPlan {
  const unassignedStoryIds = epics.flatMap((epic) => epic.userStories.map((story) => story.id));
  const projectStartDate = new Date().toISOString().slice(0, 10);

  return {
    sprints: [],
    dependencies: [],
    config: {
      sprintCapacitySp: DEFAULT_SPRINT_CAPACITY_SP,
      sprintDurationWeeks: DEFAULT_SPRINT_DURATION_WEEKS,
      projectStartDate,
    },
    unassignedStoryIds,
  };
}

/** Construye Agent6Input desde el output del Agente 4 con plan vacío. */
export function buildAgent6InputFromAgent4(input: Agent5Input): Agent6Input {
  return {
    epics: input.epics,
    estimations: input.estimations,
    priorities: input.priorities,
    framework: input.framework,
    plan: createEmptySprintPlan(input.epics),
    sourceWishIds: input.sourceWishIds,
    approvedAt: input.approvedAt,
  };
}

const SPRINT_GOAL_PREFIX_RE = /^Sprint (\d+):\s*([\s\S]*)$/;

/** Alinea el prefijo "Sprint N:" del goal con el número secuencial del sprint. */
export function syncSprintGoalNumber(sprint: PlannedSprint, number: number): PlannedSprint {
  const match = sprint.sprintGoal.match(SPRINT_GOAL_PREFIX_RE);
  if (!match) {
    return { ...sprint, number };
  }

  const goalNumber = Number(match[1]);
  const suffix = match[2];
  if (goalNumber === number) {
    return { ...sprint, number };
  }

  return {
    ...sprint,
    number,
    sprintGoal: suffix ? `Sprint ${number}: ${suffix}` : `Sprint ${number}`,
  };
}

export function hasSprintLabelMismatches(plan: SprintPlan): boolean {
  return plan.sprints.some((sprint) => {
    const match = sprint.sprintGoal.match(/^Sprint (\d+):/);
    return match !== null && Number(match[1]) !== sprint.number;
  });
}

/** Genera un id único basado en el máximo numérico existente (no en la cantidad de sprints). */
export function getNextSprintId(sprints: PlannedSprint[]): string {
  const maxNum = sprints.reduce((max, sprint) => {
    const match = sprint.id.match(new RegExp(`^${SPRINT_ID_PREFIX}-(\\d+)$`, 'i'));
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${SPRINT_ID_PREFIX}-${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * Garantiza ids únicos y números secuenciales (1..n).
 * Repara planes corruptos donde varios sprints comparten el mismo id.
 */
export function normalizeSprintPlan(plan: SprintPlan): SprintPlan {
  const usedIds = new Set<string>();
  let maxNum = 0;

  for (const sprint of plan.sprints) {
    const match = sprint.id.match(new RegExp(`^${SPRINT_ID_PREFIX}-(\\d+)$`, 'i'));
    if (match) maxNum = Math.max(maxNum, Number(match[1]));
  }

  const sprints = plan.sprints.map((sprint, idx) => {
    let id = sprint.id;
    if (usedIds.has(id)) {
      maxNum += 1;
      id = `${SPRINT_ID_PREFIX}-${String(maxNum).padStart(3, '0')}`;
    }
    usedIds.add(id);
    const match = id.match(new RegExp(`^${SPRINT_ID_PREFIX}-(\\d+)$`, 'i'));
    if (match) maxNum = Math.max(maxNum, Number(match[1]));

    return syncSprintGoalNumber(
      {
        ...sprint,
        id,
      },
      idx + 1
    );
  });

  return { ...plan, sprints };
}

export function hasDuplicateSprintIds(plan: SprintPlan): boolean {
  const ids = plan.sprints.map((s) => s.id);
  return new Set(ids).size !== ids.length;
}

export function updateSprintGoal(plan: SprintPlan, sprintId: string, goal: string): SprintPlan {
  const normalized = normalizeSprintPlan(plan);
  return normalizeSprintPlan({
    ...normalized,
    sprints: normalized.sprints.map((s) =>
      s.id === sprintId ? { ...s, sprintGoal: goal, isEdited: true } : s
    ),
  });
}

export function updateSprintDates(
  plan: SprintPlan,
  sprintId: string,
  patch: SprintDatePatch
): SprintPlan {
  const normalized = normalizeSprintPlan(plan);
  return normalizeSprintPlan({
    ...normalized,
    sprints: applySprintDatePatch(
      normalized.sprints,
      sprintId,
      patch,
      normalized.config.sprintDurationWeeks
    ),
  });
}

export function findStorySprintId(plan: SprintPlan, storyId: string): string | null {
  if (plan.unassignedStoryIds.includes(storyId)) return null;
  const sprint = plan.sprints.find((s) => s.storyIds.includes(storyId));
  return sprint?.id ?? null;
}

export function moveStoryInPlan(
  plan: SprintPlan,
  storyId: string,
  fromSprintId: string | null,
  toSprintId: string | null,
  storyPoints: number
): SprintPlan {
  const base = normalizeSprintPlan(plan);
  if (fromSprintId === toSprintId) return base;

  let unassignedStoryIds = [...base.unassignedStoryIds];
  let sprints = base.sprints.map((s) => ({ ...s, storyIds: [...s.storyIds] }));

  if (fromSprintId === null) {
    unassignedStoryIds = unassignedStoryIds.filter((id) => id !== storyId);
  } else {
    sprints = sprints.map((s) => {
      if (s.id === fromSprintId) {
        return {
          ...s,
          storyIds: s.storyIds.filter((id) => id !== storyId),
          velocitySp: s.velocitySp - storyPoints,
          isEdited: true,
        };
      }
      return s;
    });
  }

  if (toSprintId === null) {
    if (!unassignedStoryIds.includes(storyId)) {
      unassignedStoryIds.push(storyId);
    }
  } else {
    sprints = sprints.map((s) => {
      if (s.id === toSprintId) {
        return {
          ...s,
          storyIds: [...s.storyIds, storyId],
          velocitySp: s.velocitySp + storyPoints,
          isEdited: true,
        };
      }
      return s;
    });
  }

  return normalizeSprintPlan({ ...base, sprints, unassignedStoryIds });
}

export function assignStoryToSprintInPlan(
  plan: SprintPlan,
  storyId: string,
  toSprintId: string | null,
  storyPoints: number
): SprintPlan {
  const fromSprintId = findStorySprintId(plan, storyId);
  return moveStoryInPlan(plan, storyId, fromSprintId, toSprintId, storyPoints);
}

export function addSprintToPlan(plan: SprintPlan, goal?: string): SprintPlan {
  const normalized = normalizeSprintPlan(plan);
  const last = normalized.sprints.at(-1);
  const startDate = last ? last.endDate : normalized.config.projectStartDate;
  const nextNumber = normalized.sprints.length + 1;
  const trimmedGoal = goal?.trim();
  const sprintGoal = !trimmedGoal
    ? `Sprint ${nextNumber}: Nuevo sprint`
    : /^Sprint\s+\d+\s*:/i.test(trimmedGoal)
      ? trimmedGoal
      : `Sprint ${nextNumber}: ${trimmedGoal}`;
  const newSprint: PlannedSprint = {
    id: getNextSprintId(normalized.sprints),
    number: nextNumber,
    sprintGoal,
    storyIds: [],
    velocitySp: 0,
    startDate,
    endDate: computeEndDateForDuration(
      startDate,
      'weeks',
      normalized.config.sprintDurationWeeks
    ),
    durationUnit: 'weeks',
    durationWeeks: normalized.config.sprintDurationWeeks,
    isEdited: true,
  };
  return normalizeSprintPlan({ ...normalized, sprints: [...normalized.sprints, newSprint] });
}

/** Elimina un sprint vacío por índice (evita ambigüedad con ids duplicados). */
export function deleteEmptySprintAtIndex(plan: SprintPlan, sprintIndex: number): SprintPlan | null {
  const normalized = normalizeSprintPlan(plan);
  const sprint = normalized.sprints[sprintIndex];
  if (!sprint || sprint.storyIds.length > 0) return null;

  const sprints = normalized.sprints
    .filter((_, idx) => idx !== sprintIndex)
    .map((s, idx) => syncSprintGoalNumber({ ...s, number: idx + 1 }, idx + 1));

  return normalizeSprintPlan({ ...normalized, sprints });
}

/** @deprecated Usar deleteEmptySprintAtIndex — ids duplicados hacen fallar el borrado por id. */
export function deleteEmptySprintFromPlan(plan: SprintPlan, sprintId: string): SprintPlan | null {
  const normalized = normalizeSprintPlan(plan);
  const sprintIndex = normalized.sprints.findIndex((s) => s.id === sprintId);
  if (sprintIndex < 0) return null;
  return deleteEmptySprintAtIndex(normalized, sprintIndex);
}

export function adjustSprintVelocityForStoryPoints(
  plan: SprintPlan,
  storyId: string,
  oldPoints: number,
  newPoints: number
): SprintPlan {
  const delta = newPoints - oldPoints;
  if (delta === 0) return plan;

  const sprintId = findStorySprintId(plan, storyId);
  if (!sprintId) return plan;

  return normalizeSprintPlan({
    ...plan,
    sprints: plan.sprints.map((s) =>
      s.id === sprintId ? { ...s, velocitySp: s.velocitySp + delta, isEdited: true } : s
    ),
  });
}

export function addStoryToSprintPlan(
  plan: SprintPlan,
  storyId: string,
  sprintId: string | null | undefined,
  storyPoints: number
): SprintPlan {
  if (!sprintId) {
    return {
      ...plan,
      unassignedStoryIds: Array.from(new Set([...plan.unassignedStoryIds, storyId])),
    };
  }

  const sprintExists = plan.sprints.some((sprint) => sprint.id === sprintId);
  if (!sprintExists) {
    return {
      ...plan,
      unassignedStoryIds: Array.from(new Set([...plan.unassignedStoryIds, storyId])),
    };
  }

  return normalizeSprintPlan({
    ...plan,
    sprints: plan.sprints.map((sprint) =>
      sprint.id === sprintId
        ? {
            ...sprint,
            storyIds: Array.from(new Set([...sprint.storyIds, storyId])),
            velocitySp: sprint.velocitySp + storyPoints,
            isEdited: true,
          }
        : sprint
    ),
    unassignedStoryIds: plan.unassignedStoryIds.filter((id) => id !== storyId),
  });
}

export function removeStoryFromSprintPlan(
  plan: SprintPlan,
  storyId: string,
  storyPoints: number
): SprintPlan {
  const sprintId = findStorySprintId(plan, storyId);

  return normalizeSprintPlan({
    ...plan,
    sprints: plan.sprints.map((sprint) => {
      if (!sprint.storyIds.includes(storyId)) return sprint;
      return {
        ...sprint,
        storyIds: sprint.storyIds.filter((id) => id !== storyId),
        velocitySp: sprintId === sprint.id ? sprint.velocitySp - storyPoints : sprint.velocitySp,
      };
    }),
    dependencies: plan.dependencies.filter(
      (dependency) =>
        dependency.storyId !== storyId && dependency.dependsOnStoryId !== storyId
    ),
    unassignedStoryIds: plan.unassignedStoryIds.filter((id) => id !== storyId),
  });
}

/** Aplica un plan actualizado. En Dashboard solo toca agent6Input. */
export function withUpdatedSprintPlan(workspace: UserWorkspace, plan: SprintPlan): UserWorkspace {
  const existing = workspace.pipeline.agent6Input;
  if (existing) {
    return {
      ...workspace,
      pipeline: {
        ...workspace.pipeline,
        agent6Input: { ...existing, plan },
      },
    };
  }

  let agent6Input = null;
  const source =
    workspace.pipeline.agent5Input ??
    (workspace.agent4.input && Object.keys(workspace.agent4.priorities).length > 0
      ? {
          epics: workspace.agent4.input.epics,
          estimations: workspace.agent4.input.estimations,
          priorities: workspace.agent4.priorities,
          framework: workspace.agent4.framework,
          sourceWishIds: workspace.agent4.input.sourceWishIds,
          approvedAt: workspace.agent4.input.approvedAt,
        }
      : null);
  if (source) {
    agent6Input = { ...buildAgent6InputFromAgent4(source), plan };
  }

  return {
    ...workspace,
    agent5: {
      ...workspace.agent5,
      plan,
    },
    pipeline: {
      ...workspace.pipeline,
      agent6Input,
    },
  };
}