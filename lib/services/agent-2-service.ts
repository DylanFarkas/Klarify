/**
 * @fileoverview Servicio del Agente 2 — Capa de lógica de negocio.
 * 
 * Abstrae el procesamiento y generación de backlog.
 * Instancia el adaptador correcto simulando o conectando LLM.
 */

import type { Wish, TranscriptionResult } from '@/lib/types/agent-1';
import type { Agent2Input, Epic, UserStory } from '@/lib/types/agent-2';
import { IBacklogLLMAdapter } from '@/lib/adapters/agent-2/IBacklogLLMAdapter';
import { MockBacklogAdapter } from '@/lib/adapters/agent-2/MockBacklogAdapter';
import { GeminiBacklogAdapter } from '@/lib/adapters/agent-2/GeminiBacklogAdapter';
import { EPIC_ID_PREFIX, USER_STORY_ID_PREFIX } from '@/lib/constants/agent-2';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';

const backlogAdapter: IBacklogLLMAdapter = process.env.GEMINI_API_KEY
  ? new GeminiBacklogAdapter()
  : new MockBacklogAdapter();

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

export function generateEpicId(existing: Epic[] = []): string {
  const maxNum = existing.reduce((max, epic) => {
    const numStr = epic.id.replace(`${EPIC_ID_PREFIX}-`, '');
    const num = parseInt(numStr, 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
  return `${EPIC_ID_PREFIX}-${String(maxNum + 1).padStart(3, '0')}`;
}

export function generateUserStoryId(existing: UserStory[] = []): string {
  const maxNum = existing.reduce((max, story) => {
    const numStr = story.id.replace(`${USER_STORY_ID_PREFIX}-`, '');
    const num = parseInt(numStr, 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
  return `${USER_STORY_ID_PREFIX}-${String(maxNum + 1).padStart(3, '0')}`;
}

export async function generateBacklog(
  wishes: Wish[],
  transcription?: TranscriptionResult | null
): Promise<Epic[]> {
  return backlogAdapter.generateBacklog(wishes, transcription);
}

/**
 * Genera backlog emitiendo pensamientos del LLM en tiempo real.
 */
export async function generateBacklogStream(
  wishes: Wish[],
  onThought: LLMThoughtCallback,
  transcription?: TranscriptionResult | null
): Promise<Epic[]> {
  return backlogAdapter.generateBacklogStream(wishes, onThought, transcription);
}
