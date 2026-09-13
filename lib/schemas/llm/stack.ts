/**
 * @fileoverview Schema permisivo de respuesta LLM de stack.
 */

import * as z from 'zod';

export const llmStackRecommendSchema = z.looseObject({
  productKind: z.string().min(1),
  architecturePattern: z.string().min(1),
  layers: z.record(z.string(), z.unknown()),
  rationale: z.string().optional(),
  researchQueries: z.array(z.string()).optional(),
});
