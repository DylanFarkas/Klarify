/**
 * @fileoverview Persistencia y resolución de credenciales IA (BYOK + default Klarify).
 * Catálogo de modelos: API oficial del proveedor (con cache corto).
 */

import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import {
  DEFAULT_KLARIFY_MODEL,
  defaultModelForProvider,
  fallbackModelsForProvider,
  isAiProviderId,
  isPlausibleModelId,
  klarifyFallbackModels,
  PREFERRED_MODELS,
} from '@/lib/llm/catalog';
import {
  decryptSecret,
  encryptSecret,
  hasEncryptionKeyConfigured,
  keyHintFromApiKey,
} from '@/lib/llm/crypto';
import { klarifyDefaultCredentials, getKlarifyDeepSeekKey, hasKlarifyDefaultLlm } from '@/lib/llm/fallback';
import { validateLlmCredentials } from '@/lib/llm/generate';
import {
  listOfficialModels,
  pickDefaultFromOfficial,
} from '@/lib/llm/list-models';
import type {
  AiModelInfo,
  AiProviderId,
  AiProviderPublicStatus,
  LlmCredentials,
  StoredAiProvider,
} from '@/lib/llm/types';

const MODELS_CACHE_TTL_MS = 60 * 60 * 1000; // 1h

function userDoc(uid: string) {
  return adminDb.collection('users').doc(uid);
}

function normalizeStored(
  raw: Partial<StoredAiProvider> | undefined
): StoredAiProvider | null {
  if (!raw || typeof raw !== 'object') return null;
  if (!isAiProviderId(raw.provider)) return null;
  if (typeof raw.model !== 'string' || !raw.model.trim()) return null;
  if (typeof raw.apiKeyEncrypted !== 'string' || !raw.apiKeyEncrypted) return null;

  const cachedModels = Array.isArray(raw.cachedModels)
    ? (raw.cachedModels as AiModelInfo[]).filter(
        (m) => m && typeof m.id === 'string' && typeof m.label === 'string'
      )
    : undefined;

  return {
    active: Boolean(raw.active),
    provider: raw.provider,
    model: raw.model.trim(),
    apiKeyEncrypted: raw.apiKeyEncrypted,
    keyHint: typeof raw.keyHint === 'string' ? raw.keyHint : '****',
    connectedAt: raw.connectedAt,
    cachedModels,
    modelsCachedAt:
      typeof raw.modelsCachedAt === 'string' ? raw.modelsCachedAt : undefined,
  };
}

function cacheIsFresh(cachedAt: string | undefined): boolean {
  if (!cachedAt) return false;
  const ts = Date.parse(cachedAt);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < MODELS_CACHE_TTL_MS;
}

async function fetchModelsSafe(
  provider: AiProviderId,
  apiKey: string
): Promise<AiModelInfo[]> {
  try {
    const models = await listOfficialModels({ provider, apiKey });
    if (models.length > 0) return models;
  } catch (error) {
    console.error(`[listOfficialModels] ${provider}:`, error);
  }
  return fallbackModelsForProvider(provider);
}

let klarifyModelsMemory: { at: number; models: AiModelInfo[] } | null = null;

async function getKlarifyOfficialModels(): Promise<AiModelInfo[]> {
  if (klarifyModelsMemory && Date.now() - klarifyModelsMemory.at < MODELS_CACHE_TTL_MS) {
    return klarifyModelsMemory.models;
  }
  const apiKey = getKlarifyDeepSeekKey();
  if (!apiKey) return klarifyFallbackModels();
  const models = await fetchModelsSafe('deepseek', apiKey);
  klarifyModelsMemory = { at: Date.now(), models };
  return models;
}

export async function getStoredAiProvider(
  uid: string
): Promise<StoredAiProvider | null> {
  const snapshot = await userDoc(uid).get();
  return normalizeStored(snapshot.data()?.aiProvider as Partial<StoredAiProvider> | undefined);
}

/**
 * Resuelve credenciales efectivas para una petición de agente/Klark.
 */
export async function resolveLlmCredentials(
  uid: string
): Promise<LlmCredentials | null> {
  const stored = await getStoredAiProvider(uid);

  if (stored?.active && stored.apiKeyEncrypted) {
    try {
      const apiKey = decryptSecret(stored.apiKeyEncrypted);
      return {
        provider: stored.provider,
        model: isPlausibleModelId(stored.model)
          ? stored.model
          : defaultModelForProvider(stored.provider),
        apiKey,
        source: 'byok',
      };
    } catch (error) {
      console.error('[resolveLlmCredentials] No se pudo descifrar BYOK:', error);
    }
  }

  const klarifyPref = await getKlarifyModelPreference(uid);
  const model = klarifyPref ?? DEFAULT_KLARIFY_MODEL;
  return klarifyDefaultCredentials(model);
}

async function getKlarifyModelPreference(uid: string): Promise<string | null> {
  const snapshot = await userDoc(uid).get();
  const pref = snapshot.data()?.aiModelPreference;
  if (typeof pref === 'string' && isPlausibleModelId(pref)) {
    return pref.trim();
  }
  return null;
}

