import { IASRAdapter } from './IASRAdapter';
import { TranscriptionResult } from '@/lib/types/agent-1';
import { MOCK_TRANSCRIPTION } from '@/lib/mock/agent-1-mock';
import { TRANSCRIPTION_DELAY_MS } from '@/lib/constants/agent-1';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockASRAdapter implements IASRAdapter {
  async transcribe(file: File): Promise<TranscriptionResult> {
    // Simular tiempo de procesamiento de la API
    await delay(TRANSCRIPTION_DELAY_MS);

    // Retornar transcripción mock
    return { ...MOCK_TRANSCRIPTION };
  }
}
