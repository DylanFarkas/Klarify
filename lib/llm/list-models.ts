/**
 * @fileoverview Listado oficial de modelos por proveedor (API /models).
 */

import 'server-only';

import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { DEEPSEEK_BASE_URL } from '@/lib/llm/catalog';
import type { AiModelInfo, AiProviderId, LlmCredentials } from '@/lib/llm/types';

/** Patrones a excluir del catálogo (no son chat de texto útil para Klarify). */
const EXCLUDE_ID_PATTERNS = [
  /embed/i,
  /whisper/i,
  /tts/i,
  /audio/i,
  /realtime/i,
  /dall-e/i,
  /image/i,
  /moderation/i,
  /transcri/i,
  /search/i,
  /computer-use/i,
  /codex/i,
  /babbage/i,
  /davinci/i,
  /ada\b/i,
  /curie/i,
  /-tts/i,
];

function looksLikeChatModel(id: string): boolean {
  const lower = id.toLowerCase();
  if (EXCLUDE_ID_PATTERNS.some((re) => re.test(lower))) return false;
  return true;
}

function humanizeModelId(id: string): string {
  return id
    .replace(/^models\//, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function supportsThoughtsGuess(id: string): boolean {
  const lower = id.toLowerCase();
  return (
    lower.includes('reasoner') ||
    lower.includes('o1') ||
    lower.includes('o3') ||
    lower.includes('o4') ||
    lower.includes('thinking') ||
    /gemini-2\.5/.test(lower)
  );
}

function toModelInfo(provider: AiProviderId, id: string): AiModelInfo {
  const cleanId = id.replace(/^models\//, '');
  return {
    id: cleanId,
    label: humanizeModelId(cleanId),
    provider,
    supportsThoughts: supportsThoughtsGuess(cleanId),
  };
}

async function listOpenAiProtocolModels(
  provider: 'openai' | 'deepseek',
  apiKey: string
): Promise<AiModelInfo[]> {
  const client = new OpenAI({
    apiKey,
    ...(provider === 'deepseek' ? { baseURL: DEEPSEEK_BASE_URL } : {}),
  });

  const ids: string[] = [];
  for await (const model of client.models.list()) {
    if (looksLikeChatModel(model.id)) {
      ids.push(model.id);
    }
  }

  ids.sort((a, b) => a.localeCompare(b));

  return ids.map((id) => toModelInfo(provider, id));
}

async function listGeminiModels(apiKey: string): Promise<AiModelInfo[]> {
  const ai = new GoogleGenAI({ apiKey });
  const pager = await ai.models.list({
    config: { pageSize: 100, queryBase: true },
  });
  const ids: string[] = [];

  for await (const model of pager) {
    const raw = typeof model.name === 'string' ? model.name : '';
    if (!raw) continue;
    const id = raw.replace(/^models\//, '');
    if (!/^gemini/i.test(id)) continue;
    if (/embed/i.test(id)) continue;
    if (!looksLikeChatModel(id)) continue;
    ids.push(id);
  }

  ids.sort((a, b) => a.localeCompare(b));
  return ids.map((id) => toModelInfo('gemini', id));
}

/**
 * Consulta el catálogo oficial del proveedor con la API key dada.
 */
export async function listOfficialModels(
  credentials: Pick<LlmCredentials, 'provider' | 'apiKey'>
): Promise<AiModelInfo[]> {
  switch (credentials.provider) {
    case 'openai':
      return listOpenAiProtocolModels('openai', credentials.apiKey);
    case 'deepseek':
      return listOpenAiProtocolModels('deepseek', credentials.apiKey);
    case 'gemini':
      return listGeminiModels(credentials.apiKey);
    default:
      throw new Error(`Proveedor no soportado: ${String(credentials.provider)}`);
  }
}

export function pickDefaultFromOfficial(
  models: AiModelInfo[],
  preferredIds: string[]
): string {
  for (const preferred of preferredIds) {
    if (models.some((m) => m.id === preferred)) return preferred;
  }
  return models[0]?.id ?? preferredIds[0] ?? 'deepseek-chat';
}
