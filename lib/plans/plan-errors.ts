/**
 * @fileoverview Errores de límite de plan para respuestas HTTP 403.
 */

import type { PlanErrorCode, PlanId } from '@/lib/plans/types';

export class PlanLimitError extends Error {
  readonly code: PlanErrorCode;
  readonly upgradeTo?: PlanId;
  readonly remaining?: number;

  constructor(
    message: string,
    code: PlanErrorCode,
    options?: { upgradeTo?: PlanId; remaining?: number }
  ) {
    super(message);
    this.name = 'PlanLimitError';
    this.code = code;
    this.upgradeTo = options?.upgradeTo;
    this.remaining = options?.remaining;
  }
}

export function isPlanLimitError(error: unknown): error is PlanLimitError {
  return error instanceof PlanLimitError;
}

export function planErrorToJson(error: PlanLimitError): {
  error: string;
  code: PlanErrorCode;
  upgradeTo?: PlanId;
  remaining?: number;
} {
  return {
    error: error.message,
    code: error.code,
    ...(error.upgradeTo ? { upgradeTo: error.upgradeTo } : {}),
    ...(error.remaining !== undefined ? { remaining: error.remaining } : {}),
  };
}
