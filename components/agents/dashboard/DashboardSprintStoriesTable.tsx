'use client';

import {
	DndContext,
	DragOverlay,
	PointerSensor,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
	type DragEndEvent,
	type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CategoryBadge } from '@/components/agents/agent-4/CategorySelect';
import { DependencyBadge } from '@/components/agents/agent-5/DependencyBadge';
import { SprintEditModal } from '@/components/agents/agent-5/SprintEditModal';
import { DetailModal } from '@/components/agents/shared/DetailModal';
import { UserStoryDetailContent } from '@/components/agents/shared/UserStoryDetailContent';
import { ViewDetailsButton } from '@/components/agents/shared/ViewDetailsButton';
import { SPRINT_COLORS } from '@/lib/constants/agent-5';
import type { CreateDashboardUserStoryInput, UpdateDashboardUserStoryOptions } from '@/context/WorkspaceContext';
import type { Epic, UserStory } from '@/lib/types/agent-2';
import type { StoryEstimation } from '@/lib/types/agent-3';
import type { PrioritizationFramework, StoryPrioritization } from '@/lib/types/agent-4';
import type { PlannedSprint, SprintDatePatch, SprintPlan } from '@/lib/types/agent-5';
import { formatDateRangeEs } from '@/lib/utils/dates';
import {
	addSprintToPlan,
	deleteEmptySprintAtIndex,
	hasDuplicateSprintIds,
	hasSprintLabelMismatches,
	moveStoryInPlan,
	normalizeSprintPlan,
	updateSprintDates,
	updateSprintGoal,
} from '@/lib/utils/sprint-plan-mutations';
import type { DashboardSprintStoryRow } from './dashboardMetrics';
import {
	DashboardCreateStoryModal,
	DashboardEditStoryModal,
} from './DashboardStoryFormModal';
import { ExecutionStatusBadge } from './ExecutionStatusBadge';
import { useConfirm } from '@/components/agents/shared/ConfirmDialog';
import { errorMessage, notifyError, notifySuccess } from '@/lib/notifications/toast';

interface DashboardSprintStoriesTableProps {
	epics: Epic[];
	estimations: Record<string, StoryEstimation>;
	framework: PrioritizationFramework | null;
	plan: SprintPlan | null;
	rows: DashboardSprintStoryRow[];
	unassignedRows: DashboardSprintStoryRow[];
	onCreateStory: (input: CreateDashboardUserStoryInput) => Promise<void>;
	onDeleteStory: (storyId: string) => Promise<void>;
	onEditStory: (
		storyId: string,
		updates: Partial<UserStory>,
		estimationUpdates?: Partial<StoryEstimation>,
		options?: UpdateDashboardUserStoryOptions,
		prioritizationUpdates?: Partial<StoryPrioritization>
	) => Promise<void>;
	onUpdateSprintPlan?: (plan: SprintPlan) => void;
	onManageEpic?: (epicId: string) => void;
	/** When true, skips the outer section chrome (used inside DashboardSprintPlan). */
	embedded?: boolean;
	/** Controlled create-panel open state (used when embedded). */
	isCreating?: boolean;
	onCreatingChange?: (open: boolean) => void;
}

function parseDragId(id: string): { type: 'story' | 'sprint'; value: string } | null {
	const [type, value] = String(id).split(':');
	if ((type === 'story' || type === 'sprint') && value) {
		return { type, value: type === 'sprint' && value === 'unassigned' ? 'unassigned' : value };
	}
	return null;
}

function getCapacityColor(velocity: number, capacity: number): string {
	const ratio = velocity / capacity;
	if (ratio <= 0.5) return 'bg-emerald-500';
	if (ratio <= 0.75) return 'bg-amber-500';
	if (ratio <= 1.0) return 'bg-orange-500';
	return 'bg-red-500';
}

