/**
 * @fileoverview Servicio del Agente 1 — Capa de lógica de negocio.
 *
 * Solo servidor: ASR + LLM (contexto y deseos).
 */

import 'server-only';

import type {
  ClarificationAnswer,
  ContextDiscovery,
  TranscriptionResult,
  Wish,
} from '@/lib/types/agent-1';
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  OTHER_OPTION_ID,
} from '@/lib/constants/agent-1';

import { IASRAdapter } from '@/lib/adapters/agent-1/IASRAdapter';
import { ILLMAdapter } from '@/lib/adapters/agent-1/ILLMAdapter';
import { MockASRAdapter } from '@/lib/adapters/agent-1/MockASRAdapter';
import { MockLLMAdapter } from '@/lib/adapters/agent-1/MockLLMAdapter';
import { OpenAIASRAdapter } from '@/lib/adapters/agent-1/OpenAIASRAdapter';
import { LlmContextAdapter } from '@/lib/adapters/agent-1/LlmContextAdapter';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';
import { resolveLlmCredentials } from '@/lib/llm/resolve';

export { generateWishId } from '@/lib/utils/agent-1-ids';

// ---------------------------------------------------------------------------
// Adaptadores
// ---------------------------------------------------------------------------

const asrAdapter: IASRAdapter = process.env.OPENAI_API_KEY 
  ? new OpenAIASRAdapter() 
  : new MockASRAdapter();

async function resolveLlmAdapter(uid: string): Promise<ILLMAdapter> {
  const credentials = await resolveLlmCredentials(uid);
  if (!credentials) return new MockLLMAdapter();
  return new LlmContextAdapter(credentials);
}

/**
 * Construye el contexto enriquecido fusionando la transcripción original
 * con las respuestas del usuario a las preguntas de discovery.
 */
export function buildEnrichedContext(
  transcription: TranscriptionResult,
  discovery: ContextDiscovery,
  answers: ClarificationAnswer[],
  skipped: boolean
): string {
  const parts: string[] = [transcription.fullText.trim()];

  if (skipped) {
    parts.push('\n\n[NOTA: El usuario optó por continuar sin responder las preguntas de clarificación.]');
    return parts.join('');
  }

  if (answers.length === 0 || discovery.questions.length === 0) {
    return parts.join('');
  }

  parts.push('\n\n--- CONTEXTO ADICIONAL (respuestas del cliente) ---');

  for (const question of discovery.questions) {
    const answer = answers.find((a) => a.questionId === question.id);
    if (!answer) continue;

    let responseText: string;
    if (answer.selectedOptionId === OTHER_OPTION_ID) {
      responseText = answer.customText?.trim() ?? '';
    } else {
      const option = question.options.find((o) => o.id === answer.selectedOptionId);
      responseText = option?.label ?? '';
    }

    if (responseText) {
      parts.push(`\nP: ${question.question}\nR: ${responseText}`);
    }
  }

  return parts.join('');
}

export interface ClarificationValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Valida que todas las preguntas tengan respuesta válida cuando no se saltó el paso.
 */
