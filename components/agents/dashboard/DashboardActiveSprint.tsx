'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { ActiveSprintHeader } from '@/components/agents/board/ActiveSprintHeader';
import { resolveBoardData, type BoardFilters } from '@/lib/board/board-utils';
import { findActiveSprint } from '@/lib/utils/sprint-plan-mutations';
import { getSprintStatus } from '@/lib/types/agent-5';
import type { PlannedSprint } from '@/lib/types/agent-5';
import type { KanbanStatus } from '@/lib/types/execution';
import type { UserWorkspace } from '@/lib/types/workspace';
import type { DashboardMetrics } from './dashboardMetrics';
import { ExecutionStatusBadge, ExecutionStatusSelect } from './ExecutionStatusBadge';
import { formatEstimation } from '@/lib/utils/estimation';

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
			<section className="border-b border-border/60 pb-5">
				<h2 className="text-[15px] font-semibold tracking-tight text-foreground">Sprint activo</h2>
				<p className="mt-1.5 text-[13px] text-muted">Ningún sprint en curso.</p>
				<p className="mt-1 text-[12px] text-subtle">
					Inicia un sprint planificado desde el backlog para comenzar la ejecución.
				</p>
				<Link
					href="/agentes/backlog"
					className="mt-3 inline-flex items-center text-[12px] font-medium text-foreground underline-offset-2 hover:underline"
				>
					Ir al backlog
				</Link>
			</section>
		);
	}

	const incompleteCount = stories.filter((s) => s.execution.status !== 'done').length;
	const hasNextPlanned = Boolean(
		metrics.plan?.sprints.some((s) => getSprintStatus(s) === 'planned')
	);

	return (
		<section className="flex flex-col gap-4 border-b border-border/60 pb-5" aria-label="Sprint activo">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<h2 className="text-[15px] font-semibold tracking-tight text-foreground">Sprint activo</h2>
				<div className="flex flex-wrap items-center gap-2">
					{executionBoardEnabled ? (
						<Link
							href="/agentes/board"
							className="inline-flex items-center rounded-md px-2.5 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
						>
							Ir al tablero
						</Link>
					) : null}
					{onCompleteSprint ? (
						<button
							type="button"
							onClick={() => setCompleting(true)}
							disabled={lifecycleBusy}
							className="inline-flex cursor-pointer items-center rounded-md bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
						>
							Cerrar sprint
						</button>
					) : null}
				</div>
			</div>

			<ActiveSprintHeader
				sprint={activeSprint}
				stories={stories}
				capacitySp={metrics.plan?.config.sprintCapacitySp}
				flat
			/>

			<div className="overflow-x-auto">
				<table className="w-full min-w-120 text-left text-[12px]">
					<thead>
						<tr className="border-b border-border/50 text-[11px] text-subtle">
							<th className="pb-2.5 pr-4 font-medium">Historia</th>
							<th className="pb-2.5 pr-4 font-medium">Épica</th>
							<th className="hidden pb-2.5 pr-4 font-medium sm:table-cell">Estimación</th>
							<th className="pb-2.5 font-medium">Estado</th>
						</tr>
					</thead>
					<tbody>
						{stories.length === 0 ? (
							<tr>
								<td colSpan={4} className="py-8 text-center text-muted">
									Sin historias en este sprint.
								</td>
							</tr>
						) : (
							stories.map((entry) => (
								<tr
									key={entry.story.id}
									className="border-b border-border/40 transition-colors last:border-b-0 hover:bg-surface-hover/40"
								>
									<td className="py-2.5 pr-4">
										<p className="font-medium text-foreground">{entry.story.title}</p>
										<p className="mt-0.5 text-[11px] text-subtle">{entry.story.id}</p>
									</td>
									<td className="py-2.5 pr-4 text-muted">{entry.epicTitle}</td>
									<td className="hidden py-2.5 pr-4 tabular-nums text-muted sm:table-cell">
										{formatEstimation(entry.estimation, entry.estimationMode)}
									</td>
									<td className="py-2.5">
										{executionBoardEnabled && onUpdateStoryStatus ? (
											<ExecutionStatusSelect
												status={entry.execution.status}
												onChange={(status) => onUpdateStoryStatus(entry.story.id, status)}
												aria-label={`Estado de ${entry.story.title}`}
											/>
										) : (
											<ExecutionStatusBadge status={entry.execution.status} />
										)}
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

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
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="dashboard-complete-sprint-title"
				className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl"
			>
				<h3 id="dashboard-complete-sprint-title" className="text-base font-semibold text-foreground">
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
									className="cursor-pointer rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-hover disabled:opacity-40"
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
