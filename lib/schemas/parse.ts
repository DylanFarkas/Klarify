/**
 * @fileoverview Helpers de parseo en boundaries (API, tools, adapters).
 *
 * Convención: Zod valida datos no confiables en el borde. Los tipos de
 * dominio siguen en `lib/types/` y no se reescriben como `z.infer`.
 */

import * as z from 'zod';

export class ApiBodyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiBodyError';
  }
}

export function firstZodErrorMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'Petición inválida';
  return issue.message || 'Petición inválida';
}

export function parseApiBody<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ApiBodyError(firstZodErrorMessage(result.error));
  }
  return result.data;
}

export function isZodError(error: unknown): error is z.ZodError {
  return error instanceof z.ZodError;
}

export function isApiBodyError(error: unknown): error is ApiBodyError {
  return error instanceof ApiBodyError;
}
