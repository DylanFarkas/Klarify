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
          'flex items-center gap-2 px-0.5 py-1',
          isActive ? 'text-foreground' : 'text-muted',
        ].join(' ')}
      >
        <span
          className={[
            'h-1.5 w-1.5 rounded-full',
            isActive ? 'bg-foreground' : 'bg-foreground/35',
          ].join(' ')}
        />
        <span className="text-xs font-medium">{entry.label}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-1">
      <div className={['h-px flex-1', isActive ? 'bg-border-strong' : 'bg-border'].join(' ')} />
      <span
        className={[
          'shrink-0 text-[11px] font-medium',
          isActive ? 'text-foreground' : 'text-subtle',
        ].join(' ')}
      >
        {entry.label}
      </span>
      <div className={['h-px flex-1', isActive ? 'bg-border-strong' : 'bg-border'].join(' ')} />
    </div>
  );
}
