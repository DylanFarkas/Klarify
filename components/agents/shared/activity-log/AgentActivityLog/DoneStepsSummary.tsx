'use client';

import { useState } from 'react';
import type { ActionEntry } from '@/lib/types/agent-activity';
import { ActionLine } from './ActionLine';

interface DoneStepsSummaryProps {
  actions: ActionEntry[];
  variant?: 'default' | 'live';
}

export function DoneStepsSummary({ actions, variant = 'default' }: DoneStepsSummaryProps) {
  const [expanded, setExpanded] = useState(false);

  if (actions.length === 0) return null;

  if (actions.length === 1) {
    return <ActionLine entry={actions[0]} variant={variant} compact muted />;
  }

  if (expanded) {
    return (
      <div className="flex flex-col gap-0.5">
        {actions.map((action) => (
          <ActionLine key={action.id} entry={action} variant={variant} compact muted />
        ))}
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-1 self-start font-mono text-[10px] text-muted/70 hover:text-muted"
        >
          Ocultar pasos
        </button>
      </div>
    );
  }

  const summary = actions.map((a) => a.label).join(' · ');

  return (
    <button
      type="button"
      onClick={() => setExpanded(true)}
      className="group flex w-full items-start gap-2 rounded-lg py-1 text-left transition-colors hover:bg-surface-hover/60"
      aria-expanded={false}
    >
      <span className="mt-0.5 shrink-0 text-success/80">✓</span>
      <span className="min-w-0 flex-1 text-xs leading-relaxed text-muted">
        <span className="font-medium text-foreground/70">
          {actions.length} pasos completados
        </span>
        <span className="hidden sm:inline"> — {summary}</span>
      </span>
      <span className="shrink-0 font-mono text-[10px] text-muted/50 group-hover:text-muted">
        ver
      </span>
    </button>
  );
}
