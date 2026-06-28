/**
 * @fileoverview Servicio del Agente 1 — Capa de lógica de negocio.
 *
 * Abstrae el procesamiento de archivos y la extracción de deseos.
 * Actualmente usa datos mock con delays para simular llamadas a API.
 *
 * 🔄 PUNTO DE INTEGRACIÓN: Cuando se conecten APIs reales (Whisper, Gemini),
 * solo hay que modificar las funciones `processFile` y `extractWishes` aquí.
 * El resto de la app no necesita cambios.
 */

import type {
  ClarificationAnswer,
  ContextDiscovery,
  TranscriptionResult,
  Wish,
} from '@/lib/types/agent-1';
import {
  WISH_ID_PREFIX,
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
import { GeminiLLMAdapter } from '@/lib/adapters/agent-1/GeminiLLMAdapter';
import type { LLMThoughtCallback } from '@/lib/utils/llm-stream';

// ---------------------------------------------------------------------------
// Adaptadores
// ---------------------------------------------------------------------------
// Instanciamos los adaptadores. Si las keys están en .env.local usamos las APIs reales,
// de lo contrario usamos mocks para evitar fallos durante demostraciones o desarrollo.

const asrAdapter: IASRAdapter = process.env.OPENAI_API_KEY 
  ? new OpenAIASRAdapter() 
  : new MockASRAdapter();

const llmAdapter: ILLMAdapter = process.env.GEMINI_API_KEY 
  ? new GeminiLLMAdapter() 
  : new MockLLMAdapter();

// ---------------------------------------------------------------------------
// Utilidades internas
// ---------------------------------------------------------------------------

/**
 * Genera un ID de deseo con formato DESEO-001, DESEO-002, etc.
 * Calcula el siguiente número basándose en los deseos existentes.
 */
export function generateWishId(existingWishes: Wish[] = []): string {
  const maxNum = existingWishes.reduce((max, wish) => {
    const numStr = wish.id.replace(`${WISH_ID_PREFIX}-`, '');
    const num = parseInt(numStr, 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);

  return `${WISH_ID_PREFIX}-${String(maxNum + 1).padStart(3, '0')}`;
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
  transcription: TranscriptionResult
): Promise<ContextDiscovery> {
  return llmAdapter.analyzeContext(transcription);
}

/**
 * Evalúa el contexto emitiendo pensamientos del LLM en tiempo real.
 */
export async function analyzeContextStream(
  transcription: TranscriptionResult,
  onThought: LLMThoughtCallback
): Promise<ContextDiscovery> {
  return llmAdapter.analyzeContextStream(transcription, onThought);
}

/**
 * Extrae deseos/necesidades del cliente a partir del contexto enriquecido.
 */
export async function extractWishesFromContext(
  transcription: TranscriptionResult,
  discovery: ContextDiscovery,
  answers: ClarificationAnswer[] = [],
  skipped = false
): Promise<{ wishes: Wish[]; enrichedContext: string }> {
  const enrichedContext = buildEnrichedContext(transcription, discovery, answers, skipped);
  const wishes = await llmAdapter.extractWishes(transcription, enrichedContext);
  return { wishes, enrichedContext };
}

/**
 * Extrae deseos emitiendo pensamientos del LLM en tiempo real.
 */
export async function extractWishesFromContextStream(
  transcription: TranscriptionResult,
  discovery: ContextDiscovery,
  onThought: LLMThoughtCallback,
  answers: ClarificationAnswer[] = [],
  skipped = false
): Promise<{ wishes: Wish[]; enrichedContext: string }> {
  const enrichedContext = buildEnrichedContext(transcription, discovery, answers, skipped);
  const wishes = await llmAdapter.extractWishesStream(transcription, enrichedContext, onThought);
  return { wishes, enrichedContext };
}