export function DashboardSprintStoriesTable({
	epics,
	estimations,
	framework,
	plan,
	rows,
	unassignedRows,
	onCreateStory,
	onDeleteStory,
	onEditStory,
	onUpdateSprintPlan,
	onManageEpic,
	embedded = false,
	isCreating: controlledCreating,
	onCreatingChange,
}: DashboardSprintStoriesTableProps) {
	const confirm = useConfirm();
	const [detailRow, setDetailRow] = useState<DashboardSprintStoryRow | null>(null);
	const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
	const [internalCreating, setInternalCreating] = useState(false);
	const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
	const [depsExpanded, setDepsExpanded] = useState(false);
	const [editingSprint, setEditingSprint] = useState<PlannedSprint | null>(null);
	const isCreating = controlledCreating ?? internalCreating;
	const setIsCreating = onCreatingChange ?? setInternalCreating;

	const safePlan = useMemo(() => (plan ? normalizeSprintPlan(plan) : null), [plan]);
	const planRef = useRef(safePlan);
	planRef.current = safePlan;
	const repairAttempted = useRef(false);
	const canManagePlan = Boolean(safePlan && onUpdateSprintPlan);

	useEffect(() => {
		if (!safePlan || !onUpdateSprintPlan || repairAttempted.current) return;
		if (!hasDuplicateSprintIds(plan!) && !hasSprintLabelMismatches(plan!)) return;
		repairAttempted.current = true;
		onUpdateSprintPlan(safePlan);
	}, [plan, safePlan, onUpdateSprintPlan]);

	const sprintOptions = useMemo(() => getSprintOptions(safePlan, rows), [safePlan, rows]);
	const groups = useMemo(
		() => buildSprintGroups(safePlan, rows, unassignedRows),
		[safePlan, rows, unassignedRows]
	);
	const hasContent = groups.some((g) => g.rows.length > 0) || Boolean(safePlan?.sprints.length);
	const storyMap = useMemo(() => {
		const map: Record<string, string> = {};
		for (const row of [...rows, ...unassignedRows]) {
			map[row.story.id] = row.story.title;
		}
		return map;
	}, [rows, unassignedRows]);

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

	const persistPlan = useCallback(
		(nextPlan: SprintPlan) => {
			if (!onUpdateSprintPlan) return;
			planRef.current = nextPlan;
			onUpdateSprintPlan(nextPlan);
		},
		[onUpdateSprintPlan]
	);

	const handleCreateStory = useCallback(
		async (input: CreateDashboardUserStoryInput) => {
			try {
				await onCreateStory(input);
				notifySuccess('HU creada');
			} catch (err) {
				notifyError(errorMessage(err, 'No se pudo crear la HU'));
				throw err;
			}
		},
		[onCreateStory]
	);

	const handleEditStory = useCallback(
		async (
			storyId: string,
			updates: Partial<UserStory>,
			estimationUpdates?: Partial<StoryEstimation>,
			options?: UpdateDashboardUserStoryOptions,
			prioritizationUpdates?: Partial<StoryPrioritization>
		) => {
			try {
				await onEditStory(storyId, updates, estimationUpdates, options, prioritizationUpdates);
				const onlyCriteria =
					Object.keys(updates).length === 1 && updates.acceptanceCriteria !== undefined;
				notifySuccess(onlyCriteria ? 'Criterios de aceptación actualizados' : 'HU actualizada');
			} catch (err) {
				notifyError(errorMessage(err, 'No se pudo guardar la HU'));
				throw err;
			}
		},
		[onEditStory]
	);

	const handleDeleteStory = useCallback(
		async (storyId: string) => {
			try {
				await onDeleteStory(storyId);
				notifySuccess(`${storyId} eliminada`);
			} catch (err) {
				notifyError(errorMessage(err, 'No se pudo eliminar la HU'));
				throw err;
			}
		},
		[onDeleteStory]
	);

	const handleMoveStory = useCallback(
		(storyId: string, fromSprintId: string | null, toSprintId: string | null) => {
			const current = planRef.current;
			if (!current || !onUpdateSprintPlan) return;
			const storyPoints = estimations[storyId]?.points ?? 0;
			persistPlan(moveStoryInPlan(current, storyId, fromSprintId, toSprintId, storyPoints));
		},
		[estimations, onUpdateSprintPlan, persistPlan]
	);

	const handleAddSprint = useCallback(() => {
		const current = planRef.current;
		if (!current) return;
		persistPlan(addSprintToPlan(current));
	}, [persistPlan]);

	const handleDeleteSprint = useCallback(
		async (sprintIndex: number) => {
			const current = planRef.current;
			if (!current) return;
			const nextPlan = deleteEmptySprintAtIndex(current, sprintIndex);
			if (!nextPlan) return;
			const confirmed = await confirm({
				title: '¿Eliminar este sprint vacío?',
				description: 'El sprint se quitará del plan. Esta acción no se puede deshacer.',
				confirmLabel: 'Eliminar',
				variant: 'danger',
			});
			if (!confirmed) return;
			persistPlan(nextPlan);
			notifySuccess('Sprint eliminado');
		},
		[confirm, persistPlan]
	);

	const handleGoalChange = useCallback(
		(sprintId: string, goal: string) => {
			const current = planRef.current;
			if (!current) return;
			persistPlan(updateSprintGoal(current, sprintId, goal));
		},
		[persistPlan]
	);

	const handleDatesChange = useCallback(
		(sprintId: string, patch: SprintDatePatch) => {
			const current = planRef.current;
			if (!current) return;
			persistPlan(updateSprintDates(current, sprintId, patch));
		},
		[persistPlan]
	);

	const handleDragStart = (event: DragStartEvent) => {
		const parsed = parseDragId(String(event.active.id));
		if (parsed?.type === 'story') setActiveStoryId(parsed.value);
	};

	const handleDragEnd = (event: DragEndEvent) => {
		setActiveStoryId(null);
		const { active, over } = event;
		if (!over || !canManagePlan) return;

		const activeParsed = parseDragId(String(active.id));
		if (activeParsed?.type !== 'story') return;

		const storyId = activeParsed.value;
		const fromSprintId = (active.data.current?.sprintId as string | null) ?? null;
		const overParsed = parseDragId(String(over.id));

		let toSprintId: string | null;
		if (overParsed?.type === 'sprint') {
			toSprintId = overParsed.value === 'unassigned' ? null : overParsed.value;
		} else if (overParsed?.type === 'story') {
			toSprintId = (over.data.current?.sprintId as string | null | undefined) ?? null;
		} else {
			return;
		}

		if (fromSprintId === toSprintId) return;
		handleMoveStory(storyId, fromSprintId, toSprintId);
	};

	const activeStoryTitle = activeStoryId
		? [...rows, ...unassignedRows].find((r) => r.story.id === activeStoryId)?.story.title
		: null;

	const editingRow = useMemo(
		() =>
			editingStoryId
				? [...rows, ...unassignedRows].find((row) => row.story.id === editingStoryId) ?? null
				: null,
		[editingStoryId, rows, unassignedRows]
	);

	const dependenciesBanner =
		safePlan && safePlan.dependencies.length > 0 ? (
			<div className="border-b border-border px-6 pt-5">
				<div className="rounded-xl border mb-4 border-amber-400/20 bg-amber-400/5">
					<button
						type="button"
						onClick={() => setDepsExpanded(!depsExpanded)}
						className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-left transition-colors hover:bg-amber-400/5"
						aria-expanded={depsExpanded}
					>
						<div className="flex items-center gap-2">
							<svg
								className="h-3.5 w-3.5 text-amber-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
								/>
							</svg>
							<span className="text-xs font-medium text-amber-700">
								{safePlan.dependencies.length} dependencia
								{safePlan.dependencies.length !== 1 ? 's' : ''} entre historias
							</span>
						</div>
						<span className="text-[10px] text-amber-600/80">{depsExpanded ? 'Ocultar' : 'Ver'}</span>
					</button>
					{depsExpanded && (
						<div className="flex flex-wrap gap-1 border-t border-amber-400/15 px-4 py-2.5">
							{safePlan.dependencies.map((dep) => (
								<DependencyBadge
									key={`${dep.storyId}-${dep.dependsOnStoryId}`}
									storyId={dep.storyId}
									dependencies={[dep]}
									storyMap={storyMap}
									isDetailed
								/>
							))}
						</div>
					)}
				</div>
			</div>
		) : null;

	const tableBody = hasContent ? (
		<div className="@container min-w-0">
			<table className="w-full table-fixed border-collapse text-left">
				<thead className="border-b border-border bg-surface-muted/60">
					<tr className="text-[11px] font-bold uppercase tracking-[0.14em] text-subtle">
						<th className="hidden w-24 px-3 py-3 @3xl:table-cell @3xl:px-4">ID</th>
						<th className="min-w-0 px-3 py-3 @lg:px-4">HU</th>
						<th className="hidden w-[18%] px-3 py-3 @2xl:table-cell @2xl:px-4">Epica</th>
						<th className="w-12 px-2 py-3 @lg:w-14 @lg:px-3">SP</th>
						<th className="w-27 px-2 py-3 @xl:w-32 @xl:px-3">Prioridad</th>
						<th className="hidden w-22 px-2 py-3 @xl:table-cell @xl:px-3">Estado</th>
						<th className="w-23 px-2 py-3 text-right @lg:w-27 @lg:px-3">Acciones</th>
					</tr>
				</thead>
				<tbody>
					{groups.map((group) => (
						<SprintGroupRows
							key={group.key}
							framework={framework}
							group={group}
							canManagePlan={canManagePlan}
							capacitySp={safePlan?.config.sprintCapacitySp ?? 20}
							onDeleteStory={handleDeleteStory}
							onOpenDetail={setDetailRow}
							onStartEdit={setEditingStoryId}
							onEditSprint={
								group.sprint
									? () => setEditingSprint(group.sprint)
									: undefined
							}
							onDeleteSprint={
								group.sprintIndex != null && group.sprint?.storyIds.length === 0
									? () => handleDeleteSprint(group.sprintIndex!)
									: undefined
							}
							onManageEpic={onManageEpic}
						/>
					))}
				</tbody>
			</table>
		</div>
	) : (
		<div className="px-6 py-10">
			<div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-8 text-center">
				<p className="text-sm font-semibold text-foreground">
					{canManagePlan
						? 'Crea tu primer sprint'
						: 'Todavía no hay sprints para mostrar.'}
				</p>
				<p className="mt-2 text-sm text-muted">
					{canManagePlan
						? 'Todas las historias están en el backlog. Crea un sprint y arrastra las HU que quieras incluir.'
						: 'Cuando haya un plan de sprints, esta tabla mostrará las HU organizadas.'}
				</p>
				{canManagePlan && safePlan ? (
					<button
						type="button"
						onClick={() => handleAddSprint()}
						className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
					>
						<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
						</svg>
						Crear sprint
					</button>
				) : null}
			</div>
		</div>
	);

	const addSprintButton =
		canManagePlan && safePlan ? (
			<div className="px-6 py-4">
				<button
					type="button"
					onClick={() => handleAddSprint()}
					className={[
						'flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border',
						'px-5 py-4 text-sm font-medium',
						safePlan.sprints.length === 0
							? 'border-primary/40 bg-primary/5 text-foreground hover:bg-primary/10'
							: 'text-muted hover:border-primary hover:bg-primary/5 hover:text-foreground',
						'cursor-pointer transition-colors',
					].join(' ')}
				>
					<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
					</svg>
					{safePlan.sprints.length === 0 ? 'Crear sprint' : 'Nuevo sprint'}
				</button>
			</div>
		) : null;

	const tableContent = (
		<>
			{dependenciesBanner}
			<DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
				{tableBody}
				{addSprintButton}
				<DragOverlay>
					{activeStoryTitle ? (
						<div className="rounded-lg border border-border bg-surface px-4 py-2 shadow-sm">
							<span className="text-sm font-semibold text-foreground">{activeStoryTitle}</span>
						</div>
					) : null}
				</DragOverlay>
			</DndContext>

			{editingSprint && safePlan && (
				<SprintEditModal
					open={Boolean(editingSprint)}
					onClose={() => setEditingSprint(null)}
					sprint={editingSprint}
					sprintIndex={safePlan.sprints.findIndex((s) => s.id === editingSprint.id)}
					allSprints={safePlan.sprints}
					defaultDurationWeeks={safePlan.config.sprintDurationWeeks}
					onGoalChange={(goal) => handleGoalChange(editingSprint.id, goal)}
					onDatesChange={(patch) => handleDatesChange(editingSprint.id, patch)}
				/>
			)}

			<DashboardCreateStoryModal
				open={isCreating}
				onClose={() => setIsCreating(false)}
				epics={epics}
				framework={framework}
				sprintOptions={sprintOptions}
				onCreate={async (input) => {
					await handleCreateStory(input);
					setIsCreating(false);
				}}
			/>

			{editingRow ? (
				<DashboardEditStoryModal
					open={Boolean(editingRow)}
					onClose={() => setEditingStoryId(null)}
					row={editingRow}
					epics={epics}
					framework={framework}
					sprintOptions={sprintOptions}
					onSave={async (updates, estimationUpdates, options, prioritizationUpdates) => {
						await handleEditStory(
							editingRow.story.id,
							updates,
							estimationUpdates,
							options,
							prioritizationUpdates
						);
						setEditingStoryId(null);
					}}
				/>
			) : null}

			<DetailModal
				open={Boolean(detailRow)}
				onClose={() => setDetailRow(null)}
				title={detailRow?.story.title ?? ''}
				subtitle={detailRow?.story.id}
				eyebrow={detailRow?.sprintNumber ? `Sprint ${detailRow.sprintNumber}` : 'Historia de usuario'}
				maxWidth="xl"
			>
				{detailRow && (
					<>
						<div className="mb-4">
							<ExecutionStatusBadge status={detailRow.executionStatus} />
						</div>
						<UserStoryDetailContent
							story={detailRow.story}
							epicTitle={detailRow.epicTitle}
							estimation={detailRow.estimation}
							prioritization={detailRow.prioritization}
							framework={framework ?? undefined}
						/>
					</>
				)}
			</DetailModal>
		</>
	);

	if (embedded) {
		return <div className="min-w-0">{tableContent}</div>;
	}

	return (
		<section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface/80 shadow-sm">
			<div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-6 py-5">
				<div>
					<p className="text-[11px] font-bold uppercase tracking-[0.16em] text-subtle">Plan de sprints</p>
					<h2 className="mt-2 text-xl font-bold text-foreground">Sprints e historias de usuario</h2>
					<p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
						Ajusta sprints e historias en un solo lugar. Arrastra HU entre sprints o edita su contenido.
					</p>
				</div>
				<div className="flex flex-wrap items-start gap-3">
					<button
						type="button"
						onClick={() => setIsCreating(true)}
						disabled={epics.length === 0 || isCreating}
						className={[
							'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all',
							epics.length > 0 && !isCreating
								? 'bg-primary text-white hover:bg-primary-hover'
								: 'cursor-not-allowed bg-disabled text-disabled-text',
						].join(' ')}
					>
						<PlusIcon />
						Nueva HU
					</button>
					<div className="rounded-2xl border border-border bg-surface px-4 py-3 text-right">
						<p className="text-[11px] font-bold uppercase tracking-[0.16em] text-subtle">HU planificadas</p>
						<p className="mt-1 text-2xl font-bold text-foreground">{rows.length}</p>
					</div>
				</div>
			</div>
			{tableContent}
		</section>
	);
}

