import Link from 'next/link';
import type { DashboardMetrics } from './dashboardMetrics';
import { formatEffortTotal } from '@/lib/utils/estimation';

interface DashboardHeroProps {
	projectName: string;
	hasContent: boolean;
	metrics: DashboardMetrics;
	executionBoardEnabled: boolean;
}

export function DashboardHero({
	projectName,
	hasContent,
	metrics,
	executionBoardEnabled,
}: DashboardHeroProps) {
	const metaParts = [
		`${metrics.epics.length} épica${metrics.epics.length === 1 ? '' : 's'}`,
		`${metrics.storyCount} HU${metrics.storyCount === 1 ? '' : 's'}`,
		`${formatEffortTotal(metrics.totalPoints, metrics.estimationMode)}`,
		`pipeline ${metrics.completionCount}/5`,
	];

	return (
		<header className="flex flex-wrap items-end justify-between gap-x-3 gap-y-3">
			<div className="min-w-0">
				<p className="text-[12px] text-muted">{projectName}</p>
				<h1 className="mt-0.5 text-[50px] font-semibold tracking-tight text-foreground">
					Dashboard
				</h1>
				{hasContent ? (
					<p className="mt-1 truncate text-[12px] tabular-nums text-subtle">
						{metaParts.join(' · ')}
					</p>
				) : (
					<p className="mt-1 text-[12px] text-subtle">Sin datos todavía</p>
				)}
			</div>

			<div className="flex shrink-0 flex-wrap items-center gap-2 pb-1">
				{metrics.hasPlan && executionBoardEnabled ? (
					<Link
						href="/agentes/board"
						className="inline-flex items-center rounded-lg bg-surface-muted px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
					>
						Ir al tablero
					</Link>
				) : null}
				<Link
					href={metrics.nextAction.href}
					className="inline-flex items-center rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition-opacity hover:opacity-90"
				>
					{metrics.nextAction.label}
				</Link>
			</div>
		</header>
	);
}
