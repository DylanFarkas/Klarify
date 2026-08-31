'use client';

import Link from 'next/link';
import { resolveBoardData, computeExecutionProgress, type BoardFilters } from '@/lib/board/board-utils';
import { findActiveSprint } from '@/lib/utils/sprint-plan-mutations';
import { KANBAN_COLUMNS, type KanbanStatus } from '@/lib/types/execution';
import type { UserWorkspace } from '@/lib/types/workspace';
import type { DashboardMetrics } from './dashboardMetrics';
import { formatEffortTotal } from '@/lib/utils/estimation';

interface DashboardSummaryStripProps {
	metrics: DashboardMetrics;
	workspace: UserWorkspace;
	executionBoardEnabled: boolean;
}

const COLUMN_DOT: Record<KanbanStatus, string> = {
	todo: 'bg-subtle',
	in_progress: 'bg-primary',
	code_review: 'bg-[var(--sileo-state-warning)]',
	done: 'bg-green-500',
};

const COLUMN_FILL: Record<KanbanStatus, string> = {
	todo: 'bg-subtle',
	in_progress: 'bg-primary',
	code_review: 'bg-[var(--sileo-state-warning)]',
	done: 'bg-green-500',
};

export function DashboardSummaryStrip({
	metrics,
	workspace,
	executionBoardEnabled,
}: DashboardSummaryStripProps) {
	const hasAgent6 = Boolean(workspace.pipeline.agent6Input);

	if (!hasAgent6) {
		return <PipelinePulse metrics={metrics} workspace={workspace} />;
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
	const total = stories.length;
	const committedSp = stories.reduce((sum, s) => sum + s.points, 0);
	const doneSp = stories
		.filter((s) => s.execution.status === 'done')
		.reduce((sum, s) => sum + s.points, 0);

	const statusCounts: Record<KanbanStatus, number> = {
		todo: stories.filter((s) => s.execution.status === 'todo').length,
		in_progress: stories.filter((s) => s.execution.status === 'in_progress').length,
		code_review: stories.filter((s) => s.execution.status === 'code_review').length,
		done: stories.filter((s) => s.execution.status === 'done').length,
	};

	const goalShort = activeSprint
		? activeSprint.sprintGoal.replace(/^Sprint\s+\d+\s*:\s*/i, '').trim() || activeSprint.sprintGoal
		: null;
	const remaining = activeSprint ? daysRemaining(activeSprint.endDate) : null;

	return (
		<section aria-label="Pulso del tablero">
			<CompositionTrack counts={statusCounts} total={total} />

			<div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
				{KANBAN_COLUMNS.map((column) => {
					const count = statusCounts[column.id];
					return (
						<div key={column.id} className="rounded-xl bg-background/40 px-4 py-3.5">
							<div className="flex items-center gap-2">
								<span
									className={`h-1.5 w-1.5 shrink-0 rounded-full ${COLUMN_DOT[column.id]}`}
									aria-hidden
								/>
								<p className="truncate text-[13px] font-semibold tracking-tight text-foreground">
									{column.label}
								</p>
							</div>
							<p
								className={[
									'mt-2.5 text-[28px] font-semibold leading-none tracking-tight tabular-nums',
									count === 0 ? 'text-subtle' : 'text-foreground',
								].join(' ')}
							>
								{count}
							</p>
						</div>
					);
				})}
			</div>

			<div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[12px]">
				<p className="min-w-0 truncate text-muted">
					{activeSprint ? (
						<>
							<span className="font-medium text-foreground">Sprint {activeSprint.number}</span>
							{goalShort ? (
								<>
									<span className="mx-1.5 text-subtle">·</span>
									{truncateInline(goalShort, 42)}
								</>
							) : null}
							{remaining !== null ? (
								<>
									<span className="mx-1.5 text-subtle">·</span>
									<span className="tabular-nums text-subtle">{formatRemaining(remaining)}</span>
								</>
							) : null}
						</>
					) : (
						'Ningún sprint activo'
					)}
				</p>
				<div className="flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums text-subtle">
					{total > 0 ? (
						<span>
							{progress}%
							{' · '}
							{formatEffortTotal(doneSp, metrics.estimationMode)}/
							{formatEffortTotal(committedSp, metrics.estimationMode)}
						</span>
					) : null}
					<Link
						href="/agentes/backlog"
						className="font-medium text-foreground underline-offset-2 hover:underline"
					>
						Backlog
					</Link>
					{executionBoardEnabled ? (
						<Link
							href="/agentes/board"
							className="font-medium text-foreground underline-offset-2 hover:underline"
						>
							Tablero
						</Link>
					) : (
						<Link
							href="/#pricing"
							className="font-medium text-muted underline-offset-2 hover:underline"
						>
							Starter
						</Link>
					)}
				</div>
			</div>
		</section>
	);
}

function PipelinePulse({
	metrics,
	workspace,
}: {
	metrics: DashboardMetrics;
	workspace: UserWorkspace;
}) {
	const steps = [
		{ label: 'Ingesta', href: '/agentes/1', done: workspace.agent1.status === 'approved' },
		{ label: 'Backlog', href: '/agentes/2', done: workspace.agent2.status === 'approved' },
		{ label: 'Estimación', href: '/agentes/3', done: workspace.agent3.status === 'approved' },
		{ label: 'Priorización', href: '/agentes/4', done: workspace.agent4.status === 'approved' },
		{ label: 'Sprints', href: '/agentes/backlog', done: Boolean(workspace.pipeline.agent6Input) },
	];
	const currentIndex = steps.findIndex((step) => !step.done);
	const doneCount = steps.filter((step) => step.done).length;

	return (
		<section aria-label="Pulso del pipeline">
			<div
				className="flex h-1.5 overflow-hidden rounded-full bg-border"
				role="img"
				aria-label={`Pipeline ${doneCount} de 5 pasos`}
			>
				{steps.map((step, index) => (
					<div
						key={step.href}
						className={[
							'h-full flex-1',
							index > 0 ? 'ml-px' : '',
							step.done ? 'bg-primary' : index === currentIndex ? 'bg-foreground/45' : 'bg-transparent',
						].join(' ')}
					/>
				))}
			</div>

			<ol className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
				{steps.map((step, index) => {
					const isCurrent = index === currentIndex;
					return (
						<li key={step.href}>
							<Link
								href={step.href}
								className={[
									'flex flex-col gap-2 rounded-xl px-3.5 py-3 transition-colors',
									isCurrent
										? 'bg-elevated'
										: 'bg-background/40 hover:bg-surface-hover/40',
								].join(' ')}
							>
								<span
									className={[
										'h-1.5 w-1.5 rounded-full',
										step.done ? 'bg-primary' : isCurrent ? 'bg-foreground' : 'bg-border',
									].join(' ')}
									aria-hidden
								/>
								<span
									className={[
										'text-[13px] font-semibold tracking-tight',
										isCurrent ? 'text-foreground' : 'text-muted',
									].join(' ')}
								>
									{step.label}
								</span>
								<span className="text-[11px] text-subtle">
									{step.done ? 'Listo' : isCurrent ? 'En curso' : 'Pendiente'}
								</span>
							</Link>
						</li>
					);
				})}
			</ol>

			<p className="mt-3 text-[12px] text-muted">
				<span className="tabular-nums text-subtle">{metrics.completionCount}/5</span>
				<span className="mx-1.5 text-subtle">·</span>
				<Link
					href={metrics.nextAction.href}
					className="font-medium text-foreground underline-offset-2 hover:underline"
				>
					{metrics.nextAction.label}
				</Link>
			</p>
		</section>
	);
}

function CompositionTrack({
	counts,
	total,
}: {
	counts: Record<KanbanStatus, number>;
	total: number;
}) {
	const label = KANBAN_COLUMNS.map(
		(column) => `${column.label} ${counts[column.id]}`
	).join(', ');

	return (
		<div
			className="flex h-1.5 overflow-hidden rounded-full bg-border"
			role="img"
			aria-label={total > 0 ? label : 'Sin historias en el tablero'}
		>
			{KANBAN_COLUMNS.map((column) => {
				const count = counts[column.id];
				if (total === 0 || count === 0) return null;
				return (
					<div
						key={column.id}
						className={`h-full ${COLUMN_FILL[column.id]}`}
						style={{ width: `${(count / total) * 100}%` }}
						title={`${column.label} ${count}`}
					/>
				);
			})}
		</div>
	);
}

function daysRemaining(endDate: string): number | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return null;
	const end = new Date(`${endDate}T23:59:59`);
	const now = new Date();
	return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatRemaining(days: number): string {
	if (days < 0) return `Venció hace ${Math.abs(days)} d`;
	if (days === 0) return 'Termina hoy';
	return `${days} d restantes`;
}

function truncateInline(text: string, max: number): string {
	return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
