/**
 * @fileoverview Servicio del Agente 2 — Capa de lógica de negocio.
 *
 * Solo servidor: resuelve LLM y genera backlog.
 */

import 'server-only';

import type { Wish, TranscriptionResult } from '@/lib/types/agent-1';
import type { Agent2Input, Epic } from '@/lib/types/agent-2';
import { IBacklogLLMAdapter } from '@/lib/adapters/agent-2/IBacklogLLMAdapter';
import { MockBacklogAdapter } from '@/lib/adapters/agent-2/MockBacklogAdapter';
import { LlmBacklogAdapter } from '@/lib/adapters/agent-2/LlmBacklogAdapter';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';
import { resolveLlmCredentials } from '@/lib/llm/resolve';

export { generateEpicId, generateUserStoryId } from '@/lib/utils/agent-2-ids';

async function resolveBacklogAdapter(uid: string): Promise<IBacklogLLMAdapter> {
  const credentials = await resolveLlmCredentials(uid);
  if (!credentials) return new MockBacklogAdapter();
  return new LlmBacklogAdapter(credentials);
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: 'NO_INPUT' | 'EMPTY_WISHES';
}

export function validateAgent2Input(input: Agent2Input | null): ValidationResult {
  if (!input) {
    return { valid: false, error: 'No hay input proveído al Agente 2.', code: 'NO_INPUT' };
  }
  if (!input.wishes || input.wishes.length === 0) {
    return { valid: false, error: 'El listado de deseos está vacío.', code: 'EMPTY_WISHES' };
  }
  return { valid: true };
}

export async function generateBacklog(
  uid: string,
  wishes: Wish[],
  transcription?: TranscriptionResult | null,
  aiConfig?: import('@/lib/plans/types').AiGenerationConfig
): Promise<Epic[]> {
  const backlogAdapter = await resolveBacklogAdapter(uid);
  return backlogAdapter.generateBacklog(wishes, transcription, aiConfig);
}

export async function generateBacklogStream(
  uid: string,
  wishes: Wish[],
  onThought: LLMThoughtCallback,
  transcription?: TranscriptionResult | null,
  aiConfig?: import('@/lib/plans/types').AiGenerationConfig
): Promise<Epic[]> {
  const backlogAdapter = await resolveBacklogAdapter(uid);
  return backlogAdapter.generateBacklogStream(wishes, onThought, transcription, aiConfig);
}
