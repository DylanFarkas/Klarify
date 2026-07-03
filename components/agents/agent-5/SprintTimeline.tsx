'use client';

import type { PlannedSprint } from '@/lib/types/agent-5';

interface SprintTimelineProps {
  sprints: PlannedSprint[];
}

export function SprintTimeline({ sprints }: SprintTimelineProps) {
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

  return (
    <div className="rounded-xl border border-border bg-surface p-5 animate-[fadeIn_0.4s_ease-out]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Cronograma de Sprints</h3>
        <span className="text-[10px] text-muted">{totalSp} SP totales</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {sprints.map((sprint, idx) => {
          const completedSpBefore = sprints.slice(0, idx).reduce((sum, item) => sum + item.velocitySp, 0);
          const sprintSharePct = totalSp > 0 ? Math.round((sprint.velocitySp / totalSp) * 100) : 0;
          const cumulativePct = totalSp > 0 ? Math.round(((completedSpBefore + sprint.velocitySp) / totalSp) * 100) : 0;
          const widthPct = sprints.length === 1 ? 100 : Math.max(15, Math.round(100 / sprints.length));
          return (
            <div
              key={sprint.id}
              className="flex-1 min-w-[120px]"
              style={{ flexBasis: `${widthPct}%` }}
            >
              <div
                className={`rounded-t-lg ${colors[idx % colors.length]} px-3 py-2 text-white`}
              >
                <p className="text-[10px] font-bold opacity-70">Sprint {sprint.number}</p>
                <p className="text-sm font-extrabold tabular-nums">{sprint.velocitySp} SP</p>
              </div>
              <div className="rounded-b-lg border border-t-0 border-border bg-surface-muted/50 px-3 py-2">
                <p className="text-[10px] text-muted">
                  {sprint.startDate}
                </p>
                <p className="text-[10px] text-muted">
                  → {sprint.endDate}
                </p>
                <p className="mt-1 text-[10px] font-medium text-foreground">
                  {sprint.storyIds.length} HU · aporta {sprintSharePct}% · avance {cumulativePct}%
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {sprints.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {sprints.map((sprint, idx) => (
            <div key={sprint.id} className="flex items-center gap-1.5">
              <div className={`h-2.5 w-2.5 rounded-sm ${colors[idx % colors.length]}`} />
              <span className="text-[10px] text-muted">
                {sprint.startDate} → {sprint.endDate}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
