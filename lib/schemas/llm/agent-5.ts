/**
 * @fileoverview Schemas permisivos de respuestas LLM del Agente 5 (sprints).
 */

import * as z from 'zod';

export const llmRawSprintSchema = z.looseObject({
  sprintGoal: z.string(),
  storyIds: z.array(z.unknown()),
});

export const llmSprintDependencySchema = z.looseObject({
  storyId: z.string(),
  dependsOnStoryId: z.string(),
  reason: z.string(),
});

export const llmSprintPlanResponseSchema = z.looseObject({
  sprints: z.array(z.unknown()),
  dependencies: z.array(z.unknown()).optional(),
  unassignedStoryIds: z.array(z.unknown()).optional(),
});
