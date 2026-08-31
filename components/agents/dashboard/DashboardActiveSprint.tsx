'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { WorkItemIdLabel } from '@/components/agents/shared/WorkItemTypeBadge';
import { resolveBoardData, type BoardFilters } from '@/lib/board/board-utils';
import { findActiveSprint } from '@/lib/utils/sprint-plan-mutations';
import { backlogStoryHref } from '@/lib/utils/backlog-story-navigation';
import { getSprintStatus } from '@/lib/types/agent-5';
import { KANBAN_COLUMNS, type KanbanStatus } from '@/lib/types/execution';
import type { PlannedSprint } from '@/lib/types/agent-5';
import type { UserWorkspace } from '@/lib/types/workspace';
import type { DashboardMetrics } from './dashboardMetrics';
import { ExecutionStatusBadge, ExecutionStatusSelect } from './ExecutionStatusBadge';
import { formatEstimation } from '@/lib/utils/estimation';

const COLUMN_DOT: Record<KanbanStatus, string> = {
	todo: 'bg-subtle',
	in_progress: 'bg-primary',
	code_review: 'bg-[var(--sileo-state-warning)]',
	done: 'bg-green-500',
};

interface DashboardActiveSprintProps {
	metrics: DashboardMetrics;
	workspace: UserWorkspace;
	executionBoardEnabled: boolean;
	onUpdateStoryStatus?: (storyId: string, status: KanbanStatus) => Promise<void>;
	onCompleteSprint?: (
		sprintId: string,
		rollover?: 'backlog' | 'next_planned'
	) => Promise<void>;
}