interface SprintRowsGroup {
	key: string;
	label: string;
	meta: string;
	rows: DashboardSprintStoryRow[];
	sprint: PlannedSprint | null;
	sprintIndex: number | null;
	colorClass: string;
	isUnassigned: boolean;
	velocitySp: number;
}

interface SprintOption {
	id: string;
	label: string;
}

function buildSprintGroups(
	plan: SprintPlan | null,
	rows: DashboardSprintStoryRow[],
	unassignedRows: DashboardSprintStoryRow[]
): SprintRowsGroup[] {
	const rowsBySprint = new Map<string, DashboardSprintStoryRow[]>();
	rows.forEach((row) => {
		if (!row.sprintId) return;
		const list = rowsBySprint.get(row.sprintId) ?? [];
		list.push(row);
		rowsBySprint.set(row.sprintId, list);
	});

	const groups: SprintRowsGroup[] = [];

	if (plan) {
		plan.sprints.forEach((sprint, idx) => {
			groups.push({
				key: sprint.id,
				label: `Sprint ${sprint.number}`,
				meta: [
					sprint.sprintGoal,
					formatDateRangeEs(sprint.startDate, sprint.endDate),
				]
					.filter(Boolean)
					.join(' · '),
				rows: rowsBySprint.get(sprint.id) ?? [],
				sprint,
				sprintIndex: idx,
				colorClass: SPRINT_COLORS[idx % SPRINT_COLORS.length],
				isUnassigned: false,
				velocitySp: sprint.velocitySp,
			});
		});
	} else {
		const fallback = groupRowsBySprint(rows);
		fallback.forEach((group) => {
			groups.push({
				...group,
				sprint: null,
				sprintIndex: null,
				colorClass: 'border-l-border',
				isUnassigned: group.key === 'unassigned',
				velocitySp: group.rows.reduce((sum, r) => sum + (r.estimation?.points ?? 0), 0),
			});
		});
	}

	const unresolvedUnassigned =
		plan != null
			? unassignedRows
			: rows.filter((r) => !r.sprintId);

	if (plan || unresolvedUnassigned.length > 0) {
		groups.unshift({
			key: 'unassigned',
			label: 'Backlog',
			meta: 'Suelta historias aquí o arrástralas a un sprint',
			rows: plan ? unassignedRows : unresolvedUnassigned,
			sprint: null,
			sprintIndex: null,
			colorClass: 'border-l-border',
			isUnassigned: true,
			velocitySp: (plan ? unassignedRows : unresolvedUnassigned).reduce(
				(sum, r) => sum + (r.estimation?.points ?? 0),
				0
			),
		});
	}

	return groups;
}

