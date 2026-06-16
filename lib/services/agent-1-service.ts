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

import type { TranscriptionResult, Wish } from '@/lib/types/agent-1';
import {
  WISH_ID_PREFIX,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from '@/lib/constants/agent-1';

import { IASRAdapter } from '@/lib/adapters/agent-1/IASRAdapter';
import { ILLMAdapter } from '@/lib/adapters/agent-1/ILLMAdapter';
import { MockASRAdapter } from '@/lib/adapters/agent-1/MockASRAdapter';
import { MockLLMAdapter } from '@/lib/adapters/agent-1/MockLLMAdapter';

// ---------------------------------------------------------------------------
// Adaptadores
// ---------------------------------------------------------------------------
// Instanciamos los adaptadores. En el futuro, se puede inyectar la API real.
const asrAdapter: IASRAdapter = new MockASRAdapter();
const llmAdapter: ILLMAdapter = new MockLLMAdapter();

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
 * Extrae deseos/necesidades del cliente a partir de la transcripción.
 */
export async function extractWishes(
  transcription: TranscriptionResult
): Promise<Wish[]> {
  return llmAdapter.extractWishes(transcription);
}
