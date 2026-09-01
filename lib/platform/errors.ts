/**
 * @fileoverview Errores estables de la API de plataforma (CLI / agentes).
 */

import { NextResponse } from 'next/server';
import { PlanLimitError, isPlanLimitError, planErrorToJson } from '@/lib/plans/plan-errors';
import { SprintLifecycleError } from '@/lib/utils/sprint-plan-mutations';
import { ApiBodyError, firstZodErrorMessage, isApiBodyError, isZodError } from '@/lib/schemas/parse';

export class PlatformError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'PlatformError';
    this.code = code;
    this.status = status;
  }
}

export function platformNotFound(message: string, code: string): PlatformError {
  return new PlatformError(message, code, 404);
}

export function platformInvalid(message: string, code = 'INVALID_ARGS'): PlatformError {
  return new PlatformError(message, code, 400);
}

export function platformUnauthorized(message = 'No autorizado'): PlatformError {
  return new PlatformError(message, 'UNAUTHORIZED', 401);
}

function inferCodeFromMessage(message: string): { code: string; status: number } | null {
  if (message === 'UNAUTHORIZED') return { code: 'UNAUTHORIZED', status: 401 };
  if (message === 'PROJECT_NOT_FOUND' || message === 'NO_PROJECTS') {
    return { code: message, status: 404 };
  }
  if (message === 'PIPELINE_INCOMPLETE') return { code: 'PIPELINE_INCOMPLETE', status: 409 };
  if (message.startsWith('Historia no encontrada') || message.includes('No encontré la')) {
    return { code: 'STORY_NOT_FOUND', status: 404 };
  }
  if (message.startsWith('Épica no encontrada') || message.includes('No encontré la EPIC')) {
    return { code: 'EPIC_NOT_FOUND', status: 404 };
  }
  if (message.startsWith('Sprint no encontrado') || message.includes('No encontré el')) {
    return { code: 'SPRINT_NOT_FOUND', status: 404 };
  }
  if (message.startsWith('Subtarea no encontrada')) {
    return { code: 'SUBTASK_NOT_FOUND', status: 404 };
  }
  if (message.includes('No hay plan de sprints')) {
    return { code: 'SPRINT_PLAN_MISSING', status: 409 };
  }
  if (message.startsWith('Se requiere confirmación')) {
    return { code: 'NEEDS_CONFIRMATION', status: 409 };
  }
  return null;
}

export function platformErrorResponse(error: unknown, fallback: string): NextResponse {
  if (error instanceof PlatformError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status }
    );
  }

  if (isZodError(error)) {
    return NextResponse.json(
      { error: firstZodErrorMessage(error), code: 'INVALID_ARGS' },
      { status: 400 }
    );
  }

  if (isApiBodyError(error) || error instanceof ApiBodyError) {
    return NextResponse.json({ error: error.message, code: 'INVALID_ARGS' }, { status: 400 });
  }

  if (isPlanLimitError(error) || error instanceof PlanLimitError) {
    return NextResponse.json({ ...planErrorToJson(error), code: error.code }, { status: 403 });
  }

  if (error instanceof SprintLifecycleError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
  }

  const message = error instanceof Error ? error.message : fallback;
  const inferred = inferCodeFromMessage(message);
  if (inferred) {
    return NextResponse.json({ error: message, code: inferred.code }, { status: inferred.status });
  }

  console.error(fallback, error);
  return NextResponse.json({ error: message || fallback, code: 'INTERNAL_ERROR' }, { status: 500 });
}
