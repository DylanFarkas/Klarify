/**
 * @fileoverview Utilidad para manejar errores de plan en API routes.
 */

import { NextResponse } from 'next/server';
import { isPlanLimitError, planErrorToJson } from '@/lib/plans/plan-errors';
import { SprintLifecycleError } from '@/lib/utils/sprint-plan-mutations';
import {
  firstZodErrorMessage,
  isApiBodyError,
  isZodError,
} from '@/lib/schemas/parse';

export function handleApiError(
  error: unknown,
  fallback: string,
  options?: { unauthorizedMessage?: string }
): NextResponse {
  if (isZodError(error)) {
    return NextResponse.json({ error: firstZodErrorMessage(error) }, { status: 400 });
  }

  if (isApiBodyError(error)) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';

  if (message === 'UNAUTHORIZED') {
    return NextResponse.json(
      { error: options?.unauthorizedMessage ?? 'No autorizado' },
      { status: 401 }
    );
  }

  if (isPlanLimitError(error)) {
    return NextResponse.json(planErrorToJson(error), { status: 403 });
  }

  if (message === 'NO_PROJECTS') {
    return NextResponse.json(
      { error: 'No tienes proyectos. Crea uno desde Tus proyectos.' },
      { status: 404 }
    );
  }

  if (error instanceof SprintLifecycleError) {
    return NextResponse.json({ error: message }, { status: 400 });
  }

  console.error(fallback, error);
  return NextResponse.json({ error: message || fallback }, { status: 500 });
}
