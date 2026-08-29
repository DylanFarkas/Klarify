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
			<div className="mb-3">
				<h2 className="text-[15px] font-semibold tracking-tight text-foreground">
					Sprints completados
				</h2>
				<p className="mt-0.5 text-[12px] text-muted">
					Registro histórico de sprints cerrados del proyecto.
				</p>
			</div>

			<ul className="flex flex-col">
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

					return (
						<li
							key={sprint.id}
							className="-mx-2 rounded-md px-2 py-3 transition-colors hover:bg-surface-hover/50"
						>
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div className="min-w-0">
									<div className="flex flex-wrap items-center gap-2">
										<p className="text-[13px] font-semibold text-foreground">
											Sprint {sprint.number}
										</p>
										<span className="rounded-md bg-surface-muted px-1.5 py-px text-[10px] font-medium text-subtle">
											Completado
										</span>
									</div>
									<p className="mt-1 truncate text-[13px] text-muted" title={goalShort}>
										{goalShort}
									</p>
									<p className="mt-1 text-[11px] tabular-nums text-subtle">
										{sprint.startDate} → {sprint.endDate}
									</p>
								</div>
								<div className="text-right text-[13px] tabular-nums text-foreground">
									<p>
										{doneCount}/{rows.length} hechas
									</p>
									<p className="mt-1 text-[11px] text-subtle">
										{formatEffortTotal(doneSp, metrics.estimationMode)}/
										{formatEffortTotal(committedSp, metrics.estimationMode)}
									</p>
								</div>
							</div>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
