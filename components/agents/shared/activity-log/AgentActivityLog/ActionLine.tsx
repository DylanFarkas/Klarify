'use client';

import type { ActionEntry } from '@/lib/types/agent-activity';

interface ActionLineProps {
  entry: ActionEntry;
  variant?: 'default' | 'live';
  compact?: boolean;
  /** Pasos ya completados — texto tenue */
  muted?: boolean;
  /** Paso activo — ligero énfasis */
  highlight?: boolean;
}

function StatusIcon({ status }: { status: ActionEntry['status'] }) {
  if (status === 'running') {
    return (
      <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
        <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-[11px] text-danger">
        ✕
      </span>
    );
  }
  if (status === 'done') {
    return (
      <svg
        className="h-3.5 w-3.5 shrink-0 text-subtle"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  return <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-border" />;
}

export function ActionLine({
  entry,
  variant = 'default',
  compact = false,
  muted = false,
  highlight = false,
}: ActionLineProps) {
  const isLive = variant === 'live';
  const isRunning = entry.status === 'running';

  return (
    <div
      className={[
        'flex items-center gap-2.5',
        compact ? 'py-1 text-[13px]' : isLive ? 'rounded-lg px-3 py-2 text-sm' : 'text-[13px]',
        highlight
          ? 'rounded-lg bg-surface-hover px-2.5 py-2 text-sm font-medium text-foreground'
          : muted
            ? 'text-muted'
            : compact
              ? 'text-foreground/85'
              : isRunning
                ? 'bg-surface-hover text-foreground'
                : isLive
                  ? 'text-foreground/80'
                  : 'text-foreground/75',
        entry.status === 'error' && !compact ? 'rounded-lg bg-danger/5 px-2.5 py-2 text-danger' : '',
        entry.status === 'error' && compact ? 'text-danger' : '',
      ].join(' ')}
    >
      <StatusIcon status={entry.status} />
      <span className={isRunning && !highlight ? 'text-foreground' : ''}>{entry.label}</span>
    </div>
  );
}
