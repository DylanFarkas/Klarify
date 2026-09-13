/**
 * @fileoverview Constantes y fallbacks de proveedores (sin catálogo hardcodeado de modelos).
 *
 * Los modelos disponibles se obtienen en runtime vía `listOfficialModels`.
 */

import type { AiModelInfo, AiProviderId } from '@/lib/llm/types';

export const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

export const DEFAULT_KLARIFY_MODEL = 'deepseek-chat';

/** Preferencias de fallback Klarify si el listado oficial falla. */
export const KLARIFY_FALLBACK_MODELS = [
  'deepseek-chat',
  'deepseek-reasoner',
] as const;

export const AI_PROVIDER_LABELS: Record<AiProviderId, string> = {
  deepseek: 'DeepSeek',
  openai: 'OpenAI',
  gemini: 'Google Gemini',
};

/** Preferidos al conectar / si el listado oficial aún no eligió modelo. */
export const PREFERRED_MODELS: Record<AiProviderId, string[]> = {
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1'],
  gemini: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro'],
};

/** Fallback mínimo si la API de modelos no responde. */
export function fallbackModelsForProvider(provider: AiProviderId): AiModelInfo[] {
  return PREFERRED_MODELS[provider].map((id) => ({
    id,
    label: id,
    provider,
    supportsThoughts:
      id.includes('reasoner') || id.includes('2.5') || id.startsWith('o'),
  }));
}

export function klarifyFallbackModels(): AiModelInfo[] {
  return fallbackModelsForProvider('deepseek');
}

export function defaultModelForProvider(provider: AiProviderId): string {
  return PREFERRED_MODELS[provider][0] ?? DEFAULT_KLARIFY_MODEL;
}

export function isAiProviderId(value: unknown): value is AiProviderId {
  return value === 'deepseek' || value === 'openai' || value === 'gemini';
}

/** Ya no validamos contra un catálogo fijo: cualquier id no vacío es candidato. */
export function isPlausibleModelId(model: string): boolean {
  return typeof model === 'string' && model.trim().length > 0 && model.length < 200;
}
