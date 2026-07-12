/**
 * @fileoverview Tipos TypeScript para el Agente 5 — Planificación de Sprints.
 */

import type { Agent5Input } from '@/lib/types/workspace';
import type { Epic } from '@/lib/types/agent-2';
import type { StoryEstimation } from '@/lib/types/agent-3';
import type { StoryPrioritization, PrioritizationFramework } from '@/lib/types/agent-4';
import { addDays, computeEndDateForDuration, getSprintDuration } from '@/lib/utils/sprint-dates';
import { getPriorityRank } from '@/lib/utils/priority-rank';

export interface SprintPlanningConfig {
  sprintCapacitySp: number;
  sprintDurationWeeks: number;
  projectStartDate: string;
}

export interface StoryDependency {
  storyId: string;
  dependsOnStoryId: string;
  reason: string;
}

export interface SprintStoryAssignment {
  storyId: string;
  order: number;
}

export interface PlannedSprint {
  id: string;
  number: number;
  sprintGoal: string;
  storyIds: string[];
  velocitySp: number;
  startDate: string;
  endDate: string;
  /** Unidad de duración; por defecto semanas. */
  durationUnit?: SprintDurationUnit;
  /** Duración en semanas cuando durationUnit es 'weeks'. */
  durationWeeks?: number;
  /** Duración en días naturales (inclusive) cuando durationUnit es 'days'. */
  durationDays?: number;
  isEdited: boolean;
}

export type SprintDurationUnit = 'weeks' | 'days';

export type SprintDatePatch = Partial<
  Pick<PlannedSprint, 'startDate' | 'endDate' | 'durationWeeks' | 'durationDays' | 'durationUnit'>
>;

export interface SprintPlan {
  sprints: PlannedSprint[];
  dependencies: StoryDependency[];
  config: SprintPlanningConfig;
  unassignedStoryIds: string[];
}

export type Agent5Status = 'idle' | 'planning' | 'review' | 'approved';

export interface Agent5State {
  input: Agent5Input | null;
  plan: SprintPlan | null;
  status: Agent5Status;
  error: string | null;
}

export interface SprintPlanSuggestion {
  sprintNumber: number;
  sprintGoal: string;
  storyIds: string[];
  dependencies?: StoryDependency[];
}

export interface Agent5PlanResponse {
  plan: SprintPlan;
  suggestions?: SprintPlanSuggestion[];
}

export interface Agent5PlanRequest {
  epics: Epic[];
  estimations: Record<string, StoryEstimation>;
  priorities: Record<string, StoryPrioritization>;
  framework: PrioritizationFramework;
  config: SprintPlanningConfig;
}

export interface LocalStoryForPlanning {
  id: string;
  title: string;
  description: string;
  points: number;
  priorityCategory: string;
  priorityJustification?: string;
  epicTitle: string;
}

export function toLocalStoriesForPlanning(input: Agent5Input): LocalStoryForPlanning[] {
  return input.epics.flatMap((epic) =>
    epic.userStories.map((story) => ({
      id: story.id,
      title: story.title,
      description: story.description,
      points: input.estimations[story.id]?.points ?? 0,
      priorityCategory: input.priorities[story.id]?.category ?? 'could',
      priorityJustification: input.priorities[story.id]?.justification,
      epicTitle: epic.title,
    }))
  );
}

export function sortStoriesByPriority(
  stories: LocalStoryForPlanning[],
  framework: PrioritizationFramework
): LocalStoryForPlanning[] {
  return [...stories].sort((a, b) => {
    const pa = getPriorityRank(framework, a.priorityCategory);
    const pb = getPriorityRank(framework, b.priorityCategory);
    if (pa !== pb) return pa - pb;
    return a.points - b.points;
  });
}

export function buildSprintSchedule(
  sprints: PlannedSprint[],
  config: SprintPlanningConfig
): PlannedSprint[] {
  let cursor = config.projectStartDate;
  return sprints.map((sprint) => {
    const { unit, amount } = getSprintDuration(sprint, config.sprintDurationWeeks);
    const startDate = cursor;
    const endDate = computeEndDateForDuration(startDate, unit, amount);
    cursor = addDays(endDate, 0);
    return {
      ...sprint,
      startDate,
      endDate,
      durationUnit: unit,
      ...(unit === 'days'
        ? { durationDays: amount, durationWeeks: undefined }
        : { durationWeeks: amount, durationDays: undefined }),
    };
  });
}