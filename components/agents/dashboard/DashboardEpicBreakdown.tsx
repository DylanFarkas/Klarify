import type { DashboardMetrics } from './dashboardMetrics';

export function DashboardEpicBreakdown({ metrics }: { metrics: DashboardMetrics }) {
	return (
		<section className="rounded-2xl border border-border bg-surface/80 p-6 shadow-sm">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<p className="text-[11px] font-bold uppercase tracking-[0.16em] text-subtle">Epicas</p>
					<h2 className="mt-2 text-xl font-bold text-foreground">Distribucion por epica</h2>
					<p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
						Este resumen ayuda a detectar donde se concentra el esfuerzo, cuantas historias estan mejor definidas y donde todavia falta trabajo.
					</p>
				</div>
			</div>

			<div className="mt-6 grid gap-4 xl:grid-cols-2">
				{metrics.epicBreakdown.map((epic) => (
					<article key={epic.id} className="rounded-2xl border border-border bg-surface px-5 py-5">
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div>
								<h3 className="text-lg font-semibold text-foreground">{epic.title}</h3>
								<p className="mt-1 text-sm leading-relaxed text-muted">{epic.description}</p>
							</div>
							<div className="rounded-full border border-border bg-surface-hover px-3 py-1 text-xs font-bold text-foreground">
								{epic.storyCount} HU
							</div>
						</div>

						<div className="mt-4 grid gap-3 sm:grid-cols-3">
							<EpicPriorityMetric label="Alta" value={epic.highPriorityCount} tone="success" />
							<EpicPriorityMetric label="Media" value={epic.mediumPriorityCount} tone="warning" />
							<EpicPriorityMetric label="Baja" value={epic.lowPriorityCount} tone="default" />
						</div>

						<div className="mt-4 flex items-center justify-between gap-4 text-sm text-muted">
							<span>{epic.points} SP totales</span>
							<span>
								{epic.storyCount === 0 ? 'Sin historias' : `${(epic.points / epic.storyCount).toFixed(1)} SP/HU`}
							</span>
						</div>
					</article>
				))}
			</div>
		</section>
	);
}

function EpicPriorityMetric({
	label,
	value,
	tone,
}: {
	label: string;
	value: number;
	tone: 'default' | 'success' | 'warning';
}) {
	const toneClasses = {
		default: 'bg-surface-hover text-muted',
		success: 'bg-success/10 text-success',
		warning: 'bg-amber-500/10 text-amber-500',
	} as const;

	return (
		<div className={`rounded-xl border border-border/70 px-4 py-3 ${toneClasses[tone]}`}>
			<p className="text-[10px] font-bold uppercase tracking-[0.16em]">{label}</p>
			<p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
		</div>
	);
}
