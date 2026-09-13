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
  const connectedProviderLabel = status.provider
    ? AI_PROVIDER_LABELS[status.provider]
    : 'Proveedor';

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-muted">
        <Spinner />
        Cargando proveedor de IA…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-[13px] font-medium text-foreground">
            {status.connected ? connectedProviderLabel : 'Proveedor de IA'}
          </h4>
          <p className="mt-0.5 text-[12px] text-muted">
            {status.connected
              ? status.keyHint
                ? `Key …${status.keyHint}`
                : 'API key conectada'
              : 'Conecta tu API key y elige el modelo disponible.'}
          </p>
        </div>
        {status.connected ? (
          <span
            className={[
              'inline-flex shrink-0 items-center gap-1.5 pt-1 text-[11px] font-medium',
              status.active ? 'text-success' : 'text-subtle',
            ].join(' ')}
          >
            <span
              className={[
                'h-1.5 w-1.5 rounded-full',
                status.active ? 'bg-success' : 'bg-border-strong',
              ].join(' ')}
              aria-hidden="true"
            />
            {status.active ? 'Activo' : 'En pausa'}
          </span>
        ) : null}
      </div>

      {status.connected ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-muted">Modelo</label>
            <DropdownSelect
              value={
                connectedModelOptions.some((o) => o.value === status.model)
                  ? status.model
                  : connectedModelOptions[0]?.value ?? status.model
              }
              onChange={(value) => void handleModelChange(value)}
              options={connectedModelOptions}
              placeholder={
                connectedModelOptions.length === 0
                  ? 'Sin modelos en tu catálogo'
                  : 'Elige un modelo'
              }
              disabled={
                saving ||
                !status.active ||
                connectedModelOptions.length === 0
              }
            />
            {!status.active ? (
              <p className="mt-1.5 text-[11px] text-subtle">
                Reactiva tu API key para cambiar el modelo BYOK. En pausa, Klarify usa DeepSeek del
                servidor si está configurado.
              </p>
            ) : null}
          </div>

          <SettingsToggle
            checked={status.active}
            onChange={(v) => void handleToggleActive(v)}
            label="Usar mi API key"
            description="Si lo desactivas, Klarify vuelve a DeepSeek. Ante fallos o cuotas de tu key, reintenta con DeepSeek."
            className="py-0.5"
          />

          {!confirmDisconnect ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => setConfirmDisconnect(true)}
              className="cursor-pointer text-[12px] font-medium text-muted transition-colors hover:text-danger disabled:opacity-40"
            >
              Desconectar proveedor
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[12px] text-muted">¿Desconectar {connectedProviderLabel}?</p>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleDisconnect()}
                className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-danger hover:underline disabled:opacity-40"
              >
                {saving ? <Spinner className="h-3.5 w-3.5" /> : null}
                Confirmar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirmDisconnect(false)}
                className="cursor-pointer text-[12px] text-subtle hover:text-foreground"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-muted">Proveedor</label>
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
            <label className="mb-1.5 block text-[12px] font-medium text-muted">API key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-…"
              autoComplete="off"
              disabled={saving}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none placeholder:text-placeholder focus:border-border-strong disabled:opacity-40"
            />
          </div>

          <button
            type="button"
            disabled={saving || !apiKey.trim()}
            onClick={() => void handleConnect()}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {saving ? <Spinner /> : null}
            Conectar
          </button>
        </div>
      )}

      {displayError ? (
        <p className="text-xs text-danger" role="alert">
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