function groupRowsBySprint(rows: DashboardSprintStoryRow[]): Omit<
	SprintRowsGroup,
	'sprint' | 'sprintIndex' | 'colorClass' | 'isUnassigned' | 'velocitySp'
>[] {
	const groups = new Map<
		string,
		Omit<SprintRowsGroup, 'sprint' | 'sprintIndex' | 'colorClass' | 'isUnassigned' | 'velocitySp'>
	>();

	rows.forEach((row) => {
		const key = row.sprintId ?? 'unassigned';
		const existing = groups.get(key);
		if (existing) {
			existing.rows.push(row);
			return;
		}

		groups.set(key, {
			key,
			label: row.sprintNumber ? `Sprint ${row.sprintNumber}` : 'Sin sprint',
			meta: [row.sprintGoal, formatDateRange(row.startDate, row.endDate)].filter(Boolean).join(' / '),
			rows: [row],
		});
	});

	return Array.from(groups.values());
}

function getSprintOptions(plan: SprintPlan | null, rows: DashboardSprintStoryRow[]): SprintOption[] {
	const options = new Map<string, SprintOption>();

	plan?.sprints.forEach((sprint) => {
		options.set(sprint.id, {
			id: sprint.id,
			label: `Sprint ${sprint.number}`,
		});
	});

	rows.forEach((row) => {
		if (!row.sprintId || !row.sprintNumber) return;
		options.set(row.sprintId, {
			id: row.sprintId,
			label: `Sprint ${row.sprintNumber}`,
		});
	});

	return Array.from(options.values());
}

