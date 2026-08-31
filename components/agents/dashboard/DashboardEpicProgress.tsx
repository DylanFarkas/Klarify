import type { DashboardMetrics } from './dashboardMetrics';
import { formatEffortTotal } from '@/lib/utils/estimation';

export function DashboardEpicProgress({ metrics }: { metrics: DashboardMetrics }) {
	if (metrics.epicBreakdown.length === 0) return null;

	const doneCount = metrics.epicBreakdown.reduce((sum, epic) => sum + epic.doneCount, 0);
	const storyCount = metrics.epicBreakdown.reduce((sum, epic) => sum + epic.storyCount, 0);

	return (
		<section aria-label="Progreso por épica">
			<div className="mb-4 flex items-baseline justify-between gap-3">
				<h2 className="text-[15px] font-semibold tracking-tight text-foreground">Épicas</h2>
				<p className="text-[12px] tabular-nums text-subtle">
					{doneCount}/{storyCount}
				</p>
			</div>
			<ul className="flex flex-col gap-4">
				{metrics.epicBreakdown.map((epic) => {
					const pct =
						epic.storyCount > 0 ? Math.round((epic.doneCount / epic.storyCount) * 100) : 0;
					return (
						<li key={epic.id}>
							<div className="flex items-baseline justify-between gap-3">
								<p className="min-w-0 truncate text-[13px] font-medium text-foreground">
									{epic.title}
								</p>
								<span className="shrink-0 text-[13px] font-medium tabular-nums text-foreground">
									{pct}%
								</span>
							</div>
							<p className="mt-0.5 text-[11px] tabular-nums text-subtle">
								{epic.doneCount}/{epic.storyCount}
								{' · '}
								{formatEffortTotal(epic.points, metrics.estimationMode)}
							</p>
							<div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
								<div
									className="h-full rounded-full bg-foreground/70 transition-[width] duration-300 motion-reduce:transition-none"
									style={{ width: `${pct}%` }}
								/>
							</div>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
