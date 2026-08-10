/**
 * @fileoverview Panel de carga con log de actividad del agente en tiempo real.
 * Compartido entre agentes que consumen streams NDJSON del LLM.
 */

'use client';

import type { AgentActivityEntry } from '@/lib/types/agent-activity';
import { useWorkspaceSettings } from '@/context/WorkspaceSettingsContext';
import { AgentActivityLog } from '@/components/agents/shared/activity-log/AgentActivityLog';
import { ReasoningLoader } from '@/components/agents/shared/activity-log/AgentActivityLog/ReasoningLoader';

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
  const { showModelReasoning } = useWorkspaceSettings();
  const hasActivity = entries.length > 0;
  const hasOpenThought = entries.some(
    (entry) => entry.kind === 'thought' && entry.endedAt === undefined
  );
  const showReasoningLoader = !showModelReasoning && (!hasActivity || hasOpenThought);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-[1.5px] border-border border-t-foreground" />
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
            {meta ? (
              <p className="mt-0.5 text-xs text-subtle">{meta}</p>
            ) : (
              <p className="mt-0.5 text-[13px] text-muted">{description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 px-5 py-5">
        {meta ? (
          <p className="text-sm leading-relaxed text-muted">{description}</p>
        ) : null}

        {showReasoningLoader ? (
          <ReasoningLoader />
        ) : hasActivity ? (
          <AgentActivityLog entries={entries} />
        ) : (
          <div className="space-y-3 py-2">
            <div className="h-2 animate-pulse rounded-full bg-surface-muted" />
            <div className="h-2 w-[82%] animate-pulse rounded-full bg-surface-muted" />
            <div className="h-2 w-[58%] animate-pulse rounded-full bg-surface-muted" />
            <p className="pt-1 text-center text-xs text-subtle">Conectando con el modelo…</p>
          </div>
        )}
      </div>
    </div>
  );
}
