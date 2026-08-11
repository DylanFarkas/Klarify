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
let klarifyModelsRefresh: Promise<void> | null = null;

async function refreshKlarifyModelsInBackground(): Promise<void> {
  if (klarifyModelsRefresh) return klarifyModelsRefresh;
  klarifyModelsRefresh = (async () => {
    try {
      const apiKey = getKlarifyDeepSeekKey();
      if (!apiKey) {
        klarifyModelsMemory = { at: Date.now(), models: [] };
        return;
      }
      const models = await fetchModelsSafe('deepseek', apiKey);
      klarifyModelsMemory = { at: Date.now(), models };
    } catch (error) {
      console.error('[getKlarifyOfficialModels] background refresh:', error);
    } finally {
      klarifyModelsRefresh = null;
    }
  })();
  return klarifyModelsRefresh;
}

/**
 * Modelos oficiales Klarify. Sin DEEPSEEK_API_KEY → lista vacía (no inventar catálogo).
 * Con `nonBlocking`, no espera la API externa: usa caché/fallback y refresca en background.
 */
async function getKlarifyOfficialModels(options?: {
  nonBlocking?: boolean;
}): Promise<AiModelInfo[]> {
  if (!getKlarifyDeepSeekKey()) {
    return [];
  }
  if (klarifyModelsMemory && Date.now() - klarifyModelsMemory.at < MODELS_CACHE_TTL_MS) {
    return klarifyModelsMemory.models;
  }
  if (options?.nonBlocking) {
    void refreshKlarifyModelsInBackground();
    return klarifyModelsMemory?.models ?? klarifyFallbackModels();
  }
  const apiKey = getKlarifyDeepSeekKey();
  if (!apiKey) return [];
  const models = await fetchModelsSafe('deepseek', apiKey);
  klarifyModelsMemory = { at: Date.now(), models };
  return models;
}

function readUserAiFields(data: Record<string, unknown> | undefined): {
  stored: StoredAiProvider | null;
  klarifyPref: string | null;
} {
  const stored = normalizeStored(data?.aiProvider as Partial<StoredAiProvider> | undefined);
  const pref = data?.aiModelPreference;
  const klarifyPref =
    typeof pref === 'string' && isPlausibleModelId(pref) ? pref.trim() : null;
  return { stored, klarifyPref };
}

function credentialsFromStored(
  stored: StoredAiProvider | null,
  klarifyPref: string | null
): LlmCredentials | null {
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

  const model = klarifyPref ?? DEFAULT_KLARIFY_MODEL;
  return klarifyDefaultCredentials(model);
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
  const snapshot = await userDoc(uid).get();
  const { stored, klarifyPref } = readUserAiFields(snapshot.data() as Record<string, unknown> | undefined);
  return credentialsFromStored(stored, klarifyPref);
}

async function resolveAvailableModels(
  uid: string,
  stored: StoredAiProvider | null,
  options?: { nonBlocking?: boolean }
): Promise<{ available: AiModelInfo[]; klarify: AiModelInfo[] }> {
  const klarify = await getKlarifyOfficialModels({ nonBlocking: options?.nonBlocking });

  // BYOK conectado (activo o en pausa): catálogo de la key del usuario.
  // No sustituir por fallbacks Klarify — provoca "Modelo no válido" al elegir.
  if (stored?.apiKeyEncrypted) {
    if (cacheIsFresh(stored.modelsCachedAt) && stored.cachedModels?.length) {
      return { available: stored.cachedModels, klarify };
    }
    if (options?.nonBlocking) {
      void (async () => {
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
        } catch (error) {
          console.error('[resolveAvailableModels] BYOK background:', error);
        }
      })();
      return {
        available: stored.cachedModels?.length
          ? stored.cachedModels
          : [],
        klarify,
      };
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
        available: stored.cachedModels?.length ? stored.cachedModels : [],
        klarify,
      };
    }
  }

  // Sin BYOK: solo modelos Klarify si hay DEEPSEEK_API_KEY en el servidor.
  return { available: klarify, klarify };
}

export async function getAiProviderPublicStatus(
  uid: string
): Promise<AiProviderPublicStatus> {
  const snapshot = await userDoc(uid).get();
  const { stored, klarifyPref } = readUserAiFields(snapshot.data() as Record<string, unknown> | undefined);
  const credentials = credentialsFromStored(stored, klarifyPref);

  const connected = Boolean(stored?.apiKeyEncrypted);
  const active = Boolean(stored?.active && connected);
  const hasKlarify = hasKlarifyDefaultLlm();

  const { available, klarify } = await resolveAvailableModels(uid, stored, {
    nonBlocking: true,
  });

  // availableModels: catálogo BYOK si hay key conectada (activo o pausa);
  // si no, catálogo Klarify (vacío sin DEEPSEEK_API_KEY).
  const availableModels = connected ? available : klarify;

  let model: string;
  if (active && stored) {
    model = stored.model;
  } else if (credentials?.model) {
    model = credentials.model;
  } else if (klarifyPref && (klarify.length === 0 || klarify.some((m) => m.id === klarifyPref))) {
    model = klarifyPref;
  } else if (hasKlarify) {
    model = DEFAULT_KLARIFY_MODEL;
  } else {
    model = connected && stored ? stored.model : '';
  }

  return {
    connected,
    active,
    provider: active && stored
      ? stored.provider
      : credentials?.provider ?? (hasKlarify ? 'deepseek' : connected && stored ? stored.provider : null),
    model,
    keyHint: connected && stored ? stored.keyHint : null,
    source: active ? 'byok' : 'klarify',
    availableModels,
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

  // Sin BYOK: solo preferencia Klarify (requiere catálogo real si hay key de servidor).
  if (!stored?.apiKeyEncrypted) {
    if (typeof patch.model === 'string') {
      if (!isPlausibleModelId(patch.model)) {
        throw new Error('INVALID_MODEL');
      }
      if (!hasKlarifyDefaultLlm()) {
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

  // Solo pausar/activar BYOK: no tocar ni validar modelo.
  if (
    typeof patch.active === 'boolean' &&
    patch.model === undefined &&
    patch.provider === undefined
  ) {
    await userDoc(uid).set(
      {
        aiProvider: {
          ...stored,
          active: patch.active,
        },
      },
      { merge: true }
    );
    return getAiProviderPublicStatus(uid);
  }

  // En pausa + cambio de modelo → preferencia Klarify (no validar contra catálogo BYOK).
  if (!stored.active && typeof patch.model === 'string' && patch.active === undefined) {
    if (!isPlausibleModelId(patch.model)) {
      throw new Error('INVALID_MODEL');
    }
    if (!hasKlarifyDefaultLlm()) {
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
