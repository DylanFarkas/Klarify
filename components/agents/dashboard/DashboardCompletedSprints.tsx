import { getSprintStatus } from '@/lib/types/agent-5';
import { formatEffortTotal, getEffortValue } from '@/lib/utils/estimation';
import type { DashboardMetrics } from './dashboardMetrics';

interface DashboardCompletedSprintsProps {
	metrics: DashboardMetrics;
}

export function DashboardCompletedSprints({ metrics }: DashboardCompletedSprintsProps) {
	const completedSprints =
		metrics.plan?.sprints
			.filter((sprint) => getSprintStatus(sprint) === 'completed')
			.sort((a, b) => b.number - a.number) ?? [];

	if (completedSprints.length === 0) {
		return null;
	}

	return (
		<section aria-label="Sprints completados">
			<div className="mb-4 flex items-baseline justify-between gap-3">
				<h2 className="text-[15px] font-semibold tracking-tight text-foreground">
					Cerrados
				</h2>
				<p className="text-[12px] tabular-nums text-subtle">{completedSprints.length}</p>
			</div>

			<ol className="flex flex-col">
				{completedSprints.map((sprint) => {
					const rows = metrics.sprintStoryRows.filter((row) => row.sprintId === sprint.id);
					const doneCount = rows.filter((row) => row.executionStatus === 'done').length;
					const committedSp = rows.reduce(
						(sum, row) => sum + getEffortValue(row.estimation, metrics.estimationMode),
						0
					);
					const doneSp = rows
						.filter((row) => row.executionStatus === 'done')
						.reduce(
							(sum, row) => sum + getEffortValue(row.estimation, metrics.estimationMode),
							0
						);
					const goalShort =
						sprint.sprintGoal.replace(/^Sprint\s+\d+\s*:\s*/i, '').trim() || sprint.sprintGoal;
					const pct = rows.length > 0 ? Math.round((doneCount / rows.length) * 100) : 0;

					return (
						<li
							key={sprint.id}
							className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 border-t border-border/60 py-3 first:border-t-0 first:pt-0"
						>
							<span className="pt-0.5 text-[13px] font-semibold tabular-nums text-subtle">
								{String(sprint.number).padStart(2, '0')}
							</span>
							<div className="min-w-0">
								<p className="truncate text-[13px] text-foreground" title={goalShort}>
									{goalShort}
								</p>
								<p className="mt-0.5 text-[11px] tabular-nums text-subtle">
									{doneCount}/{rows.length} · {pct}%
									{' · '}
									{formatEffortTotal(doneSp, metrics.estimationMode)}/
									{formatEffortTotal(committedSp, metrics.estimationMode)}
								</p>
							</div>
						</li>
					);
				})}
			</ol>
		</section>
	);
}
