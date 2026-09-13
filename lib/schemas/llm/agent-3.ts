/**
 * @fileoverview Schemas permisivos de respuestas LLM del Agente 3 (estimación).
 */

import * as z from 'zod';

export const llmEstimationResponseSchema = z.looseObject({
  suggestions: z.array(z.unknown()),
});

export const llmPointsSuggestionSchema = z.looseObject({
  storyId: z.string().trim().min(1),
  suggestedPoints: z.number(),
  justification: z.string(),
});

export const llmTimeSuggestionSchema = z.looseObject({
  storyId: z.string().trim().min(1),
  suggestedDuration: z.string(),
  justification: z.string(),
});
