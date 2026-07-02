/**
 * @fileoverview Interfaz abstracta para el Adaptador del Agente 4.
 * Define las firmas obligatorias para la priorización del backlog.
 */

import type {
  LocalEpicWithEstimation,
  Agent4SuggestionItem,
  PrioritizationFramework,
} from '@/lib/types/agent-4';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';

export interface IPrioritizationAdapter {
  /**
   * Genera priorizaciones de manera síncrona (Promesa estándar).
   */
  prioritizeBacklog(
    epics: LocalEpicWithEstimation[],
    framework: PrioritizationFramework
  ): Promise<Agent4SuggestionItem[]>;

  /**
   * Genera priorizaciones transmitiendo pensamientos intermedios en tiempo real.
   */
  prioritizeBacklogStream(
    epics: LocalEpicWithEstimation[],
    framework: PrioritizationFramework,
    onThought: LLMThoughtCallback
  ): Promise<Agent4SuggestionItem[]>;
}
