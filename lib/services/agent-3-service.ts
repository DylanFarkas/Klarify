/**
 * @fileoverview Servicio del Agente 3 — Estimación (Scrum Master).
 */

import 'server-only';

import type { Agent3Input } from '@/lib/types/workspace';
import type { LocalEpic, Agent3SuggestionItem } from '@/lib/types/agent-3';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';

import { IEstimationAdapter } from '../adapters/agent-3/IEstimationAdapter';
import { MockEstimationAdapter } from '../adapters/agent-3/MockEstimationAdapter';
import { LlmEstimationAdapter } from '../adapters/agent-3/LlmEstimationAdapter';
import { resolveLlmCredentials } from '@/lib/llm/resolve';

async function resolveEstimationAdapter(uid: string): Promise<IEstimationAdapter> {
  const credentials = await resolveLlmCredentials(uid);
  if (!credentials) return new MockEstimationAdapter();
  return new LlmEstimationAdapter(credentials);
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: 'NO_INPUT' | 'EMPTY_BACKLOG';
}

export function validateAgent3Input(input: Agent3Input | null): ValidationResult {
  if (!input) {
    return { valid: false, error: 'No hay input proveído al Agente 3.', code: 'NO_INPUT' };
  }
  if (!input.epics || input.epics.length === 0) {
    return { valid: false, error: 'El listado de épicas entrante está vacío.', code: 'EMPTY_BACKLOG' };
  }
  return { valid: true };
}

export async function estimateBacklog(
  uid: string,
  epics: LocalEpic[]
): Promise<Agent3SuggestionItem[]> {
  const estimationAdapter = await resolveEstimationAdapter(uid);
  return estimationAdapter.estimateBacklog(epics);
}

export async function estimateBacklogStream(
  uid: string,
  epics: LocalEpic[],
  onThought: LLMThoughtCallback,
  aiConfig?: import('@/lib/plans/types').AiGenerationConfig
): Promise<Agent3SuggestionItem[]> {
  const estimationAdapter = await resolveEstimationAdapter(uid);
  return estimationAdapter.estimateBacklogStream(epics, onThought, aiConfig);
}
