/**
 * @fileoverview Mock Adapter para el Agente 4.
 * Simula el comportamiento de un LLM emitiendo delays artificiales y heurísticas.
 */

import type { IPrioritizationAdapter } from './IPrioritizationAdapter';
import type {
  LocalEpicWithEstimation,
  Agent4SuggestionItem,
  PrioritizationFramework,
} from '@/lib/types/agent-4';
import { PRIORITIZATION_DELAY_MS } from '@/lib/constants/agent-4';
import {
  MOCK_PRIORITIZATION_THOUGHTS,
  mockPrioritizeStories,
} from '@/lib/mock/agent-4-mock';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function emitMockThoughts(
  thoughts: string[],
  onThought: LLMThoughtCallback,
  totalDelayMs: number
): Promise<void> {
  const stepDelay = Math.max(250, Math.floor(totalDelayMs / thoughts.length));

  for (const thought of thoughts) {
    onThought(thought);
    await delay(stepDelay);
  }
}

export class MockPrioritizationAdapter implements IPrioritizationAdapter {
  async prioritizeBacklog(
    epics: LocalEpicWithEstimation[],
    framework: PrioritizationFramework,
    _aiConfig?: import('@/lib/plans/types').AiGenerationConfig
  ): Promise<Agent4SuggestionItem[]> {
    return mockPrioritizeStories(epics, framework);
  }

  async prioritizeBacklogStream(
    epics: LocalEpicWithEstimation[],
    framework: PrioritizationFramework,
    onThought: LLMThoughtCallback,
    _aiConfig?: import('@/lib/plans/types').AiGenerationConfig
  ): Promise<Agent4SuggestionItem[]> {
    await emitMockThoughts(
      MOCK_PRIORITIZATION_THOUGHTS,
      onThought,
      PRIORITIZATION_DELAY_MS
    );
    return mockPrioritizeStories(epics, framework);
  }
}
