'use client';

/**
 * @fileoverview Selector rápido de modelo de IA (siempre accesible en el workspace).
 */

import { useMemo } from 'react';
import { DropdownSelect } from '@/components/ui/DropdownSelect';
import { useAiProvider } from '@/hooks/useAiProvider';
import { AI_PROVIDER_LABELS } from '@/lib/llm/catalog';

interface AiModelPickerProps {
  className?: string;
  compact?: boolean;
}

export function AiModelPicker({ className = '', compact = false }: AiModelPickerProps) {
  const { status, loading, saving, update, error } = useAiProvider();

  const options = useMemo(() => {
    const models =
      status.availableModels.length > 0
        ? status.availableModels
        : status.klarifyModels;
    return models.map((m) => ({
      value: m.id,
      label: m.label,
    }));
  }, [status.availableModels, status.klarifyModels]);

  const providerLabel =
    status.provider && status.provider in AI_PROVIDER_LABELS
      ? AI_PROVIDER_LABELS[status.provider]
      : 'IA';

  const handleChange = (model: string) => {
    void update({ model });
  };

  if (loading && options.length === 0) {
    return (
      <div
        className={[
          'rounded-lg border border-border bg-surface px-2 py-2 text-xs text-muted',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        Cargando modelos…
      </div>
    );
  }

  return (
    <div className={['space-y-1.5', className].filter(Boolean).join(' ')}>
      {!compact ? (
        <div className="flex items-center justify-between gap-2 px-0.5">
          <span className="text-[11px] font-medium text-subtle">
            Modelo de IA
          </span>
          <span className="truncate text-[10px] text-subtle">
            {status.source === 'byok' ? `${providerLabel} · BYOK` : 'Klarify · DeepSeek'}
          </span>
        </div>
      ) : null}

      <DropdownSelect
        value={status.model}
        onChange={handleChange}
        options={options.length > 0 ? options : [{ value: status.model, label: status.model }]}
        placeholder="Modelo"
        disabled={saving || options.length === 0}
      />

      {error ? (
        <p className="text-[10px] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
