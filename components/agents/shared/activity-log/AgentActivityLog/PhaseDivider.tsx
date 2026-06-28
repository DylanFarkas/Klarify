'use client';

import type { PhaseEntry } from '@/lib/types/agent-activity';

interface PhaseDividerProps {
  entry: PhaseEntry;
  variant?: 'default' | 'live';
}

export function PhaseDivider({ entry, variant = 'default' }: PhaseDividerProps) {
  const isLive = variant === 'live';
  const isActive = entry.status === 'active';

  if (isLive) {
    return (
      <div
        className={[
          'flex items-center gap-2 rounded-lg px-1 py-1',
          isActive ? 'text-primary' : 'text-muted',
        ].join(' ')}
      >
        <span
          className={[
            'flex h-6 w-6 items-center justify-center rounded-full font-mono text-[10px] font-bold',
            isActive ? 'bg-primary/15 ring-2 ring-primary/30' : 'bg-surface-muted',
          ].join(' ')}
        >
          {isActive ? '●' : '✓'}
        </span>
        <span className="font-mono text-xs font-semibold uppercase tracking-widest">
          {entry.label}
        </span>
        {isActive && (
          <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-1">
      <div
        className={[
          'h-px flex-1',
          isActive ? 'bg-primary/30' : 'bg-border',
        ].join(' ')}
      />
      <span
        className={[
          'shrink-0 font-mono text-[10px] font-semibold uppercase tracking-widest',
          isActive ? 'text-primary' : 'text-muted',
        ].join(' ')}
      >
        {entry.label}
        {isActive && (
          <span className="ml-1.5 inline-block h-1 w-1 animate-pulse rounded-full bg-primary align-middle" />
        )}
      </span>
      <div
        className={[
          'h-px flex-1',
          isActive ? 'bg-primary/30' : 'bg-border',
        ].join(' ')}
      />
    </div>
  );
}
