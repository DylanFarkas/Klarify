'use client';

import { useState } from 'react';
import type { PlannedSprint } from '@/lib/types/agent-5';
import { formatDateEs, formatDateRangeEs } from '@/lib/utils/dates';

interface SprintTimelineProps {
  sprints: PlannedSprint[];
}

export function SprintTimeline({ sprints }: SprintTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (sprints.length === 0) return null;

  const totalSp = sprints.reduce((sum, s) => sum + s.velocitySp, 0);
  const dateRange =
    sprints.length > 0
      ? formatDateRangeEs(sprints[0].startDate, sprints[sprints.length - 1].endDate)
      : '';

  return (
    <div className="rounded-xl border border-border bg-surface animate-[fadeIn_0.3s_ease-out]">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-surface-hover/40 sm:px-5"
        aria-expanded={isExpanded}
      >
        <div className="flex min-w-0 items-center gap-2">
          <svg
            className={`h-3.5 w-3.5 shrink-0 text-subtle transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <h3 className="text-[15px] font-semibold tracking-tight text-foreground">Cronograma</h3>
          {!isExpanded && (
            <span className="truncate text-[12px] text-subtle">
              {sprints.length} sprint{sprints.length !== 1 ? 's' : ''} · {totalSp} SP · {dateRange}
            </span>
          )}
        </div>
        <span className="shrink-0 text-[11px] text-subtle">{isExpanded ? 'Ocultar' : 'Ver'}</span>
      </button>

      {isExpanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 sm:px-5">
          <div className="flex flex-col divide-y divide-border">
            {sprints.map((sprint, idx) => (
              <div
                key={sprint.id}
                className="grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-x-2.5 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="pt-0.5 text-[11px] font-medium tabular-nums text-subtle">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-[13px] font-medium text-foreground">
                      Sprint {sprint.number}
                    </span>
                    <span className="text-[12px] tabular-nums text-subtle">
                      {sprint.velocitySp} SP · {sprint.storyIds.length} HU
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-muted">
                    {formatDateEs(sprint.startDate)} → {formatDateEs(sprint.endDate)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
