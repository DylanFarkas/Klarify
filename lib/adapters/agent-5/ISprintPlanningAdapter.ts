/**
 * @fileoverview Interfaz abstracta para el Adaptador del Agente 5.
 * Define las firmas obligatorias para la planificación de sprints.
 */

import type { LocalStoryForPlanning, SprintPlan, SprintPlanningConfig, StoryDependency } from '@/lib/types/agent-5';
import type { PrioritizationFramework } from '@/lib/types/agent-4';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';

export interface ISprintPlanningAdapter {
  planSprints(
    stories: LocalStoryForPlanning[],
    config: SprintPlanningConfig,
    framework: PrioritizationFramework,
    dependencies: StoryDependency[]
  ): Promise<SprintPlan>;

  planSprintsStream(
    stories: LocalStoryForPlanning[],
    config: SprintPlanningConfig,
    framework: PrioritizationFramework,
    onThought: LLMThoughtCallback
  ): Promise<SprintPlan>;
}
