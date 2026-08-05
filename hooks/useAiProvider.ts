/**
 * @fileoverview Hook cliente para estado del proveedor de IA (BYOK + modelo).
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/lib/api-client';
import type { AiProviderId, AiProviderPublicStatus } from '@/lib/llm/types';

const EMPTY_STATUS: AiProviderPublicStatus = {
  connected: false,
  active: false,
  provider: 'deepseek',
  model: 'deepseek-chat',
  keyHint: null,
  source: 'klarify',
  availableModels: [],
  klarifyModels: [],
};

export function useAiProvider() {
  const { user } = useAuth();
  const [status, setStatus] = useState<AiProviderPublicStatus>(EMPTY_STATUS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setStatus(EMPTY_STATUS);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/ai-provider', user);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'No se pudo cargar el proveedor de IA');
      }
      const data = (await res.json()) as AiProviderPublicStatus;
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const connect = useCallback(
    async (input: { provider: AiProviderId; apiKey: string; model?: string }) => {
      if (!user) throw new Error('No autenticado');
      setSaving(true);
      setError(null);
      try {
        const res = await authFetch('/api/ai-provider', user, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        const body = (await res.json().catch(() => null)) as
          | AiProviderPublicStatus
          | { error?: string }
          | null;
        if (!res.ok) {
          throw new Error(
            body && 'error' in body && body.error
              ? body.error
              : 'No se pudo conectar el proveedor'
          );
        }
        setStatus(body as AiProviderPublicStatus);
        return body as AiProviderPublicStatus;
      } finally {
        setSaving(false);
      }
    },
    [user]
  );

  const update = useCallback(
    async (patch: { model?: string; active?: boolean; provider?: AiProviderId }) => {
      if (!user) throw new Error('No autenticado');
      setSaving(true);
      setError(null);
      try {
        const res = await authFetch('/api/ai-provider', user, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        const body = (await res.json().catch(() => null)) as
          | AiProviderPublicStatus
          | { error?: string }
          | null;
        if (!res.ok) {
          throw new Error(
            body && 'error' in body && body.error
              ? body.error
              : 'No se pudo actualizar'
          );
        }
        setStatus(body as AiProviderPublicStatus);
        return body as AiProviderPublicStatus;
      } finally {
        setSaving(false);
      }
    },
    [user]
  );

  const disconnect = useCallback(async () => {
    if (!user) throw new Error('No autenticado');
    setSaving(true);
    setError(null);
    try {
      const res = await authFetch('/api/ai-provider', user, { method: 'DELETE' });
      const body = (await res.json().catch(() => null)) as
        | AiProviderPublicStatus
        | { error?: string }
        | null;
      if (!res.ok) {
        throw new Error(
          body && 'error' in body && body.error
            ? body.error
            : 'No se pudo desconectar'
        );
      }
      setStatus(body as AiProviderPublicStatus);
      return body as AiProviderPublicStatus;
    } finally {
      setSaving(false);
    }
  }, [user]);

  return {
    status,
    loading,
    saving,
    error,
    clearError: () => setError(null),
    refresh,
    connect,
    update,
    disconnect,
  };
}
