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
          className="mt-1 self-start text-[11px] text-subtle transition-colors hover:text-muted"
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
      <svg
        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-subtle"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span className="min-w-0 flex-1 text-[13px] leading-relaxed text-muted">
        <span className="font-medium text-foreground/70">
          {actions.length} pasos completados
        </span>
        <span className="hidden sm:inline"> — {summary}</span>
      </span>
      <span className="shrink-0 text-[11px] text-subtle group-hover:text-muted">ver</span>
    </button>
  );
}
