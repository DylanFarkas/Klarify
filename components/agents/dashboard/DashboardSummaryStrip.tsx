'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { resolveBoardData, computeExecutionProgress, type BoardFilters } from '@/lib/board/board-utils';
import type { UserWorkspace } from '@/lib/types/workspace';
import type { DashboardMetrics } from './dashboardMetrics';

interface DashboardSummaryStripProps {
	metrics: DashboardMetrics;
	workspace: UserWorkspace;
	executionBoardEnabled: boolean;
}

export function DashboardSummaryStrip({
	metrics,
	workspace,
	executionBoardEnabled,
}: DashboardSummaryStripProps) {
	const hasAgent6 = Boolean(workspace.pipeline.agent6Input);
	const filters: BoardFilters = {
		sprintFilter: workspace.execution?.sprintFilter ?? 'all',
		epicId: 'all',
		assigneeId: 'all',
		search: '',
	};
	const { stories } = hasAgent6 ? resolveBoardData(workspace, filters) : { stories: [] };
	const progress = hasAgent6 ? computeExecutionProgress(stories) : 0;
	const doneCount = stories.filter((s) => s.execution.status === 'done').length;

	const sprintCoverageLabel = metrics.hasPlan ? `${metrics.planningCoverage}%` : '—';

	return (
		<section
			className="rounded-xl border border-border bg-surface"
			aria-label="Resumen del proyecto"
		>
			<div className="grid gap-0 sm:grid-cols-3">
				<SummaryBlock label="Cobertura">
					<p className="text-[13px] tabular-nums text-foreground">
						<span className="text-muted">Est.</span> {metrics.estimationCoverage}%
						<span className="mx-1.5 text-subtle">·</span>
						<span className="text-muted">Prio.</span> {metrics.prioritizationCoverage}%
						<span className="mx-1.5 text-subtle">·</span>
						<span className="text-muted">Sprint</span> {sprintCoverageLabel}
					</p>
					<p className="mt-1 text-[11px] text-subtle">
						{metrics.estimatedStoryCount}/{metrics.storyCount} estimadas
						{' · '}
						{metrics.prioritizedStoryCount}/{metrics.storyCount} priorizadas
					</p>
				</SummaryBlock>

				<SummaryBlock label="Prioridad" bordered>
					<p className="text-[13px] tabular-nums text-foreground">
						<span className="text-muted">Alta</span> {metrics.priorityBuckets.alta.count}
						<span className="mx-1.5 text-subtle">·</span>
						<span className="text-muted">Media</span> {metrics.priorityBuckets.media.count}
						<span className="mx-1.5 text-subtle">·</span>
						<span className="text-muted">Baja</span> {metrics.priorityBuckets.baja.count}
					</p>
					<p className="mt-1 text-[11px] text-subtle">
						{metrics.priorityBuckets.alta.points} / {metrics.priorityBuckets.media.points} /{' '}
						{metrics.priorityBuckets.baja.points} SP
					</p>
				</SummaryBlock>

				<SummaryBlock label="Ejecución" bordered>
					{hasAgent6 ? (
						<>
							<div className="flex items-center justify-between gap-3">
								<p className="text-[13px] tabular-nums text-foreground">
									{doneCount}/{stories.length} hechas
									<span className="mx-1.5 text-subtle">·</span>
									{progress}%
								</p>
								{executionBoardEnabled ? (
									<Link
										href="/agentes/board"
										className="shrink-0 text-[12px] font-medium text-foreground underline-offset-2 hover:underline"
									>
										Tablero
									</Link>
								) : (
									<Link
										href="/#pricing"
										className="shrink-0 text-[12px] font-medium text-muted underline-offset-2 hover:underline"
									>
										Starter
									</Link>
								)}
							</div>
							<div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
								<div
									className="h-full rounded-full bg-foreground/70 transition-[width] duration-300"
									style={{ width: `${progress}%` }}
								/>
							</div>
						</>
					) : (
						<p className="text-[13px] text-muted">
							Disponible al desbloquear el dashboard.
						</p>
					)}
				</SummaryBlock>
			</div>
		</section>
	);
}

function SummaryBlock({
	label,
	children,
	bordered = false,
}: {
	label: string;
	children: ReactNode;
	bordered?: boolean;
}) {
	return (
		<div
			className={[
				'px-4 py-3.5 md:px-5',
				bordered ? 'border-t border-border sm:border-t-0 sm:border-l' : '',
			].join(' ')}
		>
			<p className="text-[11px] text-subtle">{label}</p>
			<div className="mt-1.5">{children}</div>
		</div>
	);
}
