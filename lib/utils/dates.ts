/**
 * @fileoverview Formateo de fechas compartido.
 */

import { parseLocalDate } from '@/lib/utils/sprint-dates';

/** Formatea ISO YYYY-MM-DD a texto legible en español. */
export function formatDateEs(iso: string): string {
  try {
    const d = parseLocalDate(iso);
    return d.toLocaleDateString('es-ES', { dateStyle: 'medium' });
  } catch {
    return iso;
  }
}

/** Formato corto para rangos */
export function formatDateRangeEs(startIso: string, endIso: string): string {
  try {
    const start = parseLocalDate(startIso);
    const end = parseLocalDate(endIso);
    const sameYear = start.getFullYear() === end.getFullYear();
    const startFmt = start.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      ...(sameYear ? {} : { year: 'numeric' }),
    });
    const endFmt = end.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return `${startFmt} – ${endFmt}`;
  } catch {
    return `${startIso} → ${endIso}`;
  }
}