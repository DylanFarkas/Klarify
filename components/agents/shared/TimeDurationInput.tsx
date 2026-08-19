'use client';

import { useEffect, useState } from 'react';
import { TIME_DURATION_EXAMPLES } from '@/lib/constants/agent-3';
import { DurationParseError, parseDurationLabel } from '@/lib/utils/estimation';

interface TimeDurationInputProps {
  value: string;
  onCommit: (label: string, minutes: number) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  placeholder?: string;
  /** Compacto para tablas densas (alineado con DropdownSelect compact). */
  size?: 'default' | 'compact';
}

export function TimeDurationInput({
  value,
  onCommit,
  disabled = false,
  id,
  className,
  placeholder = TIME_DURATION_EXAMPLES,
  size = 'default',
}: TimeDurationInputProps) {
  const isCompact = size === 'compact';
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(value);
    setError(null);
  }, [value]);

  const commit = () => {
    if (disabled) return;
    const trimmed = draft.trim();
    if (!trimmed) {
      setError('Escribe una duración (2d, 3h, 50m, 2.5h).');
      return;
    }
    try {
      const parsed = parseDurationLabel(trimmed);
      setDraft(parsed.label);
      setError(null);
      onCommit(parsed.label, parsed.minutes);
    } catch (err) {
      setError(
        err instanceof DurationParseError
          ? err.message
          : 'Formato inválido. Ejemplos: 2d, 3h, 50m, 2.5h.'
      );
    }
  };

  return (
    <div className={className}>
      <input
        id={id}
        type="text"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        value={draft}
        placeholder={placeholder}
        title={error ?? undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error && !isCompact ? `${id ?? 'duration'}-error` : undefined}
        onChange={(e) => {
          setDraft(e.target.value);
          if (error) setError(null);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        className={[
          'w-full min-w-0 tabular-nums text-foreground outline-none transition-colors',
          'placeholder:text-placeholder disabled:cursor-not-allowed disabled:opacity-40',
          isCompact
            ? 'rounded-lg border border-border bg-surface px-1.5 py-1 text-xs font-bold focus:border-border-strong'
            : 'rounded-lg border border-input-border bg-input px-3 py-2 text-sm focus:border-border-strong',
          error ? 'border-danger focus:border-danger' : '',
        ].join(' ')}
      />
      {error && !isCompact ? (
        <p id={`${id ?? 'duration'}-error`} className="mt-1 text-[11px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
