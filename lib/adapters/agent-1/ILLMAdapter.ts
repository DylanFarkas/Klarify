import type {
  ContextDiscovery,
  TranscriptionResult,
  Wish,
} from '@/lib/types/agent-1';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';

export interface ILLMAdapter {
  analyzeContext(transcription: TranscriptionResult): Promise<ContextDiscovery>;
  analyzeContextStream(
    transcription: TranscriptionResult,
    onThought: LLMThoughtCallback
  ): Promise<ContextDiscovery>;
  extractWishes(
    transcription: TranscriptionResult,
    enrichedContext?: string | null
  ): Promise<Wish[]>;
  extractWishesStream(
    transcription: TranscriptionResult,
    enrichedContext: string | null | undefined,
    onThought: LLMThoughtCallback
  ): Promise<Wish[]>;
}
