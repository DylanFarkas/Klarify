/**
 * @fileoverview Parseo de JSON de LLM + schema permisivo.
 */

import * as z from 'zod';

export function parseLlmJson<T>(
  text: string,
  schema: z.ZodType<T>,
  errorMessage: string
): T {
  const raw: unknown = JSON.parse(text);
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new Error(errorMessage);
  }
  return result.data;
}

export function tryParseLlmJson<T>(
  text: string,
  schema: z.ZodType<T>
): T | null {
  try {
    return parseLlmJson(text, schema, 'invalid');
  } catch {
    return null;
  }
}
