/**
 * @fileoverview Servicio del Agente 4 — Priorización.
 */

import 'server-only';

import type { Agent4Input } from '@/lib/types/workspace';
import type {
  Agent4SuggestionItem,
  PrioritizationFramework,
} from '@/lib/types/agent-4';
import { toLocalEpicsWithEstimation } from '@/lib/types/agent-4';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';
import { isStoryEstimated } from '@/lib/utils/estimation';

import { IPrioritizationAdapter } from '../adapters/agent-4/IPrioritizationAdapter';
import { MockPrioritizationAdapter } from '../adapters/agent-4/MockPrioritizationAdapter';
import { LlmPrioritizationAdapter } from '../adapters/agent-4/LlmPrioritizationAdapter';
import { DEFAULT_FRAMEWORK } from '@/lib/constants/agent-4';
import { resolveLlmCredentials } from '@/lib/llm/resolve';

async function resolvePrioritizationAdapter(uid: string): Promise<IPrioritizationAdapter> {
  const credentials = await resolveLlmCredentials(uid);
  if (!credentials) return new MockPrioritizationAdapter();
  return new LlmPrioritizationAdapter(credentials);
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: 'NO_INPUT' | 'EMPTY_BACKLOG' | 'MISSING_ESTIMATIONS';
}

export function validateAgent4Input(input: Agent4Input | null): ValidationResult {
  if (!input) {
    return { valid: false, error: 'No hay input proveído al Agente 4.', code: 'NO_INPUT' };
  }
  if (!input.epics?.length) {
    return {
      valid: false,
      error: 'El listado de épicas entrante está vacío.',
      code: 'EMPTY_BACKLOG',
    };
  }
  const mode = input.estimationMode ?? 'story_points';
  const allStoryIds = input.epics.flatMap((e) => e.userStories.map((s) => s.id));
  const missing = allStoryIds.filter((id) => !isStoryEstimated(input.estimations[id], mode));
  if (missing.length > 0) {
    return {
      valid: false,
      error: `Faltan estimaciones para ${missing.length} historia(s).`,
      code: 'MISSING_ESTIMATIONS',
    };
  }
  return { valid: true };
}

export async function prioritizeBacklogStream(
  uid: string,
  input: Agent4Input,
  framework: PrioritizationFramework = DEFAULT_FRAMEWORK,
  onThought: LLMThoughtCallback,
  aiConfig?: import('@/lib/plans/types').AiGenerationConfig
): Promise<Agent4SuggestionItem[]> {
  const prioritizationAdapter = await resolvePrioritizationAdapter(uid);
  const localEpics = toLocalEpicsWithEstimation(
    input.epics,
    input.estimations,
    input.estimationMode ?? 'story_points'
  );
  return prioritizationAdapter.prioritizeBacklogStream(localEpics, framework, onThought, aiConfig);
}
