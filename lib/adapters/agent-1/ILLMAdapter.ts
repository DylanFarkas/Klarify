import { TranscriptionResult, Wish } from '@/lib/types/agent-1';

export interface ILLMAdapter {
  extractWishes(transcription: TranscriptionResult): Promise<Wish[]>;
}
