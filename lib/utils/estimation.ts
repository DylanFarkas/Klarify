/**
 * @fileoverview Utilidades de estimación: modo, parseo de tiempo y formato.
 *
 * Modo tiempo: unidad única, día calendario (1d = 24h = 1440 min).
 * Acepta 2d, 3h, 50m, 2.5h. Rechaza combinaciones (1d 4h).
 */

import {
  DEFAULT_TIME_DURATION_BUG,
  DEFAULT_TIME_DURATION_STORY,
  FIBONACCI_SCALE,
  MINUTES_PER_CALENDAR_DAY,
  MINUTES_PER_HOUR,
} from '@/lib/constants/agent-3';
import type {
  Agent3State,
  EstimationMode,
  StoryEstimation,
} from '@/lib/types/agent-3';

const DURATION_RE = /^(\d+(?:\.\d+)?)([dhm])$/i;

export class DurationParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DurationParseError';
  }
}

export interface ParsedDuration {
  minutes: number;
  label: string;
}

export function isEstimationMode(value: unknown): value is EstimationMode {
  return value === 'story_points' || value === 'time';
}

export function isEstimationModeLocked(agent3: Pick<Agent3State, 'estimations' | 'status'>): boolean {
  if (agent3.status === 'approved') return true;
  return Object.keys(agent3.estimations).length > 0;
}

export function isStoryEstimated(
  estimation: StoryEstimation | undefined,
  mode: EstimationMode
): boolean {
  if (!estimation) return false;
  if (mode === 'time') return (estimation.durationMinutes ?? 0) > 0;
  return estimation.points > 0;
}

export function getEffortValue(
  estimation: StoryEstimation | undefined,
  mode: EstimationMode
): number {
  if (!estimation) return 0;
  if (mode === 'time') return estimation.durationMinutes ?? 0;
  return estimation.points;
}

export function parseDurationLabel(input: string): ParsedDuration {
  const trimmed = input.trim().replace(/\s+/g, '').toLowerCase();
  if (!trimmed) {
    throw new DurationParseError('Escribe una duración (2d, 3h, 50m, 2.5h).');
  }
  if (/\s/.test(input.trim()) && /[dhm]/i.test(input) && input.trim().split(/\s+/).length > 1) {
    throw new DurationParseError('Usa una sola unidad: 2d, 3h, 50m o 2.5h.');
  }

  const match = DURATION_RE.exec(trimmed);
  if (!match) {
    throw new DurationParseError('Formato inválido. Ejemplos: 2d, 3h, 50m, 2.5h.');
  }

  const rawAmount = match[1];
  const unit = match[2].toLowerCase() as 'd' | 'h' | 'm';
  const amount = Number(rawAmount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new DurationParseError('La duración debe ser mayor que 0.');
  }

  if (unit === 'm') {
    if (!Number.isInteger(amount)) {
      throw new DurationParseError('Los minutos deben ser un entero (p. ej. 50m).');
    }
  }

  const minutes =
    unit === 'd'
      ? amount * MINUTES_PER_CALENDAR_DAY
      : unit === 'h'
        ? amount * MINUTES_PER_HOUR
        : amount;

  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw new DurationParseError('La duración debe ser mayor que 0.');
  }

  const label = `${rawAmount}${unit}`;
  return { minutes, label };
}

export function tryParseDurationLabel(input: string): ParsedDuration | null {
  try {
    return parseDurationLabel(input);
  } catch {
    return null;
  }
}

/** Formato agregado: 2d 3h, 2h 30m, 50m. */
export function formatDuration(minutes: number): string {
  const rounded = Math.round(minutes);
  if (!Number.isFinite(rounded) || rounded <= 0) return '0m';

  const days = Math.floor(rounded / MINUTES_PER_CALENDAR_DAY);
  let remainder = rounded % MINUTES_PER_CALENDAR_DAY;
  const hours = Math.floor(remainder / MINUTES_PER_HOUR);
  const mins = remainder % MINUTES_PER_HOUR;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  return parts.join(' ') || '0m';
}

