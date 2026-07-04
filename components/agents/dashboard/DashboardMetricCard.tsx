export type DashboardCardTone = 'default' | 'success' | 'warning';

interface DashboardMetricCardProps {
	label: string;
	value: string | number;
	hint: string;
	tone?: DashboardCardTone;
}

export function DashboardMetricCard({
	label,
	value,
	hint,
	tone = 'default',
}: DashboardMetricCardProps) {
	const toneClasses = {
		default: 'border-border bg-surface/80 text-foreground',
		success: 'border-success/20 bg-success/10 text-success',
		warning: 'border-amber-500/20 bg-amber-500/10 text-amber-500',
	} as const;

	return (
		<div className={`rounded-2xl border p-5 shadow-sm ${toneClasses[tone]}`}>
			<p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
			<p className="mt-3 text-3xl font-bold tracking-tight text-foreground">{value}</p>
			<p className="mt-2 text-sm leading-relaxed text-muted">{hint}</p>
		</div>
	);
}
