/**
 * @fileoverview Utilidad para manejar errores de plan en API routes.
 */

import { NextResponse } from 'next/server';
import { isPlanLimitError, planErrorToJson } from '@/lib/plans/plan-errors';

export function handleApiError(
  error: unknown,
  fallback: string,
  options?: { unauthorizedMessage?: string }
): NextResponse {
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

  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
