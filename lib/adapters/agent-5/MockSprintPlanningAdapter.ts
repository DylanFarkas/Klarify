/**
 * @fileoverview Mock Adapter para el Agente 5.
 * Simula el comportamiento de un Scrum Master IA emitiendo delays artificiales y heurísticas.
 */

import type { ISprintPlanningAdapter } from './ISprintPlanningAdapter';
import type { PrioritizationFramework } from '@/lib/types/agent-4';
import type { LocalStoryForPlanning, SprintPlan, SprintPlanningConfig, StoryDependency } from '@/lib/types/agent-5';
import { SPRINT_PLANNING_DELAY_MS } from '@/lib/constants/agent-5';
import { MOCK_SPRINT_PLANNING_THOUGHTS, mockPlanSprints } from '@/lib/mock/agent-5-mock';
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

export class MockSprintPlanningAdapter implements ISprintPlanningAdapter {
  async planSprints(
    stories: LocalStoryForPlanning[],
    config: SprintPlanningConfig,
    framework: PrioritizationFramework,
    _dependencies: StoryDependency[]
  ): Promise<SprintPlan> {
    return mockPlanSprints(stories, config, framework);
  }

  async planSprintsStream(
    stories: LocalStoryForPlanning[],
    config: SprintPlanningConfig,
    framework: PrioritizationFramework,
    onThought: LLMThoughtCallback
  ): Promise<SprintPlan> {
    await emitMockThoughts(MOCK_SPRINT_PLANNING_THOUGHTS, onThought, SPRINT_PLANNING_DELAY_MS);
    return mockPlanSprints(stories, config, framework);
  }
}
