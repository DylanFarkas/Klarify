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

  const colors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-purple-500',
    'bg-rose-500',
    'bg-cyan-500',
  ];

  const totalSp = sprints.reduce((sum, s) => sum + s.velocitySp, 0);
  const dateRange = sprints.length > 0
    ? formatDateRangeEs(sprints[0].startDate, sprints[sprints.length - 1].endDate)
    : '';

  return (
    <div className="rounded-xl border border-border bg-surface animate-[fadeIn_0.4s_ease-out]">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-surface-hover/30 transition-colors cursor-pointer rounded-xl"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg
            className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <h3 className="text-sm font-semibold text-foreground">Cronograma</h3>
          {!isExpanded && (
            <span className="truncate text-[10px] text-muted">
              {sprints.length} sprint{sprints.length !== 1 ? 's' : ''} · {totalSp} SP · {dateRange}
            </span>
          )}
        </div>
        <span className="shrink-0 text-[10px] text-muted">
          {isExpanded ? 'Ocultar' : 'Ver'}
        </span>
      </button>

      {isExpanded && (
        <div className="border-t border-border px-5 pb-5 pt-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {sprints.map((sprint, idx) => {
              const widthPct = sprints.length === 1 ? 100 : Math.max(15, Math.round(100 / sprints.length));
              return (
                <div
                  key={sprint.id}
                  className="flex-1 min-w-[120px]"
                  style={{ flexBasis: `${widthPct}%` }}
                >
                  <div className={`rounded-t-lg ${colors[idx % colors.length]} px-3 py-2 text-white`}>
                    <p className="text-[10px] font-bold opacity-70">Sprint {sprint.number}</p>
                    <p className="text-sm font-extrabold tabular-nums">{sprint.velocitySp} SP</p>
                  </div>
                  <div className="rounded-b-lg border border-t-0 border-border bg-surface-muted/50 px-3 py-2">
                    <p className="text-[10px] text-muted">
                      {formatDateEs(sprint.startDate)}
                    </p>
                    <p className="text-[10px] text-muted">
                      → {formatDateEs(sprint.endDate)}
                    </p>
                    <p className="mt-1 text-[10px] font-medium text-foreground">
                      {sprint.storyIds.length} HU
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {sprints.map((sprint, idx) => (
              <div key={sprint.id} className="flex items-center gap-1.5">
                <div className={`h-2.5 w-2.5 rounded-sm ${colors[idx % colors.length]}`} />
                <span className="text-[10px] text-muted">
                  {formatDateRangeEs(sprint.startDate, sprint.endDate)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
