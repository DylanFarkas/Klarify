/**
 * @fileoverview Tipos TypeScript para el Agente 5 — Planificación de Sprints.
 */

import type { Agent5Input } from '@/lib/types/workspace';
import type { Epic } from '@/lib/types/agent-2';
import type { StoryEstimation } from '@/lib/types/agent-3';
import type { StoryPrioritization, PrioritizationFramework } from '@/lib/types/agent-4';

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
  isEdited: boolean;
}

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

const MOSCOW_PRIORITY_ORDER: Record<string, number> = {
  must: 0,
  should: 1,
  could: 2,
  wont: 3,
};

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
  _framework: PrioritizationFramework
): LocalStoryForPlanning[] {
  return [...stories].sort((a, b) => {
    const pa = MOSCOW_PRIORITY_ORDER[a.priorityCategory] ?? 99;
    const pb = MOSCOW_PRIORITY_ORDER[b.priorityCategory] ?? 99;
    if (pa !== pb) return pa - pb;
    return a.points - b.points;
  });
}

export function buildSprintSchedule(
  sprints: PlannedSprint[],
  config: SprintPlanningConfig
): PlannedSprint[] {
  const cursor = new Date(config.projectStartDate + 'T00:00:00');
  return sprints.map((sprint) => {
    const startDate = cursor.toISOString().slice(0, 10);
    const end = new Date(cursor);
    end.setDate(end.getDate() + config.sprintDurationWeeks * 7 - 1);
    const endDate = end.toISOString().slice(0, 10);
    cursor.setDate(end.getDate() + 1);
    return { ...sprint, startDate, endDate };
  });
}
