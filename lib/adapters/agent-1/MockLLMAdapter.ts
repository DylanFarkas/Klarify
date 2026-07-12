import { ILLMAdapter } from './ILLMAdapter';
import type {
  ContextDiscovery,
  TranscriptionResult,
  Wish,
} from '@/lib/types/agent-1';
import {
  MOCK_DISCOVERY_INSUFFICIENT,
  MOCK_DISCOVERY_SUFFICIENT,
  MOCK_WISHES,
} from '@/lib/mock/agent-1-mock';
import {
  ASSESSMENT_DELAY_MS,
  EXTRACTION_DELAY_MS,
  VAGUE_CONTEXT_CHAR_THRESHOLD,
  WISH_ID_PREFIX,
} from '@/lib/constants/agent-1';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';

const MOCK_ASSESSMENT_THOUGHTS = [
  'Leyendo el contexto del proyecto...',
  'Identificando el dominio y tipo de producto...',
  'Evaluando información sobre plataforma y usuarios objetivo...',
  'Detectando vacíos en alcance funcional y restricciones...',
  'Decidiendo si hacen falta preguntas de clarificación...',
];

const MOCK_EXTRACTION_THOUGHTS = [
  'Revisando el contexto completo del proyecto...',
  'Identificando funcionalidades y necesidades explícitas...',
  'Separando requerimientos en deseos accionables...',
  'Organizando los deseos detectados por prioridad...',
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function emitMockThoughts(
  thoughts: string[],
  onThought: LLMThoughtCallback,
  totalDelayMs: number
): Promise<void> {
  const stepDelay = Math.max(200, Math.floor(totalDelayMs / thoughts.length));

  for (const thought of thoughts) {
    onThought(`${thought}\n`);
    await delay(stepDelay);
  }
}

export class MockLLMAdapter implements ILLMAdapter {
  async analyzeContext(
    transcription: TranscriptionResult,
    _aiConfig?: import('@/lib/plans/types').AiGenerationConfig
  ): Promise<ContextDiscovery> {
    return this.analyzeContextStream(transcription, () => {}, _aiConfig);
  }

  async analyzeContextStream(
    transcription: TranscriptionResult,
    onThought: LLMThoughtCallback,
    _aiConfig?: import('@/lib/plans/types').AiGenerationConfig
  ): Promise<ContextDiscovery> {
    await emitMockThoughts(MOCK_ASSESSMENT_THOUGHTS, onThought, ASSESSMENT_DELAY_MS);

    const isVague = transcription.fullText.trim().length < VAGUE_CONTEXT_CHAR_THRESHOLD;
    const base = isVague ? MOCK_DISCOVERY_INSUFFICIENT : MOCK_DISCOVERY_SUFFICIENT;

    return {
      ...base,
      summary: isVague
        ? base.summary
        : `Entendemos tu proyecto: ${transcription.fullText.slice(0, 120)}${transcription.fullText.length > 120 ? '...' : ''}`,
    };
  }

  async extractWishes(
    _transcription: TranscriptionResult,
    _enrichedContext?: string | null,
    _aiConfig?: import('@/lib/plans/types').AiGenerationConfig
  ): Promise<Wish[]> {
    return this.extractWishesStream(_transcription, _enrichedContext, () => {}, _aiConfig);
  }

  async extractWishesStream(
    _transcription: TranscriptionResult,
    _enrichedContext: string | null | undefined,
    onThought: LLMThoughtCallback,
    _aiConfig?: import('@/lib/plans/types').AiGenerationConfig
  ): Promise<Wish[]> {
    await emitMockThoughts(MOCK_EXTRACTION_THOUGHTS, onThought, EXTRACTION_DELAY_MS);

    return MOCK_WISHES.map((wishData, index) => ({
      ...wishData,
      id: `${WISH_ID_PREFIX}-${String(index + 1).padStart(3, '0')}`,
      createdAt: Date.now() + index,
    }));
  }
}
