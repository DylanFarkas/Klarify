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
		`${metrics.wishesCount} deseo${metrics.wishesCount === 1 ? '' : 's'}`,
		`pipeline ${metrics.completionCount}/5`,
	];

	return (
		<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div className="min-w-0">
				<h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
					Dashboard
				</h1>
				<p className="mt-1 text-sm text-muted">{projectName}</p>
				{hasContent ? (
					<p className="mt-2 text-[12px] tabular-nums text-subtle">{metaParts.join(' · ')}</p>
				) : (
					<p className="mt-2 text-[12px] text-subtle">Sin datos todavía</p>
				)}
			</div>

			<div className="flex shrink-0 flex-wrap items-center gap-2">
				<Link
					href={metrics.nextAction.href}
					className="inline-flex items-center rounded-lg bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
				>
					{metrics.nextAction.label}
				</Link>
				{metrics.hasPlan && executionBoardEnabled ? (
					<Link
						href="/agentes/board"
						className="inline-flex items-center rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
					>
						Ir al tablero
					</Link>
				) : null}
			</div>
		</header>
	);
}
