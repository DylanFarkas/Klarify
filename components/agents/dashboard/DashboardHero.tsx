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
		<header className="flex min-h-10 flex-col justify-center gap-2 border-b border-border/60 py-1.5 sm:flex-row sm:items-center sm:justify-between">
			<div className="min-w-0">
				<h1 className="text-[50px] font-semibold tracking-tight text-foreground">
					Dashboard
				</h1>
				<p className="mt-0.5 truncate text-[12px] text-muted">
					{projectName}
					{hasContent ? (
						<>
							{' · '}
							<span className="tabular-nums text-subtle">{metaParts.join(' · ')}</span>
						</>
					) : (
						<> · Sin datos todavía</>
					)}
				</p>
			</div>

			<div className="flex shrink-0 flex-wrap items-center gap-2">
				<Link
					href={metrics.nextAction.href}
					className="inline-flex items-center rounded-md bg-foreground px-3 py-1.5 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
				>
					{metrics.nextAction.label}
				</Link>
				{metrics.hasPlan && executionBoardEnabled ? (
					<Link
						href="/agentes/board"
						className="inline-flex items-center rounded-md px-3 py-1.5 text-[13px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
					>
						Ir al tablero
					</Link>
				) : null}
			</div>
		</header>
	);
}
