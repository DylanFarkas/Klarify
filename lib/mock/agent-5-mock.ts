/**
 * @fileoverview Mock data para el Agente 5 — Sprint Planning.
 *
 * Simula la salida del Scrum Master IA con heurísticas deterministas:
 * ordenar por prioridad, detectar capacidades habilitantes, inferir dependencias
 * y distribuir en sprints según capacidad.
 */

import type { PrioritizationFramework } from '@/lib/types/agent-4';
import type {
  LocalStoryForPlanning,
  SprintPlan,
  SprintPlanningConfig,
} from '@/lib/types/agent-5';
import { buildSprintSchedule } from '@/lib/types/agent-5';
import { MOCK_SPRINT_PLANNING_THOUGHTS } from '@/lib/constants/agent-5';
import { inferEnablingDependencies } from '@/lib/utils/foundational-stories';
import {
  assignStoriesToSprints,
  generateSprintGoals,
} from '@/lib/utils/sprint-assignment';

export { MOCK_SPRINT_PLANNING_THOUGHTS };

export function mockPlanSprints(
  stories: LocalStoryForPlanning[],
  config: SprintPlanningConfig,
  framework: PrioritizationFramework = 'moscow'
): SprintPlan {
  const dependencies = inferEnablingDependencies(stories, framework);
  const { sprints, unassigned } = assignStoriesToSprints(
    stories,
    dependencies,
    config,
    framework
  );
  const withGoals = generateSprintGoals(sprints, stories);
  const scheduled = buildSprintSchedule(withGoals, config);

  return {
    sprints: scheduled,
    dependencies,
    config,
    unassignedStoryIds: unassigned,
  };
}
