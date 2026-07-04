import { getStatusTone, humanizeStatus } from './dashboardMetrics';

export function DashboardStatusPill({ status }: { status: string }) {
	const tone = getStatusTone(status);
	const classes = {
		success: 'border-success/20 bg-success/10 text-success',
		warning: 'border-amber-500/20 bg-amber-500/10 text-amber-500',
		default: 'border-border bg-surface text-muted',
	} as const;

	return (
		<span
			className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${classes[tone]}`}
		>
			{humanizeStatus(status)}
		</span>
	);
}
