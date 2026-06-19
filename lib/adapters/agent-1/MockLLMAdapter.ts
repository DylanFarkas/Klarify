import { ILLMAdapter } from './ILLMAdapter';
import { TranscriptionResult, Wish } from '@/lib/types/agent-1';
import { MOCK_WISHES } from '@/lib/mock/agent-1-mock';
import { EXTRACTION_DELAY_MS, WISH_ID_PREFIX } from '@/lib/constants/agent-1';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockLLMAdapter implements ILLMAdapter {
  async extractWishes(transcription: TranscriptionResult): Promise<Wish[]> {
    // Simular tiempo de procesamiento del LLM
    await delay(EXTRACTION_DELAY_MS);

    // Generar IDs secuenciales para los deseos mock
    const wishes: Wish[] = MOCK_WISHES.map((wishData, index) => ({
      ...wishData,
      id: `${WISH_ID_PREFIX}-${String(index + 1).padStart(3, '0')}`,
      createdAt: Date.now() + index, // IDs temporales únicos
    }));

    return wishes;
  }
}
