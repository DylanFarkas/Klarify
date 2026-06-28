'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { AgentActivityEntry } from '@/lib/types/agent-activity';
import { groupAgentActivityEntries } from '@/lib/utils/agent-activity-groups';
import { PhaseSection } from './PhaseSection';

interface AgentActivityLogProps {
  entries: AgentActivityEntry[];
  variant?: 'default' | 'live';
}

export function AgentActivityLog({ entries, variant = 'default' }: AgentActivityLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLive = variant === 'live';
  const phaseGroups = useMemo(() => groupAgentActivityEntries(entries), [entries]);

  useEffect(() => {
    if (isLive) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [entries, isLive]);

  if (entries.length === 0) return null;

  return (
    <div className={isLive ? 'flex min-h-0 flex-1 flex-col' : 'w-full'}>
      {!isLive && (
        <div className="mb-3 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            Actividad del agente
          </span>
        </div>
      )}
      <div
        ref={scrollRef}
        className={[
          'flex flex-col gap-5',
          isLive
            ? 'min-h-0 flex-1'
            : 'max-h-64 overflow-y-auto rounded-xl border border-primary/20 bg-surface-muted px-4 py-3 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--primary)_8%,transparent)]',
        ].join(' ')}
      >
        {phaseGroups.map((group) => (
          <div key={group.phase.id} className={isLive ? 'flex min-h-0 flex-1 flex-col' : undefined}>
            <PhaseSection group={group} variant={variant} />
          </div>
        ))}
      </div>
    </div>
  );
}