function SprintGroupRows({
	framework,
	group,
	canManagePlan,
	capacitySp,
	onDeleteStory,
	onOpenDetail,
	onStartEdit,
	onEditSprint,
	onDeleteSprint,
	onManageEpic,
}: {
	framework: PrioritizationFramework | null;
	group: SprintRowsGroup;
	canManagePlan: boolean;
	capacitySp: number;
	onDeleteStory: (storyId: string) => Promise<void>;
	onOpenDetail: (row: DashboardSprintStoryRow) => void;
	onStartEdit: (storyId: string) => void;
	onEditSprint?: () => void;
	onDeleteSprint?: () => void;
	onManageEpic?: (epicId: string) => void;
}) {
	const dropId = group.isUnassigned ? 'sprint:unassigned' : `sprint:${group.key}`;
	const { setNodeRef, isOver } = useDroppable({
		id: dropId,
		data: { sprintId: group.isUnassigned ? null : group.key },
		disabled: !canManagePlan,
	});

	const capacityPct = Math.round((group.velocitySp / capacitySp) * 100);
	const isOverCapacity = group.velocitySp > capacitySp;

	return (
		<>
			<tr
				ref={canManagePlan ? setNodeRef : undefined}
				className={[
					'border-b border-border bg-surface-hover/50',
					group.colorClass,
					'border-l-4',
					isOver ? 'bg-primary/10 ring-2 ring-inset ring-primary/20' : '',
				].join(' ')}
			>
				<td colSpan={7} className="px-3 py-3 @lg:px-6">
					<div className="flex flex-wrap items-center gap-2 @lg:gap-3">
						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-2">
								<span className="text-sm font-bold text-foreground">{group.label}</span>
								{group.sprint?.isEdited && (
									<span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-amber-600">
										editado
									</span>
								)}
							</div>
							{group.sprint && onEditSprint ? (
								<button
									type="button"
									onClick={onEditSprint}
									className="mt-0.5 block max-w-full cursor-pointer truncate text-left text-xs text-muted transition-colors hover:text-primary @2xl:max-w-2xl"
									title="Editar sprint"
								>
									{group.meta}
								</button>
							) : (
								<span className="mt-0.5 block truncate text-xs text-muted">{group.meta}</span>
							)}
						</div>

						{!group.isUnassigned && (
							<div
								className="h-2 w-14 shrink-0 overflow-hidden rounded-full bg-surface-muted @md:w-20 @xl:w-24"
								title={`${group.velocitySp}/${capacitySp} SP`}
							>
								<div
									className={`h-full rounded-full transition-all ${getCapacityColor(group.velocitySp, capacitySp)} ${isOverCapacity ? 'ring-1 ring-amber-400/40' : ''}`}
									style={{ width: `${Math.min(capacityPct, 100)}%` }}
								/>
							</div>
						)}

						<span className="shrink-0 rounded-full border border-border bg-surface px-2 py-1 text-[11px] font-bold text-foreground @lg:px-2.5 @lg:text-xs">
							{group.rows.length} HU · {group.velocitySp} SP
						</span>

						{onDeleteSprint && (
							<button
								type="button"
								onClick={onDeleteSprint}
								className="cursor-pointer rounded-lg px-1.5 py-1 text-muted transition-colors hover:text-danger"
								title="Eliminar sprint vacÃ­o"
								aria-label="Eliminar sprint vacÃ­o"
							>
								<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
									<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						)}
					</div>
				</td>
			</tr>
			{group.rows.length === 0 ? (
				<tr className={isOver ? 'bg-primary/5' : ''}>
					<td colSpan={7} className="px-3 py-6 text-center text-xs text-muted @lg:px-6">
						{canManagePlan
							? group.isUnassigned
								? 'Suelta historias aquí para desasignarlas'
								: 'Sin historias, arrastra aquí­ para asignar.'
							: 'Sin historias asignadas.'}
					</td>
				</tr>
			) : (
				group.rows.map((row) => (
					<StoryReadOnlyRow
						key={row.id}
						framework={framework}
						row={row}
						canDrag={canManagePlan}
						onDelete={async () => onDeleteStory(row.story.id)}
						onOpenDetail={() => onOpenDetail(row)}
						onStartEdit={() => onStartEdit(row.story.id)}
						onManageEpic={onManageEpic}
					/>
				))
			)}
		</>
	);
}

