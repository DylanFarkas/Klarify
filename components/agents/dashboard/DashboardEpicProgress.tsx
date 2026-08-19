import type { DashboardMetrics } from './dashboardMetrics';
import { formatEffortTotal } from '@/lib/utils/estimation';

export function DashboardEpicProgress({ metrics }: { metrics: DashboardMetrics }) {
	if (metrics.epicBreakdown.length === 0) return null;

	return (
		<section
			className="rounded-xl border border-border bg-surface"
			aria-label="Progreso por épica"
		>
			<div className="border-b border-border px-4 py-3.5 md:px-5">
				<h2 className="text-[15px] font-semibold tracking-tight text-foreground">
					Progreso por épica
				</h2>
				<p className="mt-1 text-[12px] text-muted">
					Historias hechas en el tablero respecto al total de cada épica.
				</p>
			</div>
			<ul className="divide-y divide-border">
				{metrics.epicBreakdown.map((epic) => {
					const pct =
						epic.storyCount > 0 ? Math.round((epic.doneCount / epic.storyCount) * 100) : 0;
					return (
						<li
							key={epic.id}
							className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-5"
						>
							<div className="min-w-0 flex-1">
								<p className="truncate text-[13px] font-medium text-foreground">{epic.title}</p>
								<p className="mt-0.5 text-[11px] tabular-nums text-subtle">
									{epic.doneCount}/{epic.storyCount} hechas
									{' · '}
									{formatEffortTotal(epic.points, metrics.estimationMode)}
								</p>
							</div>
							<div className="flex w-full items-center gap-2 sm:w-40">
								<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
									<div
										className="h-full rounded-full bg-foreground/70 transition-[width] duration-300"
										style={{ width: `${pct}%` }}
									/>
								</div>
								<span className="w-8 text-right text-[11px] tabular-nums text-muted">{pct}%</span>
							</div>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
