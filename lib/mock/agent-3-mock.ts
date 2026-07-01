/**
 * @fileoverview Mock data para el Agente 3 — Estimación en Story Points.
 *
 * Simula la salida del Scrum Master IA con heurísticas basadas en palabras clave
 * del título de cada historia de usuario.
 */

import type { LocalEpic, Agent3SuggestionItem } from '@/lib/types/agent-3';
import { MOCK_ESTIMATION_PREFIX } from '@/lib/constants/agent-3';

/** Pensamientos simulados emitidos durante la estimación mock */
export const MOCK_ESTIMATION_THOUGHTS = [
  'Analizando la deuda técnica potencial y complejidad del backlog estructural...',
  'Evaluando integraciones de backend, lógica de persistencia y flujos de datos...',
  'Calculando Story Points en escala Fibonacci con heurísticas de Scrum Master...',
];

/**
 * Genera estimaciones mock a partir del backlog entrante usando heurísticas simples.
 */
export function mockEstimateStories(epics: LocalEpic[]): Agent3SuggestionItem[] {
  return epics.flatMap((epic) =>
    (epic.userStories || []).map((story) => {
      const titleLower = story.title.toLowerCase();
      let points = 3;
      let justification = 'Estructura estándar del sistema con bajo riesgo de integración.';

      if (titleLower.includes('iniciar sesión') || titleLower.includes('autenticación')) {
        points = 5;
        justification =
          'Manejo seguro de sesiones, tokens criptográficos JWT y validación estricta de credenciales.';
      } else if (
        titleLower.includes('crud') ||
        titleLower.includes('asistencia') ||
        titleLower.includes('base de datos')
      ) {
        points = 5;
        justification = 'Múltiples operaciones transaccionales en base de datos e integridad referencial.';
      } else if (
        titleLower.includes('exportar') ||
        titleLower.includes('pdf') ||
        titleLower.includes('reporte')
      ) {
        points = 8;
        justification =
          'Alta complejidad técnica por generación dinámica de archivos binarios y uso de buffers de memoria.';
      }

      return {
        storyId: story.id,
        suggestedPoints: points,
        justification: `${MOCK_ESTIMATION_PREFIX} ${justification}`,
      };
    })
  );
}
