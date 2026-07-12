/**
 * @fileoverview Interfaz abstracta para el Adaptador del Agente 3.
 * Define las firmas obligatorias para el cálculo de Story Points.
 */

import type { LocalEpic, Agent3SuggestionItem } from '@/lib/types/agent-3';
import type { AiGenerationConfig } from '@/lib/plans/types';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';

export interface IEstimationAdapter {
  estimateBacklog(
    epics: LocalEpic[],
    aiConfig?: AiGenerationConfig
  ): Promise<Agent3SuggestionItem[]>;

  estimateBacklogStream(
    epics: LocalEpic[],
    onThought: LLMThoughtCallback,
    aiConfig?: AiGenerationConfig
  ): Promise<Agent3SuggestionItem[]>;
}