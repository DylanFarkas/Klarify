'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { resolveBoardData, computeExecutionProgress, type BoardFilters } from '@/lib/board/board-utils';
import { findActiveSprint } from '@/lib/utils/sprint-plan-mutations';
import { getSprintStatus } from '@/lib/types/agent-5';
import type { UserWorkspace } from '@/lib/types/workspace';
import type { DashboardMetrics } from './dashboardMetrics';
import { formatEffortTotal } from '@/lib/utils/estimation';

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

	if (!hasAgent6) {
		return <PipelineCoverageStrip metrics={metrics} />;
	}

	const activeSprint = metrics.plan ? findActiveSprint(metrics.plan) : null;
	const sprintFilter = activeSprint?.id ?? 'all';
	const filters: BoardFilters = {
		sprintFilter,
		epicId: 'all',
		assigneeId: 'all',
		typeFilter: 'all',
		search: '',
	};
	const { stories } = resolveBoardData(workspace, filters);
	const progress = computeExecutionProgress(stories);
	const doneCount = stories.filter((s) => s.execution.status === 'done').length;
	const committedSp = stories.reduce((sum, s) => sum + s.points, 0);
	const doneSp = stories
		.filter((s) => s.execution.status === 'done')
		.reduce((sum, s) => sum + s.points, 0);

	const statusCounts = {
		todo: stories.filter((s) => s.execution.status === 'todo').length,
		in_progress: stories.filter((s) => s.execution.status === 'in_progress').length,
		code_review: stories.filter((s) => s.execution.status === 'code_review').length,
		done: doneCount,
	};

	const plannedSprintCount =
		metrics.plan?.sprints.filter((s) => getSprintStatus(s) === 'planned').length ?? 0;
	const plannedStoryCount =
		metrics.plan?.sprints
			.filter((s) => getSprintStatus(s) === 'planned')
			.reduce((sum, s) => sum + s.storyIds.length, 0) ?? 0;

	const goalShort = activeSprint
		? activeSprint.sprintGoal.replace(/^Sprint\s+\d+\s*:\s*/i, '').trim() || activeSprint.sprintGoal
		: null;

	return (
		<section className="border-b border-border/60 pb-5" aria-label="Resumen del proyecto">
			<div className="grid gap-5 sm:grid-cols-3 sm:gap-0">
				<SummaryBlock label="Sprint activo">
					{activeSprint ? (
						<>
							<p className="text-[13px] tabular-nums text-foreground">
								Sprint {activeSprint.number}
								{goalShort ? (
									<>
										<span className="mx-1.5 text-subtle">·</span>
										<span className="font-medium">{truncateInline(goalShort, 28)}</span>
									</>
								) : null}
							</p>
							<p className="mt-1 text-[11px] text-subtle">
								{doneCount}/{stories.length} hechas
								{' · '}
								{formatEffortTotal(doneSp, metrics.estimationMode)}/
								{formatEffortTotal(committedSp, metrics.estimationMode)}
							</p>
							<div className="mt-2.5 h-1 overflow-hidden rounded-full bg-border/60">
								<div
									className="h-full rounded-full bg-foreground/70 transition-[width] duration-300"
									style={{ width: `${progress}%` }}
								/>
							</div>
						</>
					) : (
						<>
							<p className="text-[13px] text-foreground">Ninguno activo</p>
							<p className="mt-1 text-[11px] text-subtle">
								Inicia un sprint planificado para empezar la ejecución.
							</p>
						</>
					)}
				</SummaryBlock>

				<SummaryBlock label="Backlog" divided>
					<p className="text-[13px] tabular-nums text-foreground">
						<span className="text-muted">Sin sprint</span> {metrics.unassignedStoryCount}
						<span className="mx-1.5 text-subtle">·</span>
						<span className="text-muted">En planned</span> {plannedStoryCount}
					</p>
					<div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-subtle">
						<span>
							{plannedSprintCount} sprint{plannedSprintCount !== 1 ? 's' : ''} planificado
							{plannedSprintCount !== 1 ? 's' : ''}
							{' · '}
							{metrics.storyCount} HU totales
						</span>
						<Link
							href="/agentes/backlog"
							className="font-medium text-foreground underline-offset-2 hover:underline"
						>
							Ver backlog
						</Link>
					</div>
				</SummaryBlock>

				<SummaryBlock label="Ejecución" divided>
					{activeSprint ? (
						<>
							<div className="flex items-center justify-between gap-3">
								<p className="text-[13px] tabular-nums text-foreground">
									<span className="text-muted">To-do</span> {statusCounts.todo}
									<span className="mx-1.5 text-subtle">·</span>
									<span className="text-muted">WIP</span>{' '}
									{statusCounts.in_progress + statusCounts.code_review}
									<span className="mx-1.5 text-subtle">·</span>
									<span className="text-muted">Done</span> {statusCounts.done}
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
							<p className="mt-1 text-[11px] text-subtle">{progress}% del sprint activo</p>
						</>
					) : (
						<div className="flex items-center justify-between gap-3">
							<p className="text-[13px] text-muted">Sin sprint en curso</p>
							{executionBoardEnabled ? (
								<Link
									href="/agentes/board"
									className="shrink-0 text-[12px] font-medium text-foreground underline-offset-2 hover:underline"
								>
									Tablero
								</Link>
							) : null}
						</div>
					)}
				</SummaryBlock>
			</div>
		</section>
	);
}

function PipelineCoverageStrip({ metrics }: { metrics: DashboardMetrics }) {
	const sprintCoverageLabel = metrics.hasPlan ? `${metrics.planningCoverage}%` : '—';
	return (
		<section className="border-b border-border/60 pb-5" aria-label="Resumen del pipeline">
			<div className="grid gap-5 sm:grid-cols-3 sm:gap-0">
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
				<SummaryBlock label="Prioridad" divided>
					<p className="text-[13px] tabular-nums text-foreground">
						<span className="text-muted">Alta</span> {metrics.priorityBuckets.alta.count}
						<span className="mx-1.5 text-subtle">·</span>
						<span className="text-muted">Media</span> {metrics.priorityBuckets.media.count}
						<span className="mx-1.5 text-subtle">·</span>
						<span className="text-muted">Baja</span> {metrics.priorityBuckets.baja.count}
					</p>
				</SummaryBlock>
				<SummaryBlock label="Ejecución" divided>
					<p className="text-[13px] text-muted">Disponible al desbloquear el dashboard.</p>
				</SummaryBlock>
			</div>
		</section>
	);
}

function truncateInline(text: string, max: number): string {
	return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function SummaryBlock({
	label,
	children,
	divided = false,
}: {
	label: string;
	children: ReactNode;
	divided?: boolean;
}) {
	return (
		<div
			className={[
				'sm:px-5 first:sm:pl-0 last:sm:pr-0',
				divided ? 'border-t border-border/40 pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5' : '',
			].join(' ')}
		>
			<p className="text-[11px] font-medium text-subtle">{label}</p>
			<div className="mt-1.5">{children}</div>
		</div>
	);
}