export function formatEstimation(
  estimation: StoryEstimation | undefined,
  mode: EstimationMode
): string {
  if (!isStoryEstimated(estimation, mode)) return '—';
  if (mode === 'time') {
    return estimation?.durationLabel || formatDuration(estimation?.durationMinutes ?? 0);
  }
  return `${estimation?.points ?? 0} SP`;
}

export function formatEffortTotal(value: number, mode: EstimationMode): string {
  if (mode === 'time') return formatDuration(value);
  return `${value} SP`;
}

export function formatEffortUnit(mode: EstimationMode): string {
  return mode === 'time' ? 'tiempo' : 'SP';
}

export function isAllowedStoryPoint(points: number): boolean {
  return (FIBONACCI_SCALE as readonly number[]).includes(points);
}

export function defaultDurationLabel(workItemType: 'story' | 'bug' | 'task' | string): string {
  return workItemType === 'bug' ? DEFAULT_TIME_DURATION_BUG : DEFAULT_TIME_DURATION_STORY;
}

export function emptyStoryEstimation(): StoryEstimation {
  return {
    points: 0,
    justification: '',
    isModified: false,
  };
}

export function storyEstimationFromDuration(
  durationLabel: string,
  justification: string,
  isModified = true
): StoryEstimation {
  const parsed = parseDurationLabel(durationLabel);
  return {
    points: 0,
    durationMinutes: parsed.minutes,
    durationLabel: parsed.label,
    justification,
    isModified,
  };
}

export function storyEstimationFromPoints(
  points: number,
  justification: string,
  isModified = true
): StoryEstimation {
  return {
    points,
    justification,
    isModified,
  };
}

export function githubHoursFromEstimation(
  estimation: StoryEstimation | undefined,
  mode: EstimationMode
): number {
  if (mode === 'time') {
    const minutes = estimation?.durationMinutes ?? 0;
    return minutes > 0 ? minutes / MINUTES_PER_HOUR : 0;
  }
  return estimation?.points ?? 0;
}

export function buildManualEstimation(options: {
  mode: EstimationMode;
  points?: number;
  durationLabel?: string;
  workItemType?: string;
  justification: string;
}): StoryEstimation {
  if (options.mode === 'time') {
    const label =
      options.durationLabel?.trim() || defaultDurationLabel(options.workItemType ?? 'story');
    return storyEstimationFromDuration(label, options.justification, true);
  }
  const fallback = options.workItemType === 'bug' ? 1 : 3;
  const points =
    typeof options.points === 'number' && Number.isFinite(options.points) && options.points > 0
      ? options.points
      : fallback;
  if (!isAllowedStoryPoint(points)) {
    throw new Error('Los Story Points deben pertenecer a la escala Fibonacci (1, 2, 3, 5, 8, 13, 21).');
  }
  return storyEstimationFromPoints(points, options.justification, true);
}

export function normalizeEstimationPatchForMode(
  mode: EstimationMode,
  patch: Partial<StoryEstimation> | undefined
): Partial<StoryEstimation> | undefined {
  if (!patch) return patch;
  if (mode === 'time') {
    if (patch.points !== undefined && patch.points > 0) {
      throw new Error('Este proyecto estima en tiempo, no en Story Points.');
    }
    if (patch.durationLabel !== undefined) {
      const parsed = parseDurationLabel(patch.durationLabel);
      return {
        ...patch,
        points: 0,
        durationMinutes: parsed.minutes,
        durationLabel: parsed.label,
      };
    }
    if (patch.durationMinutes !== undefined && patch.durationMinutes > 0) {
      return {
        ...patch,
        points: 0,
        durationLabel: patch.durationLabel ?? formatDuration(patch.durationMinutes),
      };
    }
    return { ...patch, points: 0 };
  }
  if (patch.durationMinutes !== undefined || patch.durationLabel !== undefined) {
    throw new Error('Este proyecto estima en Story Points, no en tiempo.');
  }
  if (patch.points !== undefined && patch.points > 0 && !isAllowedStoryPoint(patch.points)) {
    throw new Error('Los Story Points deben pertenecer a la escala Fibonacci (1, 2, 3, 5, 8, 13, 21).');
  }
  return patch;
}

