/**
 * @fileoverview Detección de errores recuperables y cadena de fallback DeepSeek.
 */

import {
  DEFAULT_KLARIFY_MODEL,
  KLARIFY_FALLBACK_MODELS,
} from '@/lib/llm/catalog';
import type { LlmCredentials } from '@/lib/llm/types';

export function isRecoverableLlmError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const status =
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number'
      ? (error as { status: number }).status
      : null;

  if (status === 401 || status === 403 || status === 429 || status === 503) {
    return true;
  }

  const patterns = [
    'rate limit',
    'rate_limit',
    'quota',
    'insufficient_quota',
    'exceeded',
    'billing',
    'invalid api key',
    'incorrect api key',
    'authentication',
    'unauthorized',
    'forbidden',
    'overloaded',
    'unavailable',
    'timeout',
    'econnreset',
    'fetch failed',
    'network',
    '429',
    '401',
    '403',
    '503',
  ];

  return patterns.some((p) => message.includes(p));
}

export function getKlarifyDeepSeekKey(): string | null {
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  return key || null;
}

export function hasKlarifyDefaultLlm(): boolean {
  return Boolean(getKlarifyDeepSeekKey());
}

/** Credenciales default de Klarify (DeepSeek). */
export function klarifyDefaultCredentials(
  model: string = DEFAULT_KLARIFY_MODEL
): LlmCredentials | null {
  const apiKey = getKlarifyDeepSeekKey();
  if (!apiKey) return null;
  const safeModel = (KLARIFY_FALLBACK_MODELS as readonly string[]).includes(model)
    ? model
    : DEFAULT_KLARIFY_MODEL;
  return {
    provider: 'deepseek',
    model: safeModel,
    apiKey,
    source: 'klarify',
  };
}

/**
 * Cadena de credenciales a probar tras un fallo.
 * Si el intento actual era BYOK → pasa a DeepSeek Klarify.
 * Si ya era Klarify → prueba otros modelos DeepSeek.
 */
export function buildFallbackChain(
  failed: LlmCredentials
): LlmCredentials[] {
  const apiKey = getKlarifyDeepSeekKey();
  if (!apiKey) return [];

  const models =
    failed.source === 'klarify'
      ? KLARIFY_FALLBACK_MODELS.filter((m) => m !== failed.model)
      : [...KLARIFY_FALLBACK_MODELS];

  return models.map((model) => ({
    provider: 'deepseek' as const,
    model,
    apiKey,
    source: 'klarify' as const,
  }));
}
