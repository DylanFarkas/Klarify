interface DashboardPriorityBucketCardProps {
	title: string;
	count: number;
	points: number;
	description: string;
}

export function DashboardPriorityBucketCard({
	title,
	count,
	points,
	description,
}: DashboardPriorityBucketCardProps) {
	return (
		<div className="rounded-2xl border border-border bg-surface/80 p-5 shadow-sm">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-[11px] font-bold uppercase tracking-[0.16em] text-subtle">Prioridad</p>
					<h3 className="mt-2 text-lg font-semibold text-foreground">{title}</h3>
				</div>
				<span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-bold text-foreground">
					{count}
				</span>
			</div>
			<p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>
			<div className="mt-4 flex items-center justify-between gap-4 text-sm">
				<span className="text-muted">Story Points</span>
				<span className="font-bold text-foreground">{points}</span>
			</div>
		</div>
	);
}
