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
        <div className="mb-2.5 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
          <span className="text-xs font-medium text-subtle">Actividad del agente</span>
        </div>
      )}
      <div
        ref={scrollRef}
        className={[
          'flex flex-col gap-4',
          isLive
            ? 'min-h-0 flex-1'
            : 'max-h-64 overflow-y-auto rounded-lg border border-border bg-surface-muted/40 px-3.5 py-3',
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
