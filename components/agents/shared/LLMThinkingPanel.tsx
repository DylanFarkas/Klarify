/**
 * @fileoverview Panel de carga con razonamiento del LLM en tiempo real.
 * Compartido entre agentes que consumen streams NDJSON del LLM.
 */

'use client';

import { useEffect, useRef } from 'react';

interface LLMThinkingPanelProps {
  title: string;
  description: string;
  thinkingText?: string;
  /** Línea contextual opcional (ej. "8 deseos · 3 épicas previas") */
  meta?: string;
}

export function LLMThinkingPanel({
  title,
  description,
  thinkingText = '',
  meta,
}: LLMThinkingPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasThinking = thinkingText.trim().length > 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [thinkingText]);

  return (
    <div className="animate-[fadeIn_0.3s_ease-out] overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border bg-primary/5 px-6 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20 opacity-60" />
            <div className="relative h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground md:text-lg">{title}</h2>
            {meta && (
              <p className="mt-0.5 text-xs font-medium text-primary/80">{meta}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 px-6 py-8 md:px-8">
        <p className="max-w-2xl text-sm leading-relaxed text-muted">{description}</p>

        {hasThinking ? (
          <div className="w-full">
            <div className="mb-3 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                Razonamiento del modelo
              </span>
            </div>
            <div
              ref={scrollRef}
              className="max-h-56 overflow-y-auto rounded-xl border border-primary/20 bg-surface-muted px-4 py-3 text-left shadow-[inset_0_1px_0_color-mix(in_srgb,var(--primary)_8%,transparent)]"
            >
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/80">
                {thinkingText}
                <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse rounded-sm bg-primary align-middle" />
              </pre>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-3">
              <div className="h-2.5 animate-pulse rounded-full bg-surface-muted" />
              <div className="h-2.5 w-[85%] animate-pulse rounded-full bg-surface-muted" />
              <div className="h-2.5 w-[65%] animate-pulse rounded-full bg-surface-muted" />
            </div>
            <p className="text-center text-xs text-muted">
              Conectando con el modelo...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
