/**
 * @fileoverview Interface IBacklogLLMAdapter para el Agente 2
 */
import type { Wish, TranscriptionResult } from '@/lib/types/agent-1';
import type { Epic } from '@/lib/types/agent-2';

export interface IBacklogLLMAdapter {
  generateBacklog(wishes: Wish[], transcription?: TranscriptionResult | null): Promise<Epic[]>;
}
