/**
 * @fileoverview Utilidades de progreso para la exportación a GitHub.
 */

import type {
  GithubExportPhase,
  GithubExportProgressEvent,
  GithubExportResponse,
  GithubExportStreamEvent,
} from '@/lib/types/github-export';

export interface ExportProgressState {
  phase: GithubExportPhase;
  label: string;
  current?: number;
  total?: number;
  detail?: string;
  percent: number;
}

/** Orden de fases para la checklist de la UI. */
export const EXPORT_PHASE_ORDER: GithubExportPhase[] = [
  'preparing',
  'repository',
  'project',
  'fields',
  'labels',
  'milestones',
  'epics',
  'stories',
  'saving',
];

export const EXPORT_PHASE_LABELS: Record<GithubExportPhase, string> = {
  preparing: 'Preparación',
  repository: 'Repositorio',
  project: 'GitHub Project',
  fields: 'Campos del project',
  labels: 'Etiquetas',
  milestones: 'Milestones',
  epics: 'Épicas',
  stories: 'Historias',
  saving: 'Guardado',
};

/** Peso relativo de cada fase para estimar el porcentaje global. */
const PHASE_WEIGHTS: Record<GithubExportPhase, number> = {
  preparing: 3,
  repository: 5,
  project: 8,
  fields: 6,
  labels: 4,
  milestones: 10,
  epics: 18,
  stories: 42,
  saving: 4,
};

const TOTAL_WEIGHT = Object.values(PHASE_WEIGHTS).reduce((sum, w) => sum + w, 0);

export function computeExportPercent(event: Omit<GithubExportProgressEvent, 'type'>): number {
  const phaseIndex = EXPORT_PHASE_ORDER.indexOf(event.phase);
  let completedWeight = 0;

  for (let i = 0; i < phaseIndex; i++) {
    completedWeight += PHASE_WEIGHTS[EXPORT_PHASE_ORDER[i]];
  }

  const phaseWeight = PHASE_WEIGHTS[event.phase];
  let withinPhase = 0;

  if (event.total && event.total > 0 && event.current != null) {
    withinPhase = Math.min(event.current / event.total, 1) * phaseWeight;
  } else {
    withinPhase = phaseWeight * 0.35;
  }

  return Math.min(99, Math.round(((completedWeight + withinPhase) / TOTAL_WEIGHT) * 100));
}

export function toProgressState(
  event: Omit<GithubExportProgressEvent, 'type'>
): ExportProgressState {
  return {
    phase: event.phase,
    label: event.label,
    current: event.current,
    total: event.total,
    detail: event.detail,
    percent: computeExportPercent(event),
  };
}

export function phaseStatus(
  phase: GithubExportPhase,
  current: GithubExportPhase | null
): 'pending' | 'active' | 'done' {
  if (!current) return 'pending';
  const currentIndex = EXPORT_PHASE_ORDER.indexOf(current);
  const phaseIndex = EXPORT_PHASE_ORDER.indexOf(phase);
  if (phaseIndex < currentIndex) return 'done';
  if (phaseIndex === currentIndex) return 'active';
  return 'pending';
}

/** Consume el stream NDJSON de `/api/github/export`. */
export async function consumeGithubExportStream(
  response: Response,
  onProgress: (event: GithubExportProgressEvent) => void
): Promise<GithubExportResponse> {
  if (!response.body) {
    throw new Error('La respuesta no incluye cuerpo de stream.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: GithubExportResponse | undefined;

  const processLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const event = JSON.parse(trimmed) as GithubExportStreamEvent;

    if (event.type === 'error') {
      throw Object.assign(new Error(event.error), { code: event.code });
    }

    if (event.type === 'done') {
      result = event.payload;
      return;
    }

    if (event.type === 'progress') {
      onProgress(event);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      processLine(line);
    }
  }

  if (buffer.trim()) {
    processLine(buffer);
  }

  if (result === undefined) {
    throw new Error('El stream terminó sin enviar el resultado final.');
  }

  return result;
}
