/**
 * @fileoverview Interface IBacklogLLMAdapter para el Agente 2
 */
import type { Wish, TranscriptionResult } from '@/lib/types/agent-1';
import type { Epic } from '@/lib/types/agent-2';
import type { AiGenerationConfig } from '@/lib/plans/types';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';

export interface IBacklogLLMAdapter {
  generateBacklog(
    wishes: Wish[],
    transcription?: TranscriptionResult | null,
    aiConfig?: AiGenerationConfig
  ): Promise<Epic[]>;
  generateBacklogStream(
    wishes: Wish[],
    onThought: LLMThoughtCallback,
    transcription?: TranscriptionResult | null,
    aiConfig?: AiGenerationConfig
  ): Promise<Epic[]>;
}
