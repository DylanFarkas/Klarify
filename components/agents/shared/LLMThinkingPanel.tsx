/**
 * @fileoverview Panel de carga con log de actividad del agente en tiempo real.
 * Compartido entre agentes que consumen streams NDJSON del LLM.
 */

'use client';

import type { AgentActivityEntry } from '@/lib/types/agent-activity';
import { AgentActivityLog } from '@/components/agents/shared/AgentActivityLog';

interface LLMThinkingPanelProps {
  title: string;
  description: string;
  entries?: AgentActivityEntry[];
  /** Línea contextual opcional (ej. "8 deseos · 3 épicas previas") */
  meta?: string;
}

export function LLMThinkingPanel({
  title,
  description,
  entries = [],
  meta,
}: LLMThinkingPanelProps) {
  const hasActivity = entries.length > 0;

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

        {hasActivity ? (
          <AgentActivityLog entries={entries} />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-3">
              <div className="h-2.5 animate-pulse rounded-full bg-surface-muted" />
              <div className="h-2.5 w-[85%] animate-pulse rounded-full bg-surface-muted" />
              <div className="h-2.5 w-[65%] animate-pulse rounded-full bg-surface-muted" />
            </div>
            <p className="text-center text-xs text-muted">Conectando con el modelo...</p>
          </div>
        )}
      </div>
    </div>
  );
}
