/**
 * @fileoverview Mock data para el Agente 3 — Estimación.
 */

import type { EstimationMode, LocalEpic, Agent3SuggestionItem } from '@/lib/types/agent-3';
import { MOCK_ESTIMATION_PREFIX } from '@/lib/constants/agent-3';
import { parseDurationLabel } from '@/lib/utils/estimation';

/** Pensamientos simulados emitidos durante la estimación mock */
export const MOCK_ESTIMATION_THOUGHTS = [
  'Analizando la deuda técnica potencial y complejidad del backlog estructural...',
  'Evaluando integraciones de backend, lógica de persistencia y flujos de datos...',
  'Calculando el esfuerzo de cada historia con heurísticas de Scrum Master...',
];

function heuristicForStory(title: string): { points: number; duration: string; justification: string } {
  const titleLower = title.toLowerCase();
  let points = 3;
  let duration = '4h';
  let justification = 'Estructura estándar del sistema con bajo riesgo de integración.';

  if (titleLower.includes('iniciar sesión') || titleLower.includes('autenticación')) {
    points = 5;
    duration = '1d';
    justification =
      'Manejo seguro de sesiones, tokens criptográficos JWT y validación estricta de credenciales.';
  } else if (
    titleLower.includes('crud') ||
    titleLower.includes('asistencia') ||
    titleLower.includes('base de datos')
  ) {
    points = 5;
    duration = '1d';
    justification = 'Múltiples operaciones transaccionales en base de datos e integridad referencial.';
  } else if (
    titleLower.includes('exportar') ||
    titleLower.includes('pdf') ||
    titleLower.includes('reporte')
  ) {
    points = 8;
    duration = '2d';
    justification =
      'Alta complejidad técnica por generación dinámica de archivos binarios y uso de buffers de memoria.';
  }

  return { points, duration, justification };
}

export function mockEstimateStories(
  epics: LocalEpic[],
  estimationMode: EstimationMode = 'story_points'
): Agent3SuggestionItem[] {
  return epics.flatMap((epic) =>
    (epic.userStories || []).map((story) => {
      const heuristic = heuristicForStory(story.title);
      if (estimationMode === 'time') {
        const parsed = parseDurationLabel(heuristic.duration);
        return {
          storyId: story.id,
          suggestedDuration: parsed.label,
          durationMinutes: parsed.minutes,
          justification: `${MOCK_ESTIMATION_PREFIX} ${heuristic.justification}`,
        };
      }
      return {
        storyId: story.id,
        suggestedPoints: heuristic.points,
        justification: `${MOCK_ESTIMATION_PREFIX} ${heuristic.justification}`,
      };
    })
  );
}
