/**
 * @fileoverview Adaptador Mock para la generación de backlog
 */
import { IBacklogLLMAdapter } from './IBacklogLLMAdapter';
import type { Wish, TranscriptionResult } from '@/lib/types/agent-1';
import type { Epic } from '@/lib/types/agent-2';
import { MOCK_BACKLOG } from '@/lib/mock/agent-2-mock';
import { GENERATION_DELAY_MS } from '@/lib/constants/agent-2';

export class MockBacklogAdapter implements IBacklogLLMAdapter {
  async generateBacklog(wishes: Wish[], transcription?: TranscriptionResult | null): Promise<Epic[]> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!wishes || wishes.length === 0) {
          reject(new Error('Error en el servicio de extracción: No se pueden generar épicas sin deseos (wishes) de entrada.'));
        } else {
          resolve(MOCK_BACKLOG);
        }
      }, GENERATION_DELAY_MS);
    });
  }
}