export function validateClarificationAnswers(
  discovery: ContextDiscovery,
  answers: ClarificationAnswer[],
  skipped: boolean
): ClarificationValidationResult {
  if (skipped) {
    return { valid: true };
  }

  for (const question of discovery.questions) {
    const answer = answers.find((a) => a.questionId === question.id);
    if (!answer?.selectedOptionId) {
      return {
        valid: false,
        error: `Falta responder: "${question.question}"`,
      };
    }
    if (answer.selectedOptionId === OTHER_OPTION_ID && !answer.customText?.trim()) {
      return {
        valid: false,
        error: `Debes escribir tu respuesta para: "${question.question}"`,
      };
    }
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Validación de archivos
// ---------------------------------------------------------------------------

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  code?: 'INVALID_TYPE' | 'FILE_TOO_LARGE';
}

/**
 * Valida que el archivo cumpla con los requisitos del CA1:
 * - Formato soportado (.mp3, .wav, .txt, .pdf)
 * - Tamaño ≤ 50 MB
 */
export function validateFile(
  fileName: string,
  fileSize: number,
  mimeType: string
): FileValidationResult {
  // Extraer extensión del nombre del archivo
  const dotIndex = fileName.lastIndexOf('.');
  const extension = dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';

  // Validar extensión
  if (!ALLOWED_EXTENSIONS.includes(extension as typeof ALLOWED_EXTENSIONS[number])) {
    return {
      valid: false,
      error: `Formato "${extension || 'desconocido'}" no soportado. Formatos permitidos: ${ALLOWED_EXTENSIONS.join(', ')}`,
      code: 'INVALID_TYPE',
    };
  }

  // Validar MIME type (verificación adicional)
  const allowedMimes = ALLOWED_MIME_TYPES[extension];
  if (allowedMimes && !allowedMimes.includes(mimeType) && mimeType !== 'application/octet-stream') {
    return {
      valid: false,
      error: `Tipo de archivo inválido para la extensión ${extension}.`,
      code: 'INVALID_TYPE',
    };
  }

  // Validar tamaño
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (fileSize / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `El archivo (${sizeMB} MB) excede el límite de 50 MB.`,
      code: 'FILE_TOO_LARGE',
    };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Procesamiento de archivos
// ---------------------------------------------------------------------------

/**
 * Procesa un archivo subido y genera la transcripción.
 */
export async function processFile(file: File): Promise<TranscriptionResult> {
  return asrAdapter.transcribe(file);
}

/**
 * Crea un resultado de transcripción simulado a partir de texto plano directo.
 */
export function processText(text: string): TranscriptionResult {
  return {
    fullText: text,
    language: 'es',
    duration: 0, // No aplica
    segments: [
      {
        start: 0,
        end: 0,
        text: text,
        confidence: 1,
      }
    ]
  };
}

/**
 * Evalúa si el contexto del usuario es suficiente para generar un backlog.
 */
export async function analyzeContext(
  uid: string,
  transcription: TranscriptionResult,
  aiConfig?: import('@/lib/plans/types').AiGenerationConfig
): Promise<ContextDiscovery> {
  const llmAdapter = await resolveLlmAdapter(uid);
  return llmAdapter.analyzeContext(transcription, aiConfig);
}

export async function analyzeContextStream(
  uid: string,
  transcription: TranscriptionResult,
  onThought: LLMThoughtCallback,
  aiConfig?: import('@/lib/plans/types').AiGenerationConfig
): Promise<ContextDiscovery> {
  const llmAdapter = await resolveLlmAdapter(uid);
  return llmAdapter.analyzeContextStream(transcription, onThought, aiConfig);
}

/**
 * Extrae deseos/necesidades del cliente a partir del contexto enriquecido.
 */
export async function extractWishesFromContext(
  uid: string,
  transcription: TranscriptionResult,
  discovery: ContextDiscovery,
  answers: ClarificationAnswer[] = [],
  skipped = false
): Promise<{ wishes: Wish[]; enrichedContext: string }> {
  const llmAdapter = await resolveLlmAdapter(uid);
  const enrichedContext = buildEnrichedContext(transcription, discovery, answers, skipped);
  const wishes = await llmAdapter.extractWishes(transcription, enrichedContext);
  return { wishes, enrichedContext };
}

/**
 * Extrae deseos emitiendo pensamientos del LLM en tiempo real.
 */
export async function extractWishesFromContextStream(
  uid: string,
  transcription: TranscriptionResult,
  discovery: ContextDiscovery,
  onThought: LLMThoughtCallback,
  answers: ClarificationAnswer[] = [],
  skipped = false,
  aiConfig?: import('@/lib/plans/types').AiGenerationConfig
): Promise<{ wishes: Wish[]; enrichedContext: string }> {
  const llmAdapter = await resolveLlmAdapter(uid);
  const enrichedContext = buildEnrichedContext(transcription, discovery, answers, skipped);
  const wishes = await llmAdapter.extractWishesStream(
    transcription,
    enrichedContext,
    onThought,
    aiConfig
  );
  return { wishes, enrichedContext };
}
