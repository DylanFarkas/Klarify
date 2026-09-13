/**
 * @fileoverview generateJson / streamGenerate multi-proveedor con fallback.
 */

import { deepseekGenerate, deepseekValidateKey } from '@/lib/llm/clients/deepseek';
import { geminiGenerate, geminiValidateKey } from '@/lib/llm/clients/gemini';
import { openaiGenerate, openaiValidateKey } from '@/lib/llm/clients/openai';
import { buildFallbackChain, isRecoverableLlmError } from '@/lib/llm/fallback';
import type { LlmCredentials, LlmGenerateOptions, LlmGenerateResult } from '@/lib/llm/types';

async function generateOnce(
  credentials: LlmCredentials,
  options: LlmGenerateOptions
): Promise<string> {
  switch (credentials.provider) {
    case 'gemini':
      return geminiGenerate(credentials, options);
    case 'deepseek':
      return deepseekGenerate(credentials, options);
    case 'openai':
      return openaiGenerate(credentials, options);
    default:
      throw new Error(`Proveedor no soportado: ${String(credentials.provider)}`);
  }
}

/**
 * Genera texto (opcionalmente JSON) con la credencial primaria y, ante fallos
 * recuperables (o cualquier fallo BYOK), reintenta con DeepSeek de Klarify.
 */
export async function streamGenerate(
  credentials: LlmCredentials,
  options: LlmGenerateOptions
): Promise<LlmGenerateResult> {
  const fallbacks = buildFallbackChain(credentials);
  const chain: LlmCredentials[] = [credentials, ...fallbacks];
  let lastError: unknown;

  for (let i = 0; i < chain.length; i++) {
    const current = chain[i];
    try {
      if (i > 0) {
        options.onThought?.(
          `Reintentando con ${current.provider}/${current.model} (Klarify)…`
        );
      }
      const text = await generateOnce(current, options);
      if (!text.trim()) {
        throw new Error('Respuesta vacía del modelo');
      }
      return {
        text,
        usedFallback: i > 0,
        credentials: current,
      };
    } catch (error) {
      lastError = error;
      const hasMore = i < chain.length - 1;
      const shouldRetry =
        hasMore &&
        (credentials.source === 'byok' || isRecoverableLlmError(error));
      if (!shouldRetry) break;
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : 'Error desconocido del modelo';
  throw new Error(`Error en el servicio de IA: ${message}`);
}

export async function generateJson(
  credentials: LlmCredentials,
  options: Omit<LlmGenerateOptions, 'json'>
): Promise<LlmGenerateResult> {
  return streamGenerate(credentials, { ...options, json: true });
}

export async function validateLlmCredentials(
  credentials: LlmCredentials
): Promise<void> {
  switch (credentials.provider) {
    case 'gemini':
      await geminiValidateKey(credentials);
      return;
    case 'deepseek':
      await deepseekValidateKey(credentials);
      return;
    case 'openai':
      await openaiValidateKey(credentials);
      return;
    default:
      throw new Error(`Proveedor no soportado: ${String(credentials.provider)}`);
  }
}
