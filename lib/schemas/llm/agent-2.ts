/**
 * @fileoverview Schemas permisivos de respuestas LLM del Agente 2 (backlog).
 */

import * as z from 'zod';

export const llmRawStorySchema = z.looseObject({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  acceptanceCriteria: z.array(z.unknown()).min(1),
  sourceWishIds: z.array(z.unknown()),
  subtasks: z.unknown().optional(),
});

export const llmRawEpicSchema = z.looseObject({
  title: z.string().trim().min(1),
  description: z.string(),
  userStories: z.array(z.unknown()),
});

export const llmBacklogResponseSchema = z.looseObject({
  epics: z.array(z.unknown()),
});
