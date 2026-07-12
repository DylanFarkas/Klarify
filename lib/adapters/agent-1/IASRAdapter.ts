import { TranscriptionResult } from '@/lib/types/agent-1';

export interface IASRAdapter {
  transcribe(file: File): Promise<TranscriptionResult>;
}
