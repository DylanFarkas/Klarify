/**
 * @fileoverview Servicio del Agente 4 — Capa de lógica de negocio (Product Owner / Priorización).
 * Abstrae el procesamiento y clasificación MoSCoW del backlog estimado.
 * Instancia el adaptador correcto detectando automáticamente el entorno de Klarify.
 */

import type { Agent4Input } from '@/lib/types/workspace';
import type {
  Agent4SuggestionItem,
  PrioritizationFramework,
} from '@/lib/types/agent-4';
import { toLocalEpicsWithEstimation } from '@/lib/types/agent-4';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';

import { IPrioritizationAdapter } from '../adapters/agent-4/IPrioritizationAdapter';
import { MockPrioritizationAdapter } from '../adapters/agent-4/MockPrioritizationAdapter';
import { GeminiPrioritizationAdapter } from '../adapters/agent-4/GeminiPrioritizationAdapter';
import { DEFAULT_FRAMEWORK } from '@/lib/constants/agent-4';

const prioritizationAdapter: IPrioritizationAdapter = process.env.GEMINI_API_KEY
  ? new GeminiPrioritizationAdapter()
  : new MockPrioritizationAdapter();

export interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: 'NO_INPUT' | 'EMPTY_BACKLOG' | 'MISSING_ESTIMATIONS';
}

/**
 * Valida que el input del Agente 4 contenga la estructura necesaria.
 */
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
  const allStoryIds = input.epics.flatMap((e) => e.userStories.map((s) => s.id));
  const missing = allStoryIds.filter((id) => !input.estimations[id]?.points);
  if (missing.length > 0) {
    return {
      valid: false,
      error: `Faltan estimaciones para ${missing.length} historia(s).`,
      code: 'MISSING_ESTIMATIONS',
    };
  }
  return { valid: true };
}

/**
 * Genera priorizaciones transmitiendo los pensamientos del modelo en tiempo real.
 */
export async function prioritizeBacklogStream(
  input: Agent4Input,
  framework: PrioritizationFramework = DEFAULT_FRAMEWORK,
  onThought: LLMThoughtCallback
): Promise<Agent4SuggestionItem[]> {
  const localEpics = toLocalEpicsWithEstimation(input.epics, input.estimations);
  return prioritizationAdapter.prioritizeBacklogStream(localEpics, framework, onThought);
}
