/**
 * @fileoverview Utilidades de fechas para planificación de sprints.
 */

import type { PlannedSprint, SprintDatePatch, SprintDurationUnit } from '@/lib/types/agent-5';

/** Parsea ISO YYYY-MM-DD en hora local (sin desfase UTC). */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Formatea Date a ISO YYYY-MM-DD en hora local. */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Suma días a una fecha ISO en hora local. */
export function addDays(iso: string, days: number): string {
  const date = parseLocalDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** Días naturales inclusive entre inicio y fin. */
export function computeInclusiveDays(startDate: string, endDate: string): number {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

/** Obtiene unidad y cantidad de duración de un sprint (legacy → semanas). */
export function getSprintDuration(
  sprint: PlannedSprint,
  defaultWeeks: number
): { unit: SprintDurationUnit; amount: number } {
  if (sprint.durationUnit === 'days' && sprint.durationDays != null) {
    return { unit: 'days', amount: sprint.durationDays };
  }
  return { unit: 'weeks', amount: sprint.durationWeeks ?? defaultWeeks };
}

/** Calcula fecha fin según unidad: días o semanas (inclusive). */
export function computeEndDateForDuration(
  startDate: string,
  unit: SprintDurationUnit,
  amount: number
): string {
  const inclusiveDays = unit === 'weeks' ? amount * 7 : amount;
  return addDays(startDate, inclusiveDays - 1);
}

/** @deprecated Usar computeEndDateForDuration */
export function computeEndDate(startDate: string, weeks: number): string {
  return computeEndDateForDuration(startDate, 'weeks', weeks);
}

/** Calcula duración en semanas a partir de inicio y fin (redondeo hacia arriba). */
export function computeDurationWeeks(startDate: string, endDate: string): number {
  return Math.max(1, Math.ceil(computeInclusiveDays(startDate, endDate) / 7));
}

/** Infiere duración al editar manualmente la fecha fin. */
export function inferDurationFromRange(
  startDate: string,
  endDate: string,
  preferredUnit: SprintDurationUnit
): Pick<PlannedSprint, 'durationUnit' | 'durationWeeks' | 'durationDays'> {
  const inclusiveDays = computeInclusiveDays(startDate, endDate);
  if (preferredUnit === 'days') {
    return { durationUnit: 'days', durationDays: inclusiveDays, durationWeeks: undefined };
  }
  return {
    durationUnit: 'weeks',
    durationWeeks: Math.max(1, Math.ceil(inclusiveDays / 7)),
    durationDays: undefined,
  };
}

function applyDurationToSprint(
  sprint: PlannedSprint,
  unit: SprintDurationUnit,
  amount: number
): PlannedSprint {
  return {
    ...sprint,
    durationUnit: unit,
    durationWeeks: unit === 'weeks' ? amount : undefined,
    durationDays: unit === 'days' ? amount : undefined,
    endDate: computeEndDateForDuration(sprint.startDate, unit, amount),
  };
}

/** Compara dos fechas ISO. Retorna negativo si a < b, 0 si igual, positivo si a > b. */
export function compareIsoDates(a: string, b: string): number {
  return parseLocalDate(a).getTime() - parseLocalDate(b).getTime();
}

/** Fecha mínima de inicio para el sprint en `index` (fin del sprint anterior). */
export function getMinStartDate(sprints: PlannedSprint[], index: number): string | undefined {
  if (index <= 0) return undefined;
  return sprints[index - 1]?.endDate;
}

/** Valida que no haya solapamiento: start[i] >= end[i-1]. */
export function validateNoOverlap(sprints: PlannedSprint[]): boolean {
  for (let i = 1; i < sprints.length; i++) {
    const minStart = sprints[i - 1].endDate;
    if (compareIsoDates(sprints[i].startDate, minStart) < 0) {
      return false;
    }
  }
  return true;
}

/**
 * Empuja sprints posteriores desde `fromIndex` para evitar solapamiento.
 */
export function cascadeSprintsFrom(
  sprints: PlannedSprint[],
  fromIndex: number,
  defaultDurationWeeks: number
): PlannedSprint[] {
  if (sprints.length === 0 || fromIndex >= sprints.length) return sprints;

  const result = sprints.map((s) => ({ ...s }));

  for (let i = fromIndex; i < result.length; i++) {
    const { unit, amount } = getSprintDuration(result[i], defaultDurationWeeks);

    if (i > 0) {
      const minStart = result[i - 1].endDate;
      if (compareIsoDates(result[i].startDate, minStart) < 0) {
        result[i].startDate = minStart;
      }
    }

    Object.assign(result[i], applyDurationToSprint(result[i], unit, amount));
  }

  return result;
}

/** Aplica patch a un sprint y ejecuta cascada. */
export function applySprintDatePatch(
  sprints: PlannedSprint[],
  sprintId: string,
  patch: SprintDatePatch,
  defaultDurationWeeks: number
): PlannedSprint[] {
  const index = sprints.findIndex((s) => s.id === sprintId);
  if (index < 0) return sprints;

  const result = sprints.map((s) => ({ ...s }));
  let sprint = { ...result[index] };
  let { unit, amount } = getSprintDuration(sprint, defaultDurationWeeks);

  if (patch.durationUnit !== undefined) {
    unit = patch.durationUnit;
    if (unit === 'days') {
      amount = patch.durationDays ?? (amount * 7);
    } else {
      amount = patch.durationWeeks ?? Math.max(1, Math.ceil(amount / 7));
    }
  }

  if (patch.durationWeeks !== undefined) {
    unit = 'weeks';
    amount = patch.durationWeeks;
  }

  if (patch.durationDays !== undefined) {
    unit = 'days';
    amount = patch.durationDays;
  }

  if (patch.startDate !== undefined) {
    sprint.startDate = patch.startDate;
  }

  sprint = applyDurationToSprint(sprint, unit, amount);

  if (patch.endDate !== undefined) {
    sprint.endDate = patch.endDate;
    if (compareIsoDates(sprint.endDate, sprint.startDate) < 0) {
      sprint.endDate = sprint.startDate;
    }
    const inferred = inferDurationFromRange(sprint.startDate, sprint.endDate, unit);
    sprint = { ...sprint, ...inferred };
  }

  sprint.isEdited = true;
  result[index] = sprint;

  return cascadeSprintsFrom(result, index, defaultDurationWeeks);
}

/** Texto legible de la duración de un sprint. */
export function formatSprintDuration(
  sprint: PlannedSprint,
  defaultWeeks: number
): string {
  const { unit, amount } = getSprintDuration(sprint, defaultWeeks);
  if (unit === 'days') {
    return `${amount} día${amount !== 1 ? 's' : ''}`;
  }
  return `${amount} sem`;
}