function StoryReadOnlyRow({
	framework,
	row,
	canDrag,
	onDelete,
	onOpenDetail,
	onStartEdit,
	onManageEpic,
}: {
	framework: PrioritizationFramework | null;
	row: DashboardSprintStoryRow;
	canDrag: boolean;
	onDelete: () => Promise<void>;
	onOpenDetail: () => void;
	onStartEdit: () => void;
	onManageEpic?: (epicId: string) => void;
}) {
	const confirm = useConfirm();
	const [isDeleting, setIsDeleting] = useState(false);
	const dragId = `story:${row.story.id}`;
	const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
		id: dragId,
		data: { storyId: row.story.id, sprintId: row.sprintId },
		disabled: !canDrag,
	});

	const style = transform
		? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }
		: isDragging
			? { opacity: 0.5 }
			: undefined;

	return (
		<tr
			ref={canDrag ? setNodeRef : undefined}
			style={style}
			className={[
				'border-b border-border/70 transition-colors hover:bg-surface-hover/40',
				isDragging ? 'bg-surface-muted/50' : '',
			].join(' ')}
		>
			<td className="hidden px-3 py-3 align-top @3xl:table-cell @3xl:px-4 @3xl:py-4">
				<span className="font-mono text-xs font-bold text-muted">{row.story.id}</span>
			</td>
			<td className="min-w-0 px-3 py-3 align-top @lg:px-4 @lg:py-4">
				<div className="flex items-start gap-2">
					{canDrag ? (
						<button
							type="button"
							className="mt-0.5 shrink-0 cursor-grab touch-none rounded p-0.5 text-muted/50 transition-colors hover:bg-surface-muted hover:text-foreground active:cursor-grabbing"
							aria-label="Arrastrar historia"
							{...listeners}
							{...attributes}
						>
							<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
							</svg>
						</button>
					) : null}
					<div className="min-w-0 flex-1">
						<span className="mb-0.5 block font-mono text-[11px] font-bold text-muted @3xl:hidden">
							{row.story.id}
						</span>
						<p className="line-clamp-2 text-sm font-semibold text-foreground" title={row.story.title}>
							{row.story.title}
						</p>
						<p className="mt-1 line-clamp-1 text-sm leading-relaxed text-muted @2xl:line-clamp-2">
							{row.story.description}
						</p>
						{onManageEpic ? (
							<button
								type="button"
								onClick={() => onManageEpic(row.epicId)}
								className="mt-1 block max-w-full cursor-pointer truncate text-left text-xs text-muted transition-colors hover:text-foreground @2xl:hidden"
								title="Gestionar épica"
							>
								{row.epicTitle}
							</button>
						) : (
							<p className="mt-1 truncate text-xs text-muted @2xl:hidden" title={row.epicTitle}>
								{row.epicTitle}
							</p>
						)}
						<div className="mt-1.5 @xl:hidden">
							<ExecutionStatusBadge status={row.executionStatus} />
						</div>
					</div>
				</div>
			</td>
			<td className="hidden min-w-0 px-3 py-3 align-top text-sm text-muted @2xl:table-cell @2xl:px-4 @2xl:py-4">
				{onManageEpic ? (
					<button
						type="button"
						onClick={() => onManageEpic(row.epicId)}
						className="line-clamp-2 cursor-pointer text-left transition-colors hover:text-foreground"
						title="Gestionar épica"
					>
						{row.epicTitle}
					</button>
				) : (
					<span className="line-clamp-2" title={row.epicTitle}>
						{row.epicTitle}
					</span>
				)}
			</td>
			<td className="px-2 py-3 align-top @lg:px-3 @lg:py-4">
				<span className="inline-flex min-w-8 justify-center rounded-lg border border-border bg-surface px-1.5 py-1 text-xs font-bold text-foreground @lg:px-2">
					{row.estimation?.points ?? 0}
				</span>
			</td>
			<td className="min-w-0 px-2 py-3 align-top @xl:px-3 @xl:py-4">
				{framework && row.prioritization ? (
					<div className="max-w-full overflow-hidden [&_span]:max-w-full [&_span]:truncate">
						<CategoryBadge framework={framework} category={row.prioritization.category} />
					</div>
				) : (
					<span className="text-xs text-muted">N/D</span>
				)}
			</td>
			<td className="hidden px-2 py-3 align-top @xl:table-cell @xl:px-3 @xl:py-4">
				<ExecutionStatusBadge status={row.executionStatus} />
			</td>
			<td className="px-2 py-3 align-top @lg:px-3 @lg:py-4">
				<div className="flex justify-end gap-0.5 @lg:gap-1.5">
					<ViewDetailsButton onClick={onOpenDetail} label="Ver HU en detalle" />
					<button
						type="button"
						onClick={onStartEdit}
						aria-label="Editar HU"
						title="Editar HU"
						className="inline-flex cursor-pointer items-center justify-center rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
					>
						<EditIcon />
					</button>
					<button
						type="button"
						onClick={async () => {
							const confirmed = await confirm({
								title: `Â¿Eliminar ${row.story.id}?`,
								description: `"${row.story.title}" se eliminarÃ¡ del backlog. Esta acciÃ³n no se puede deshacer.`,
								confirmLabel: 'Eliminar',
								variant: 'danger',
							});
							if (!confirmed) return;
							setIsDeleting(true);
							try {
								await onDelete();
							} finally {
								setIsDeleting(false);
							}
						}}
						disabled={isDeleting}
						aria-label="Eliminar HU"
						title="Eliminar HU"
						className={[
							'cursor-pointer inline-flex items-center justify-center rounded-lg p-1.5 text-muted transition-all',
							isDeleting
								? 'cursor-not-allowed opacity-60'
								: 'hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/30',
						].join(' ')}
					>
						<TrashIcon />
					</button>
				</div>
			</td>
		</tr>
	);
}

function formatDateRange(startDate: string | null, endDate: string | null): string {
	if (!startDate || !endDate) return '';
	return `${startDate} - ${endDate}`;
}

function EditIcon() {
	return (
		<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
			/>
		</svg>
	);
}

function PlusIcon() {
	return (
		<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
			<path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
		</svg>
	);
}

function TrashIcon() {
	return (
		<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
			/>
		</svg>
	);
}
