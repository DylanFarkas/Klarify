'use client';

/**
 * @fileoverview Panel para conectar BYOK (DeepSeek / OpenAI / Gemini).
 *
 * Flujo: proveedor + API key → conectar → luego elegir modelo.
 */

import { useMemo, useState } from 'react';
import { DropdownSelect } from '@/components/ui/DropdownSelect';
import { SettingsToggle } from '@/components/agents/shared/settings/SettingsToggle';
import { useAiProvider } from '@/hooks/useAiProvider';
import {
  AI_PROVIDER_LABELS,
  defaultModelForProvider,
} from '@/lib/llm/catalog';
import type { AiProviderId } from '@/lib/llm/types';

const PROVIDERS: AiProviderId[] = ['deepseek', 'openai', 'gemini'];

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function AiProviderConnectionPanel() {
  const { status, loading, saving, error, clearError, connect, update, disconnect } =
    useAiProvider();

  const [provider, setProvider] = useState<AiProviderId>('openai');
  const [apiKey, setApiKey] = useState('');
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const connectedModelOptions = useMemo(
    () =>
      status.availableModels.map((m) => ({
        value: m.id,
        label: m.label,
      })),
    [status.availableModels]
  );

  const handleConnect = async () => {
    setLocalError(null);
    clearError();
    if (!apiKey.trim()) {
      setLocalError('Introduce tu API key para continuar');
      return;
    }
    try {
      await connect({
        provider,
        apiKey: apiKey.trim(),
        model: defaultModelForProvider(provider),
      });
      setApiKey('');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Error al conectar');
    }
  };

  const handleModelChange = async (model: string) => {
    setLocalError(null);
    clearError();
    try {
      await update({ model });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Error al cambiar el modelo');
    }
  };

  const handleToggleActive = async (active: boolean) => {
    setLocalError(null);
    clearError();
    try {
      await update({ active });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Error al actualizar');
    }
  };

  const handleDisconnect = async () => {
    setLocalError(null);
    clearError();
    try {
      await disconnect();
      setConfirmDisconnect(false);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Error al desconectar');
    }
  };

  const displayError = localError || error;
  const modelLabel =
    status.availableModels.find((m) => m.id === status.model)?.label ?? status.model;
  const connectedProviderLabel = status.provider
    ? AI_PROVIDER_LABELS[status.provider]
    : 'Proveedor';

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-elevated/40 px-4 py-6 text-sm text-subtle">
        <Spinner />
        Cargando proveedor de IA…
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-elevated/30 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-foreground">Proveedor de IA</h4>
          <p className="mt-0.5 text-xs text-subtle">
            Primero conecta tu API key; después eliges el modelo disponible.
          </p>
        </div>
      </div>

      {status.connected ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-foreground">
                {status.provider ? AI_PROVIDER_LABELS[status.provider] : 'Proveedor'}
              </span>
              <span
                className={[
                  'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                  status.active
                    ? 'bg-emerald-500/15 text-emerald-600'
                    : 'bg-border text-subtle',
                ].join(' ')}
              >
                {status.active ? 'Activo' : 'En pausa'}
              </span>
            </div>
            <p className="mt-1 text-xs text-subtle">
              {status.keyHint ? <>Key …{status.keyHint}</> : null}
              {status.keyHint ? ' · ' : null}
              Modelo actual: <span className="text-foreground">{modelLabel}</span>
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted">Modelo</label>
            <DropdownSelect
              value={status.model}
              onChange={(value) => void handleModelChange(value)}
              options={connectedModelOptions}
              placeholder="Elige un modelo"
              disabled={saving || connectedModelOptions.length === 0}
            />
            <p className="mt-1.5 text-[11px] text-subtle">
              Catálogo oficial de {connectedProviderLabel} (según tu API key).
            </p>
          </div>

          <SettingsToggle
            checked={status.active}
            onChange={(v) => void handleToggleActive(v)}
            label="Usar mi API key"
            description="Si lo desactivas, Klarify vuelve a DeepSeek por defecto. Ante fallos o cuotas de tu key, Klarify reintenta con DeepSeek."
          />

          {!confirmDisconnect ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => setConfirmDisconnect(true)}
              className="w-full cursor-pointer rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
            >
              Desconectar proveedor
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleDisconnect()}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? <Spinner /> : null}
                Confirmar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirmDisconnect(false)}
                className="flex-1 cursor-pointer rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:bg-surface-hover"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted">Proveedor</label>
            <DropdownSelect
              value={provider}
              onChange={(value) => setProvider(value as AiProviderId)}
              options={PROVIDERS.map((p) => ({
                value: p,
                label: AI_PROVIDER_LABELS[p],
              }))}
              placeholder="Proveedor"
              disabled={saving}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted">API key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-…"
              autoComplete="off"
              disabled={saving}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-primary/30 placeholder:text-subtle focus:ring-2 disabled:opacity-50"
            />
            <p className="mt-1.5 text-[11px] text-subtle">
              Tras validar la key podrás elegir el modelo.
            </p>
          </div>

          <button
            type="button"
            disabled={saving || !apiKey.trim()}
            onClick={() => void handleConnect()}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? <Spinner /> : null}
            Conectar
          </button>
        </div>
      )}

      {displayError ? (
        <p className="text-xs text-red-600" role="alert">
          {displayError}
        </p>
      ) : null}

      <p className="text-[11px] leading-relaxed text-subtle">
        Sin BYOK, Klarify usa DeepSeek del servidor. Tu key se cifra en el servidor y nunca se
        muestra completa.
      </p>
    </div>
  );
}
