/**
 * @fileoverview Adaptador Mock para la generación de backlog
 */
import { IBacklogLLMAdapter } from './IBacklogLLMAdapter';
import type { Wish, TranscriptionResult } from '@/lib/types/agent-1';
import type { Epic } from '@/lib/types/agent-2';
import { MOCK_BACKLOG } from '@/lib/mock/agent-2-mock';
import { GENERATION_DELAY_MS } from '@/lib/constants/agent-2';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';

const MOCK_BACKLOG_THOUGHTS = [
  'Analizando los deseos aprobados del cliente...',
  'Identificando temas y agrupaciones naturales...',
  'Diseñando épicas temáticas para el backlog...',
  'Redactando historias de usuario en formato ágil...',
  'Definiendo criterios de aceptación verificables...',
  'Validando trazabilidad con los deseos originales...',
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function emitMockThoughts(
  thoughts: string[],
  onThought: LLMThoughtCallback,
  totalDelayMs: number
): Promise<void> {
  const stepDelay = Math.max(250, Math.floor(totalDelayMs / thoughts.length));

  for (const thought of thoughts) {
    onThought(`${thought}\n`);
    await delay(stepDelay);
  }
}

export class MockBacklogAdapter implements IBacklogLLMAdapter {
  async generateBacklog(
    wishes: Wish[],
    transcription?: TranscriptionResult | null,
    _aiConfig?: import('@/lib/plans/types').AiGenerationConfig
  ): Promise<Epic[]> {
    return this.generateBacklogStream(wishes, () => {}, transcription);
  }

  async generateBacklogStream(
    wishes: Wish[],
    onThought: LLMThoughtCallback,
    _transcription?: TranscriptionResult | null,
    _aiConfig?: import('@/lib/plans/types').AiGenerationConfig
  ): Promise<Epic[]> {
    if (!wishes || wishes.length === 0) {
      throw new Error(
        'Error en el servicio de extracción: No se pueden generar épicas sin deseos (wishes) de entrada.'
      );
    }

    await emitMockThoughts(MOCK_BACKLOG_THOUGHTS, onThought, GENERATION_DELAY_MS);
    return MOCK_BACKLOG;
  }
}
