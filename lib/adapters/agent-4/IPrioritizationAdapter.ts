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
import type { AiGenerationConfig } from '@/lib/plans/types';

export interface IPrioritizationAdapter {
  prioritizeBacklog(
    epics: LocalEpicWithEstimation[],
    framework: PrioritizationFramework,
    aiConfig?: AiGenerationConfig
  ): Promise<Agent4SuggestionItem[]>;

  prioritizeBacklogStream(
    epics: LocalEpicWithEstimation[],
    framework: PrioritizationFramework,
    onThought: LLMThoughtCallback,
    aiConfig?: AiGenerationConfig
  ): Promise<Agent4SuggestionItem[]>;
}
