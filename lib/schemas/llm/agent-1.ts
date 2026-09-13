/**
 * @fileoverview Schemas permisivos de respuestas LLM del Agente 1.
 */

import * as z from 'zod';

export const llmAnalyzeResponseSchema = z.looseObject({
  isSufficient: z.unknown().optional(),
  summary: z.unknown().optional(),
  gaps: z.unknown().optional(),
  questions: z.array(z.unknown()).optional(),
});

export const llmWishesArraySchema = z.array(z.unknown());
