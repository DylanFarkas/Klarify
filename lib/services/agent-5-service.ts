/**
 * @fileoverview Servicio del Agente 5 — Sprint Planning.
 */

import 'server-only';

import type { Agent5Input } from '@/lib/types/workspace';
import type { SprintPlan, SprintPlanningConfig } from '@/lib/types/agent-5';
import { toLocalStoriesForPlanning } from '@/lib/types/agent-5';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';
import { isStoryEstimated } from '@/lib/utils/estimation';

import { ISprintPlanningAdapter } from '../adapters/agent-5/ISprintPlanningAdapter';
import { MockSprintPlanningAdapter } from '../adapters/agent-5/MockSprintPlanningAdapter';
import { LlmSprintPlanningAdapter } from '../adapters/agent-5/LlmSprintPlanningAdapter';
import { resolveLlmCredentials } from '@/lib/llm/resolve';

async function resolveSprintPlanningAdapter(uid: string): Promise<ISprintPlanningAdapter> {
  const credentials = await resolveLlmCredentials(uid);
  if (!credentials) return new MockSprintPlanningAdapter();
  return new LlmSprintPlanningAdapter(credentials);
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: 'NO_INPUT' | 'EMPTY_BACKLOG' | 'MISSING_ESTIMATIONS' | 'MISSING_PRIORITIES' | 'INVALID_CAPACITY';
}

export function validateAgent5Input(input: Agent5Input | null): ValidationResult {
  if (!input) {
    return { valid: false, error: 'No hay input proveído al Agente 5.', code: 'NO_INPUT' };
  }
  if (!input.epics?.length) {
    return { valid: false, error: 'El listado de épicas entrante está vacío.', code: 'EMPTY_BACKLOG' };
  }
  const allStoryIds = input.epics.flatMap((e) => e.userStories.map((s) => s.id));
  const mode = input.estimationMode ?? 'story_points';
  const missingEst = allStoryIds.filter((id) => !isStoryEstimated(input.estimations[id], mode));
  if (missingEst.length > 0) {
    return {
      valid: false,
      error: `Faltan estimaciones para ${missingEst.length} historia(s).`,
      code: 'MISSING_ESTIMATIONS',
    };
  }
  const missingPri = allStoryIds.filter((id) => !input.priorities[id]?.category);
  if (missingPri.length > 0) {
    return {
      valid: false,
      error: `Faltan prioridades para ${missingPri.length} historia(s).`,
      code: 'MISSING_PRIORITIES',
    };
  }
  return { valid: true };
}

export async function planSprintsStream(
  uid: string,
  input: Agent5Input,
  config: SprintPlanningConfig,
  onThought: LLMThoughtCallback,
  aiConfig?: import('@/lib/plans/types').AiGenerationConfig
): Promise<SprintPlan> {
  const sprintPlanningAdapter = await resolveSprintPlanningAdapter(uid);
  const stories = toLocalStoriesForPlanning(input);
  return sprintPlanningAdapter.planSprintsStream(stories, config, input.framework, onThought, aiConfig);
}
