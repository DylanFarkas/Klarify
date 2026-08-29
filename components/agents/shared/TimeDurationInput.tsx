'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  variant?: 'default' | 'ghost';
}

export function TimeDurationInput({
  value,
  onCommit,
  disabled = false,
  id,
  className,
  placeholder = TIME_DURATION_EXAMPLES,
  size = 'default',
  variant = 'default',
}: TimeDurationInputProps) {
  const isCompact = size === 'compact';
  const isGhost = variant === 'ghost';
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = `${id ?? 'duration'}-error`;
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [errorPos, setErrorPos] = useState({ top: 0, left: 0 });

  const updateErrorPosition = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setErrorPos({
      top: rect.bottom + 4,
      left: rect.left,
    });
  }, []);

  useEffect(() => {
    setDraft(value);
    setError(null);
  }, [value]);

  useEffect(() => {
    if (!error || !isCompact) return;
    updateErrorPosition();
    window.addEventListener('scroll', updateErrorPosition, true);
    window.addEventListener('resize', updateErrorPosition);
    return () => {
      window.removeEventListener('scroll', updateErrorPosition, true);
      window.removeEventListener('resize', updateErrorPosition);
    };
  }, [error, isCompact, updateErrorPosition]);

  const showError = (message: string) => {
    setError(message);
    if (isCompact) {
      requestAnimationFrame(updateErrorPosition);
    }
  };

  const commit = () => {
    if (disabled) return;
    const trimmed = draft.trim();
    if (!trimmed) {
      showError('Escribe una duración (2d, 3h, 50m, 2.5h).');
      return;
    }
    try {
      const parsed = parseDurationLabel(trimmed);
      setDraft(parsed.label);
      setError(null);
      onCommit(parsed.label, parsed.minutes);
    } catch (err) {
      showError(
        err instanceof DurationParseError
          ? err.message
          : 'Formato inválido. Ejemplos: 2d, 3h, 50m, 2.5h.'
      );
    }
  };

  return (
    <div className={['relative', className].filter(Boolean).join(' ')}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        value={draft}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
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
          isGhost
            ? 'h-8 rounded-md border-0 bg-transparent px-2 text-sm hover:bg-surface-hover focus:bg-surface-hover'
            : isCompact
              ? 'rounded-lg border border-border bg-surface px-1.5 py-1 text-xs font-bold focus:border-border-strong'
              : 'rounded-lg border border-input-border bg-input px-3 py-2 text-sm focus:border-border-strong',
          error ? 'border-danger bg-danger/5 focus:border-danger' : '',
        ].join(' ')}
      />
      {error && !isCompact ? (
        <p id={errorId} role="alert" className="mt-1 text-[11px] text-danger">
          {error}
        </p>
      ) : null}
      {error && isCompact && typeof document !== 'undefined'
        ? createPortal(
            <p
              id={errorId}
              role="alert"
              className="fixed z-9999 w-max max-w-55 rounded-md border border-danger/30 bg-surface px-2 py-1 text-[10px] leading-snug text-danger shadow-lg"
              style={{ top: errorPos.top, left: errorPos.left }}
            >
              {error}
            </p>,
            document.body
          )
        : null}
    </div>
  );
}
