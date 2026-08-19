/**
 * @fileoverview Mock Adapter para el Agente 3.
 */

import type { IEstimationAdapter } from './IEstimationAdapter';
import type { EstimationMode, LocalEpic, Agent3SuggestionItem } from '@/lib/types/agent-3';
import { ESTIMATION_DELAY_MS } from '@/lib/constants/agent-3';
import { MOCK_ESTIMATION_THOUGHTS, mockEstimateStories } from '@/lib/mock/agent-3-mock';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';
import type { AiGenerationConfig } from '@/lib/plans/types';

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

export class MockEstimationAdapter implements IEstimationAdapter {
  async estimateBacklog(
    epics: LocalEpic[],
    estimationMode: EstimationMode,
    _aiConfig?: AiGenerationConfig
  ): Promise<Agent3SuggestionItem[]> {
    return mockEstimateStories(epics, estimationMode);
  }

  async estimateBacklogStream(
    epics: LocalEpic[],
    estimationMode: EstimationMode,
    onThought: LLMThoughtCallback,
    _aiConfig?: AiGenerationConfig
  ): Promise<Agent3SuggestionItem[]> {
    await emitMockThoughts(MOCK_ESTIMATION_THOUGHTS, onThought, ESTIMATION_DELAY_MS);
    return mockEstimateStories(epics, estimationMode);
  }
}