export function DashboardActiveSprint({
	metrics,
	workspace,
	executionBoardEnabled,
	onUpdateStoryStatus,
	onCompleteSprint,
}: DashboardActiveSprintProps) {
	const activeSprint = metrics.plan ? findActiveSprint(metrics.plan) : null;
	const [completing, setCompleting] = useState(false);
	const [lifecycleBusy, setLifecycleBusy] = useState(false);

	const filters: BoardFilters = useMemo(
		() => ({
			sprintFilter: activeSprint?.id ?? 'all',
			epicId: 'all',
			assigneeId: 'all',
			typeFilter: 'all',
			search: '',
		}),
		[activeSprint?.id]
	);

	const { stories } = useMemo(
		() => (activeSprint ? resolveBoardData(workspace, filters) : { stories: [] }),
		[activeSprint, workspace, filters]
	);

	const groupedStories = useMemo(
		() =>
			KANBAN_COLUMNS.map((column) => ({
				...column,
				items: stories.filter((entry) => entry.execution.status === column.id),
			})).filter((group) => group.items.length > 0),
		[stories]
	);

	const handleCompleteSprint = useCallback(
		async (rollover: 'backlog' | 'next_planned') => {
			if (!activeSprint || !onCompleteSprint || lifecycleBusy) return;
			setLifecycleBusy(true);
			try {
				await onCompleteSprint(activeSprint.id, rollover);
				setCompleting(false);
			} finally {
				setLifecycleBusy(false);
			}
		},
		[activeSprint, lifecycleBusy, onCompleteSprint]
	);

	if (!activeSprint) {
		return (
			<section>
				<h2 className="text-[15px] font-semibold tracking-tight text-foreground">Sprint activo</h2>
				<div className="mt-4 rounded-xl bg-background/40 px-5 py-8">
					<p className="text-[13px] font-medium text-foreground">Ningún sprint en curso</p>
					<p className="mt-1 max-w-sm text-[12px] leading-relaxed text-muted">
						Inicia un sprint planificado desde el backlog para comenzar la ejecución.
					</p>
					<Link
						href="/agentes/backlog"
						className="mt-4 inline-flex items-center rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition-opacity hover:opacity-90"
					>
						Ir al backlog
					</Link>
				</div>
			</section>
		);
	}

	const incompleteCount = stories.filter((s) => s.execution.status !== 'done').length;
	const hasNextPlanned = Boolean(
		metrics.plan?.sprints.some((s) => getSprintStatus(s) === 'planned')
	);

	return (
		<section className="min-w-0" aria-label="Sprint activo">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0">
					<h2 className="text-[15px] font-semibold tracking-tight text-foreground">
						Sprint {activeSprint.number}
					</h2>
					<p className="mt-0.5 truncate text-[12px] text-muted">
						{stories.length} historia{stories.length !== 1 ? 's' : ''}
						{' · '}
						{activeSprint.startDate} → {activeSprint.endDate}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{executionBoardEnabled ? (
						<Link
							href="/agentes/board"
							className="inline-flex items-center rounded-lg bg-surface-muted px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
						>
							Ir al tablero
						</Link>
					) : null}
					{onCompleteSprint ? (
						<button
							type="button"
							onClick={() => setCompleting(true)}
							disabled={lifecycleBusy}
							className="inline-flex cursor-pointer items-center rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
						>
							Cerrar sprint
						</button>
					) : null}
				</div>
			</div>

			{stories.length === 0 ? (
				<p className="mt-6 text-[13px] text-muted">Sin historias en este sprint.</p>
			) : (
				<div className="mt-5 flex flex-col gap-6">
					{groupedStories.map((group) => (
						<div key={group.id}>
							<div className="mb-2 flex items-center gap-2">
								<span className={`h-1.5 w-1.5 rounded-full ${COLUMN_DOT[group.id]}`} aria-hidden />
								<h3 className="text-[13px] font-semibold tracking-tight text-foreground">
									{group.label}
								</h3>
								<span className="tabular-nums text-[11px] text-subtle">{group.items.length}</span>
							</div>
							<ul className="flex flex-col">
								{group.items.map((entry) => (
									<li
										key={entry.story.id}
										className="flex gap-3 border-b border-border/60 last:border-b-0"
									>
										<span
											className={`mt-3.5 h-8 w-0.5 shrink-0 rounded-full ${COLUMN_DOT[group.id]}`}
											aria-hidden
										/>
										<div className="flex min-w-0 flex-1 items-start justify-between gap-3 py-3 pr-1">
											<div className="min-w-0">
												<div className="flex min-w-0 flex-wrap items-center gap-2">
													<WorkItemIdLabel id={entry.story.id} type={entry.story.type} />
													<Link
														href={backlogStoryHref(entry.story.id)}
														className="min-w-0 text-[13px] font-medium text-foreground hover:text-primary"
													>
														<span className="line-clamp-2">{entry.story.title}</span>
													</Link>
												</div>
												<p className="mt-1 truncate text-[11px] text-subtle">
													{entry.epicTitle}
													<span className="mx-1.5">·</span>
													<span className="tabular-nums">
														{formatEstimation(entry.estimation, entry.estimationMode)}
													</span>
												</p>
											</div>
											<div className="shrink-0 pt-0.5">
												{executionBoardEnabled && onUpdateStoryStatus ? (
													<ExecutionStatusSelect
														status={entry.execution.status}
														onChange={(status) => onUpdateStoryStatus(entry.story.id, status)}
														aria-label={`Estado de ${entry.story.title}`}
													/>
												) : (
													<ExecutionStatusBadge status={entry.execution.status} />
												)}
											</div>
										</div>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
			)}

			{completing ? (
				<CompleteSprintDialog
					sprint={activeSprint}
					incompleteCount={incompleteCount}
					hasNextPlanned={hasNextPlanned}
					busy={lifecycleBusy}
					onCancel={() => setCompleting(false)}
					onConfirm={handleCompleteSprint}
				/>
			) : null}
		</section>
	);
}

function CompleteSprintDialog({
	sprint,
	incompleteCount,
	hasNextPlanned,
	busy,
	onCancel,
	onConfirm,
}: {
	sprint: PlannedSprint;
	incompleteCount: number;
	hasNextPlanned: boolean;
	busy: boolean;
	onCancel: () => void;
	onConfirm: (rollover: 'backlog' | 'next_planned') => void;
}) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="dashboard-complete-sprint-title"
				className="w-full max-w-md rounded-xl border border-border bg-surface p-5"
			>
				<h3 id="dashboard-complete-sprint-title" className="text-[15px] font-semibold tracking-tight text-foreground">
					¿Cerrar Sprint {sprint.number}?
				</h3>
				<p className="mt-2 text-sm text-muted">
					{incompleteCount === 0
						? 'Todas las historias están hechas. El sprint quedará cerrado.'
						: `${incompleteCount} historia${incompleteCount !== 1 ? 's' : ''} incompleta${incompleteCount !== 1 ? 's' : ''} saldrán del sprint.`}
				</p>
				<div className="mt-5 flex flex-col gap-2">
					{incompleteCount > 0 ? (
						<>
							<button
								type="button"
								disabled={busy}
								onClick={() => onConfirm('backlog')}
								className="cursor-pointer rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-40"
							>
								Mover incompletas al backlog
							</button>
							{hasNextPlanned ? (
								<button
									type="button"
									disabled={busy}
									onClick={() => onConfirm('next_planned')}
									className="cursor-pointer rounded-lg bg-surface-muted px-3 py-2 text-sm font-medium text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-40"
								>
									Mover al siguiente sprint planificado
								</button>
							) : null}
						</>
					) : (
						<button
							type="button"
							disabled={busy}
							onClick={() => onConfirm('backlog')}
							className="cursor-pointer rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-40"
						>
							Cerrar sprint
						</button>
					)}
					<button
						type="button"
						disabled={busy}
						onClick={onCancel}
						className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-muted hover:text-foreground disabled:opacity-40"
					>
						Cancelar
					</button>
				</div>
			</div>
		</div>
	);
}
