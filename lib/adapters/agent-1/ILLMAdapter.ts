import type {
  ContextDiscovery,
  TranscriptionResult,
  Wish,
} from '@/lib/types/agent-1';
import type { AiGenerationConfig } from '@/lib/plans/types';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';

export interface ILLMAdapter {
  analyzeContext(
    transcription: TranscriptionResult,
    aiConfig?: AiGenerationConfig
  ): Promise<ContextDiscovery>;
  analyzeContextStream(
    transcription: TranscriptionResult,
    onThought: LLMThoughtCallback,
    aiConfig?: AiGenerationConfig
  ): Promise<ContextDiscovery>;
  extractWishes(
    transcription: TranscriptionResult,
    enrichedContext?: string | null,
    aiConfig?: AiGenerationConfig
  ): Promise<Wish[]>;
  extractWishesStream(
    transcription: TranscriptionResult,
    enrichedContext: string | null | undefined,
    onThought: LLMThoughtCallback,
    aiConfig?: AiGenerationConfig
  ): Promise<Wish[]>;
}
