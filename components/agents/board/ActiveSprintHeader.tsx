import type { BoardStory } from '@/lib/board/board-utils';
import { formatEffortTotal } from '@/lib/utils/estimation';
import type { PlannedSprint } from '@/lib/types/agent-5';

interface ActiveSprintHeaderProps {
  sprint: PlannedSprint;
  stories: BoardStory[];
  capacitySp?: number;
}

function daysRemaining(endDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return null;
  const end = new Date(`${endDate}T23:59:59`);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export function ActiveSprintHeader({
  sprint,
  stories,
  capacitySp,
}: ActiveSprintHeaderProps) {
  const doneCount = stories.filter((s) => s.execution.status === 'done').length;
  const committedSp = stories.reduce((sum, s) => sum + s.points, 0);
  const doneSp = stories
    .filter((s) => s.execution.status === 'done')
    .reduce((sum, s) => sum + s.points, 0);
  const mode = stories[0]?.estimationMode ?? 'story_points';
  const remaining = daysRemaining(sprint.endDate);
  const goalShort =
    sprint.sprintGoal.replace(/^Sprint\s+\d+\s*:\s*/i, '').trim() || sprint.sprintGoal;

  return (
    <section
      className="rounded-xl border border-border bg-surface px-4 py-3.5 md:px-5"
      aria-label={`Sprint ${sprint.number} activo`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-semibold text-foreground">
              Sprint {sprint.number}
            </p>
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Activo
            </span>
          </div>
          <p className="mt-1 truncate text-[13px] text-muted" title={goalShort}>
            {goalShort}
          </p>
          <p className="mt-1 text-[11px] tabular-nums text-subtle">
            {sprint.startDate} → {sprint.endDate}
            {remaining !== null ? (
              <>
                <span className="mx-1.5 text-subtle">·</span>
                {remaining < 0
                  ? `Venció hace ${Math.abs(remaining)} día${Math.abs(remaining) !== 1 ? 's' : ''}`
                  : remaining === 0
                    ? 'Termina hoy'
                    : `${remaining} día${remaining !== 1 ? 's' : ''} restantes`}
              </>
            ) : null}
          </p>
        </div>
        <div className="text-right text-[13px] tabular-nums text-foreground">
          <p>
            {doneCount}/{stories.length} hechas
          </p>
          <p className="mt-1 text-[11px] text-subtle">
            {formatEffortTotal(doneSp, mode)}/{formatEffortTotal(committedSp, mode)}
            {mode === 'story_points' && typeof capacitySp === 'number' ? ` · cap. ${capacitySp}` : ''}
          </p>
        </div>
      </div>
    </section>
  );
}
