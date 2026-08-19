/**
 * @fileoverview Interfaz abstracta para el Adaptador del Agente 3.
 */

import type { EstimationMode, LocalEpic, Agent3SuggestionItem } from '@/lib/types/agent-3';
import type { AiGenerationConfig } from '@/lib/plans/types';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';

export interface IEstimationAdapter {
  estimateBacklog(
    epics: LocalEpic[],
    estimationMode: EstimationMode,
    aiConfig?: AiGenerationConfig
  ): Promise<Agent3SuggestionItem[]>;

  estimateBacklogStream(
    epics: LocalEpic[],
    estimationMode: EstimationMode,
    onThought: LLMThoughtCallback,
    aiConfig?: AiGenerationConfig
  ): Promise<Agent3SuggestionItem[]>;
}
