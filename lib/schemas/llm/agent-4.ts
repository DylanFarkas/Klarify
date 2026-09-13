/**
 * @fileoverview Schemas permisivos de respuestas LLM del Agente 4 (priorización).
 */

import * as z from 'zod';

export const llmPrioritizationResponseSchema = z.looseObject({
  suggestions: z.array(z.unknown()),
});

export const llmPrioritySuggestionSchema = z.looseObject({
  storyId: z.string().trim().min(1),
  suggestedCategory: z.string(),
  justification: z.string(),
});
