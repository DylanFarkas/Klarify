/**
 * @fileoverview Mock Adapter para el Agente 3.
 * Simula el comportamiento de un LLM emitiendo delays artificiales y heurísticas.
 */

import type { IEstimationAdapter } from './IEstimationAdapter';
import type { LocalEpic, Agent3SuggestionItem } from '@/lib/types/agent-3';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';

export class MockEstimationAdapter implements IEstimationAdapter {
  async estimateBacklog(epics: LocalEpic[]): Promise<Agent3SuggestionItem[]> {
    return this.runHeuristics(epics);
  }

  async estimateBacklogStream(
    epics: LocalEpic[],
    onThought: LLMThoughtCallback
  ): Promise<Agent3SuggestionItem[]> {
    onThought("Analizando la deuda técnica potencial y complejidad del backlog estructural...");
    await new Promise(r => setTimeout(r, 1000));

    onThought("Evaluando integraciones de backend, lógica de persistencia y flujos de datos...");
    await new Promise(r => setTimeout(r, 900));

    onThought("Calculando Story Points en escala Fibonacci con heurísticas de Scrum Master...");
    await new Promise(r => setTimeout(r, 600));

    return this.runHeuristics(epics);
  }

  private runHeuristics(epics: LocalEpic[]): Agent3SuggestionItem[] {
    return epics.flatMap((epic) => 
      (epic.userStories || []).map((story) => {
        const titleLower = story.title.toLowerCase();
        let points = 3;
        let justification = 'Estructura estándar del sistema con bajo riesgo de integración.';

        if (titleLower.includes('iniciar sesión') || titleLower.includes('autenticación')) {
          points = 5;
          justification = 'Manejo seguro de sesiones, tokens criptográficos JWT y validación estricta de credenciales.';
        } else if (titleLower.includes('crud') || titleLower.includes('asistencia') || titleLower.includes('base de datos')) {
          points = 5;
          justification = 'Múltiples operaciones transaccionales en base de datos e integridad referencial.';
        } else if (titleLower.includes('exportar') || titleLower.includes('pdf') || titleLower.includes('reporte')) {
          points = 8;
          justification = 'Alta complejidad técnica por generación dinámica de archivos binarios y uso de buffers de memoria.';
        }

        return {
          storyId: story.id,
          suggestedPoints: points,
          justification: `Agente 3 (Mock Scrum Master): ${justification}`
        };
      })
    );
  }
}