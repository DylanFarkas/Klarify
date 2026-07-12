/**
 * @fileoverview Servicio del Agente 3 — Capa de lógica de negocio (Scrum Master / Estimador).
 * Abstrae el procesamiento y cálculo de estimaciones de esfuerzo (Story Points).
 * Instancia el adaptador correcto detectando automáticamente el entorno de Klarify.
 */

import type { Agent3Input } from '@/lib/types/workspace';
import type { LocalEpic, Agent3SuggestionItem } from '@/lib/types/agent-3';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';

// Importación de la arquitectura de adaptadores del Agente 3
import { IEstimationAdapter } from '../adapters/agent-3/IEstimationAdapter';
import { MockEstimationAdapter } from '../adapters/agent-3/MockEstimationAdapter';
import { GeminiEstimationAdapter } from '../adapters/agent-3/GeminiBacklogAdapter';

// Instanciación dinámica idéntica a la estrategia del Agente 2
const estimationAdapter: IEstimationAdapter = process.env.GEMINI_API_KEY
  ? new GeminiEstimationAdapter()
  : new MockEstimationAdapter();

export interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: 'NO_INPUT' | 'EMPTY_BACKLOG';
}

/**
 * Valida que el input del Agente 3 contenga la estructura necesaria.
 * Replica el patrón estricto de validación de Klarify.
 */
export function validateAgent3Input(input: Agent3Input | null): ValidationResult {
  if (!input) {
    return { valid: false, error: 'No hay input proveído al Agente 3.', code: 'NO_INPUT' };
  }
  if (!input.epics || input.epics.length === 0) {
    return { valid: false, error: 'El listado de épicas entrante está vacío.', code: 'EMPTY_BACKLOG' };
  }
  return { valid: true };
}

/**
 * Lógica base de estimación asíncrona estándar (Promesa clásica).
 */
export async function estimateBacklog(epics: LocalEpic[]): Promise<Agent3SuggestionItem[]> {
  return estimationAdapter.estimateBacklog(epics);
}

/**
 * Genera estimaciones transmitiendo los pensamientos (Thoughts) del modelo en tiempo real.
 * Se conecta directamente al adaptador activo para delegar el trabajo a la IA o al Mock.
 */
export async function estimateBacklogStream(
  epics: LocalEpic[],
  onThought: LLMThoughtCallback,
  aiConfig?: import('@/lib/plans/types').AiGenerationConfig
): Promise<Agent3SuggestionItem[]> {
  return estimationAdapter.estimateBacklogStream(epics, onThought, aiConfig);
}