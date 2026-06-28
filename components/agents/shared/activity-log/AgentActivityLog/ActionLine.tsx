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
        <span className="absolute h-full w-full animate-ping rounded-full bg-primary/30 opacity-60" />
        <span className="relative h-1.5 w-1.5 rounded-full bg-primary" />
      </span>
    );
  }
  if (status === 'error') {
    return <span className="shrink-0 text-xs text-danger">✕</span>;
  }
  if (status === 'done') {
    return <span className="shrink-0 text-xs text-success/75">✓</span>;
  }
  return <span className="shrink-0 text-xs text-muted/50">○</span>;
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
        compact ? 'py-0.5 text-xs' : isLive ? 'rounded-lg border px-3 py-2.5 text-sm' : 'text-xs',
        highlight
          ? 'rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-2 font-medium text-foreground'
          : muted
            ? 'text-muted'
            : compact
              ? 'text-foreground/85'
              : isRunning
                ? 'border-primary/30 bg-primary/5 text-foreground'
                : isLive
                  ? 'border-border/50 bg-surface/60 text-foreground/80'
                  : 'text-foreground/75',
        entry.status === 'error' && !compact ? 'border-danger/30 bg-danger/5 text-danger' : '',
        entry.status === 'error' && compact ? 'text-danger' : '',
      ].join(' ')}
    >
      <StatusIcon status={entry.status} />
      <span className={isRunning && !highlight ? 'text-foreground' : ''}>{entry.label}</span>
    </div>
  );
}
