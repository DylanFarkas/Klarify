/**
 * @fileoverview Adaptador Gemini para la generación de backlog - Stub para Fase 1
 */
import { IBacklogLLMAdapter } from './IBacklogLLMAdapter';
import type { Wish, TranscriptionResult } from '@/lib/types/agent-1';
import type { Epic } from '@/lib/types/agent-2';

export class GeminiBacklogAdapter implements IBacklogLLMAdapter {
  async generateBacklog(wishes: Wish[], transcription?: TranscriptionResult | null): Promise<Epic[]> {
    throw new Error('Not implemented: Integración Gemini pendiente (Fase 3)');
  }
}