async function resolveAvailableModels(
  uid: string,
  stored: StoredAiProvider | null,
  active: boolean
): Promise<{ available: AiModelInfo[]; klarify: AiModelInfo[] }> {
  const klarify = await getKlarifyOfficialModels();

  if (active && stored?.apiKeyEncrypted) {
    if (cacheIsFresh(stored.modelsCachedAt) && stored.cachedModels?.length) {
      return { available: stored.cachedModels, klarify };
    }
    try {
      const apiKey = decryptSecret(stored.apiKeyEncrypted);
      const models = await fetchModelsSafe(stored.provider, apiKey);
      await userDoc(uid).set(
        {
          aiProvider: {
            ...stored,
            cachedModels: models,
            modelsCachedAt: new Date().toISOString(),
          },
        },
        { merge: true }
      );
      return { available: models, klarify };
    } catch (error) {
      console.error('[resolveAvailableModels] BYOK:', error);
      return {
        available: stored.cachedModels?.length
          ? stored.cachedModels
          : fallbackModelsForProvider(stored.provider),
        klarify,
      };
    }
  }

  return { available: klarify, klarify };
}

export async function getAiProviderPublicStatus(
  uid: string
): Promise<AiProviderPublicStatus> {
  const stored = await getStoredAiProvider(uid);
  const klarifyPref = await getKlarifyModelPreference(uid);
  const credentials = await resolveLlmCredentials(uid);

  const connected = Boolean(stored?.apiKeyEncrypted);
  const active = Boolean(stored?.active && connected);

  const { available, klarify } = await resolveAvailableModels(uid, stored, active);

  return {
    connected,
    active,
    provider: active && stored ? stored.provider : credentials?.provider ?? 'deepseek',
    model:
      credentials?.model ??
      klarifyPref ??
      DEFAULT_KLARIFY_MODEL,
    keyHint: connected && stored ? stored.keyHint : null,
    source: active ? 'byok' : 'klarify',
    availableModels: available,
    klarifyModels: klarify,
  };
}

export async function connectAiProvider(
  uid: string,
  input: { provider: AiProviderId; apiKey: string; model?: string }
): Promise<AiProviderPublicStatus> {
  if (!hasEncryptionKeyConfigured()) {
    throw new Error('AI_PROVIDER_ENCRYPTION_KEY_MISSING');
  }

  const apiKey = input.apiKey.trim();
  if (!apiKey) {
    throw new Error('API_KEY_REQUIRED');
  }

  const models = await fetchModelsSafe(input.provider, apiKey);
  const model =
    input.model && models.some((m) => m.id === input.model)
      ? input.model
      : pickDefaultFromOfficial(models, PREFERRED_MODELS[input.provider]);

  const credentials: LlmCredentials = {
    provider: input.provider,
    model,
    apiKey,
    source: 'byok',
  };

  try {
    await validateLlmCredentials(credentials);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'validación fallida';
    throw new Error(`API_KEY_INVALID:${msg}`);
  }

  const encrypted = encryptSecret(apiKey);
  const hint = keyHintFromApiKey(apiKey);

  await userDoc(uid).set(
    {
      aiProvider: {
        active: true,
        provider: input.provider,
        model,
        apiKeyEncrypted: encrypted,
        keyHint: hint,
        connectedAt: FieldValue.serverTimestamp(),
        cachedModels: models,
        modelsCachedAt: new Date().toISOString(),
      },
    },
    { merge: true }
  );

  return getAiProviderPublicStatus(uid);
}

export async function updateAiProvider(
  uid: string,
  patch: { model?: string; active?: boolean; provider?: AiProviderId }
): Promise<AiProviderPublicStatus> {
  const stored = await getStoredAiProvider(uid);

  if (!stored?.apiKeyEncrypted) {
    if (typeof patch.model === 'string') {
      if (!isPlausibleModelId(patch.model)) {
        throw new Error('INVALID_MODEL');
      }
      const klarify = await getKlarifyOfficialModels();
      if (klarify.length > 0 && !klarify.some((m) => m.id === patch.model)) {
        throw new Error('INVALID_MODEL');
      }
      await userDoc(uid).set(
        { aiModelPreference: patch.model.trim() },
        { merge: true }
      );
      return getAiProviderPublicStatus(uid);
    }
    throw new Error('AI_PROVIDER_NOT_CONNECTED');
  }

  const nextProvider = patch.provider ?? stored.provider;
  if (!isAiProviderId(nextProvider)) {
    throw new Error('INVALID_PROVIDER');
  }

  let nextModel = patch.model ?? stored.model;
  if (!isPlausibleModelId(nextModel)) {
    nextModel = defaultModelForProvider(nextProvider);
  }

  if (patch.model && stored.cachedModels?.length) {
    if (!stored.cachedModels.some((m) => m.id === patch.model)) {
      throw new Error('INVALID_MODEL');
    }
  }

  const nextActive =
    typeof patch.active === 'boolean' ? patch.active : stored.active;

  await userDoc(uid).set(
    {
      aiProvider: {
        ...stored,
        provider: nextProvider,
        model: nextModel,
        active: nextActive,
      },
      ...(nextProvider === 'deepseek' ? { aiModelPreference: nextModel } : {}),
    },
    { merge: true }
  );

  return getAiProviderPublicStatus(uid);
}

export async function disconnectAiProvider(
  uid: string
): Promise<AiProviderPublicStatus> {
  await userDoc(uid).set(
    {
      aiProvider: FieldValue.delete(),
    },
    { merge: true }
  );
  return getAiProviderPublicStatus(uid);
}

export function canUseRealLlm(credentials: LlmCredentials | null): boolean {
  return Boolean(credentials?.apiKey);
}

export { hasKlarifyDefaultLlm, isAiProviderId, isPlausibleModelId };
