/**
 * @fileoverview Interfaz abstracta para el Adaptador del Agente 3.
 * Define las firmas obligatorias para el cálculo de Story Points.
 */

import type { LocalEpic, Agent3SuggestionItem } from '@/lib/types/agent-3';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';

export interface IEstimationAdapter {
  /**
   * Genera estimaciones de manera síncrona (Promesa estándar).
   */
  estimateBacklog(epics: LocalEpic[]): Promise<Agent3SuggestionItem[]>;

  /**
   * Genera estimaciones transmitiendo pensamientos intermedios en tiempo real.
   */
  estimateBacklogStream(
    epics: LocalEpic[],
    onThought: LLMThoughtCallback
  ): Promise<Agent3SuggestionItem[]>;
}