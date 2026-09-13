'use client';

import {
	DndContext,
	DragOverlay,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
	type DragStartEvent,
} from '@dnd-kit/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DependencyBadge } from '@/components/agents/agent-5/DependencyBadge';
import { SprintEditModal } from '@/components/agents/agent-5/SprintEditModal';
import { BacklogStoriesSection } from '@/components/agents/backlog/BacklogStoriesSection';
import {
	partitionSprintGroups,
	splitSprintGroups,
} from '@/components/agents/backlog/sprint-plan-groups';
import { SprintPlanSection } from '@/components/agents/backlog/SprintPlanSection';
import { DetailModal } from '@/components/agents/shared/DetailModal';
import { UserStoryDetailContent } from '@/components/agents/shared/UserStoryDetailContent';
import type { CreateDashboardUserStoryInput, UpdateDashboardUserStoryOptions } from '@/context/WorkspaceContext';
import type { Epic, UserStory } from '@/lib/types/agent-2';
import type { EstimationMode, StoryEstimation } from '@/lib/types/agent-3';
import type { PrioritizationFramework, StoryPrioritization } from '@/lib/types/agent-4';
import type { PlannedSprint, SprintDatePatch, SprintPlan } from '@/lib/types/agent-5';
import { getSprintStatus } from '@/lib/types/agent-5';
import type { KanbanStatus, ProjectMember } from '@/lib/types/execution';
import { getEffortValue } from '@/lib/utils/estimation';
import { getSprintOptionsForPlan } from '@/lib/utils/backlog-story-navigation';
import {
	addSprintToPlan,
	deleteEmptySprintAtIndex,
	hasDuplicateSprintIds,
	hasSprintLabelMismatches,
	moveStoryInPlan,
	normalizeSprintPlan,
	SprintLifecycleError,
	updateSprintDates,
	updateSprintGoal,
} from '@/lib/utils/sprint-plan-mutations';
import { useConfirm } from '@/components/agents/shared/ConfirmDialog';
import { errorMessage, notifyError, notifySuccess } from '@/lib/notifications/toast';
import type { DashboardSprintStoryRow } from './dashboardMetrics';
import { DashboardCreateStoryModal } from './DashboardStoryFormModal';
import { ExecutionStatusBadge } from './ExecutionStatusBadge';
import { StartSprintModal } from './StartSprintModal';

interface DashboardSprintStoriesTableProps {
	epics: Epic[];
	estimations: Record<string, StoryEstimation>;
	framework: PrioritizationFramework | null;
	plan: SprintPlan | null;
	rows: DashboardSprintStoryRow[];
	unassignedRows: DashboardSprintStoryRow[];
	members?: ProjectMember[];
	executionStatusByStoryId?: Record<string, KanbanStatus>;
	canEditStatus?: boolean;
	onCreateStory: (input: CreateDashboardUserStoryInput) => Promise<void>;
	onDeleteStory: (storyId: string) => Promise<void>;
	onEditStory: (
		storyId: string,
		updates: Partial<UserStory>,
		estimationUpdates?: Partial<StoryEstimation>,
		options?: UpdateDashboardUserStoryOptions,
		prioritizationUpdates?: Partial<StoryPrioritization>
	) => Promise<void>;
	onUpdateStoryStatus?: (storyId: string, status: KanbanStatus) => Promise<void>;
	onUpdateStoryAssignee?: (storyId: string, assigneeId: string | null) => Promise<void>;
	onUpdateSprintPlan?: (plan: SprintPlan) => void;
	onStartSprint?: (sprintId: string) => Promise<void>;
	onCompleteSprint?: (
		sprintId: string,
		rollover?: 'backlog' | 'next_planned'
	) => Promise<void>;
	onManageEpic?: (epicId: string) => void;
	estimationMode?: EstimationMode;
	embedded?: boolean;
	isCreating?: boolean;
	onCreatingChange?: (open: boolean) => void;
	hideEmptyGroups?: boolean;
}

function parseDragId(id: string): { type: 'story' | 'sprint'; value: string } | null {
	const [type, value] = String(id).split(':');
	if ((type === 'story' || type === 'sprint') && value) {
		return { type, value: type === 'sprint' && value === 'unassigned' ? 'unassigned' : value };
	}
	return null;
}

export function DashboardSprintStoriesTable({
	epics,
	estimations,
	framework,
	plan,
	rows,
	unassignedRows,
	members = [],
	executionStatusByStoryId = {},
	canEditStatus = false,
	onCreateStory,
	onDeleteStory,
	onEditStory,
	onUpdateStoryStatus,
	onUpdateStoryAssignee,
	onUpdateSprintPlan,
	onStartSprint,
	onCompleteSprint,
	onManageEpic,
	estimationMode = 'story_points',
	embedded = false,
	isCreating: controlledCreating,
	onCreatingChange,
	hideEmptyGroups = false,
}: DashboardSprintStoriesTableProps) {
	const confirm = useConfirm();
	const [detailRow, setDetailRow] = useState<DashboardSprintStoryRow | null>(null);
	const [internalCreating, setInternalCreating] = useState(false);
	const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
	const [depsExpanded, setDepsExpanded] = useState(false);
	const [editingSprint, setEditingSprint] = useState<PlannedSprint | null>(null);
	const [startingSprint, setStartingSprint] = useState<PlannedSprint | null>(null);
	const [completingSprint, setCompletingSprint] = useState<PlannedSprint | null>(null);
	const [lifecycleBusy, setLifecycleBusy] = useState(false);
	const isCreating = controlledCreating ?? internalCreating;
	const setIsCreating = onCreatingChange ?? setInternalCreating;

	const memberById = useMemo(() => {
		const map = new Map<string, ProjectMember>();
		for (const member of members) {
			map.set(member.id, member);
		}
		return map;
	}, [members]);

	const safePlan = useMemo(() => (plan ? normalizeSprintPlan(plan) : null), [plan]);
	const planRef = useRef(safePlan);
	planRef.current = safePlan;
	const repairAttempted = useRef(false);
	const canManagePlan = Boolean(safePlan && onUpdateSprintPlan);

	const { backlogGroup, sprintGroups } = useMemo(
		() => splitSprintGroups(safePlan, rows, unassignedRows, estimationMode, hideEmptyGroups),
		[safePlan, rows, unassignedRows, estimationMode, hideEmptyGroups]
	);

	const { activeAndPlanned, completed } = useMemo(
		() => partitionSprintGroups(sprintGroups),
		[sprintGroups]
	);

	const sprintOptions = useMemo(
		() => getSprintOptionsForPlan(safePlan, rows),
		[safePlan, rows]
	);

	const allBacklogRows = useMemo(
		() => (safePlan ? unassignedRows : rows.filter((r) => !r.sprintId)),
		[safePlan, unassignedRows, rows]
	);

	const hasContent =
		backlogGroup.rows.length > 0 ||
		activeAndPlanned.length > 0 ||
		completed.length > 0 ||
		(!hideEmptyGroups && Boolean(safePlan?.sprints.length));

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

	const hasNextPlannedAfter = useCallback(
		(sprint: PlannedSprint) => {
			if (!safePlan) return false;
			const idx = safePlan.sprints.findIndex((s) => s.id === sprint.id);
			if (idx < 0) return false;
			return safePlan.sprints.slice(idx + 1).some((s) => getSprintStatus(s) === 'planned');
		},
		[safePlan]
	);

	useEffect(() => {
		if (!safePlan || !onUpdateSprintPlan || repairAttempted.current) return;
		if (!hasDuplicateSprintIds(plan!) && !hasSprintLabelMismatches(plan!)) return;
		repairAttempted.current = true;
		onUpdateSprintPlan(safePlan);
	}, [plan, safePlan, onUpdateSprintPlan]);

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

	const handleUpdateStoryStatus = useCallback(
		async (storyId: string, status: KanbanStatus) => {
			if (!onUpdateStoryStatus) return;
			try {
				await onUpdateStoryStatus(storyId, status);
				notifySuccess('Estado actualizado');
			} catch (err) {
				notifyError(errorMessage(err, 'No se pudo actualizar el estado'));
				throw err;
			}
		},
		[onUpdateStoryStatus]
	);

	const handleUpdateStoryAssignee = useCallback(
		async (storyId: string, assigneeId: string | null) => {
			if (!onUpdateStoryAssignee) return;
			try {
				await onUpdateStoryAssignee(storyId, assigneeId);
				notifySuccess(assigneeId ? 'Responsable asignado' : 'Responsable quitado');
			} catch (err) {
				notifyError(errorMessage(err, 'No se pudo actualizar el responsable'));
				throw err;
			}
		},
		[onUpdateStoryAssignee]
	);

	const handleMoveStory = useCallback(
		(storyId: string, fromSprintId: string | null, toSprintId: string | null) => {
			const current = planRef.current;
			if (!current || !onUpdateSprintPlan) return;
			if (fromSprintId === toSprintId) return;
			const storyEffort = getEffortValue(estimations[storyId], estimationMode);
			try {
				persistPlan(moveStoryInPlan(current, storyId, fromSprintId, toSprintId, storyEffort));
				notifySuccess('Historia movida');
			} catch (err) {
				notifyError(
					err instanceof SprintLifecycleError
						? err.message
						: errorMessage(err, 'No se pudo mover la historia')
				);
			}
		},
		[estimations, estimationMode, onUpdateSprintPlan, persistPlan]
	);

	const handleBulkAssign = useCallback(
		(sprintId: string, storyIds: string[]) => {
			const current = planRef.current;
			if (!current || !onUpdateSprintPlan || storyIds.length === 0) return;
			let nextPlan = current;
			try {
				for (const storyId of storyIds) {
					const storyEffort = getEffortValue(estimations[storyId], estimationMode);
					nextPlan = moveStoryInPlan(nextPlan, storyId, null, sprintId, storyEffort);
				}
				persistPlan(nextPlan);
				notifySuccess(
					`${storyIds.length} historia${storyIds.length !== 1 ? 's' : ''} asignada${storyIds.length !== 1 ? 's' : ''}`
				);
			} catch (err) {
				notifyError(
					err instanceof SprintLifecycleError
						? err.message
						: errorMessage(err, 'No se pudieron asignar las historias')
				);
			}
		},
		[estimations, estimationMode, onUpdateSprintPlan, persistPlan]
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

	const handleStartSprint = useCallback(
		async (input: { sprintId: string; goal: string; dates: SprintDatePatch }) => {
			if (!onStartSprint || lifecycleBusy) return;
			const current = planRef.current;
			if (!current) return;

			setLifecycleBusy(true);
			try {
				let nextPlan = updateSprintDates(current, input.sprintId, input.dates);
				const target = nextPlan.sprints.find((s) => s.id === input.sprintId);
				if (target && input.goal.trim() && input.goal.trim() !== target.sprintGoal) {
					nextPlan = updateSprintGoal(nextPlan, input.sprintId, input.goal.trim());
				}
				persistPlan(nextPlan);
				await onStartSprint(input.sprintId);
				setStartingSprint(null);
				notifySuccess('Sprint iniciado');
			} catch (err) {
				notifyError(errorMessage(err, 'No se pudo iniciar el sprint'));
			} finally {
				setLifecycleBusy(false);
			}
		},
		[lifecycleBusy, onStartSprint, persistPlan]
	);

	const handleCompleteSprint = useCallback(
		async (sprintId: string, rollover: 'backlog' | 'next_planned') => {
			if (!onCompleteSprint || lifecycleBusy) return;
			setLifecycleBusy(true);
			try {
				await onCompleteSprint(sprintId, rollover);
				setCompletingSprint(null);
				notifySuccess('Sprint cerrado');
			} catch (err) {
				notifyError(errorMessage(err, 'No se pudo cerrar el sprint'));
			} finally {
				setLifecycleBusy(false);
			}
		},
		[lifecycleBusy, onCompleteSprint]
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

	const statusHandlers =
		canEditStatus && onUpdateStoryStatus
			? handleUpdateStoryStatus
			: undefined;
	const assigneeHandlers =
		canEditStatus && onUpdateStoryAssignee
			? handleUpdateStoryAssignee
			: undefined;

	const dependenciesBanner =
		safePlan && safePlan.dependencies.length > 0 ? (
			<div className="border-b border-border px-6 pt-5">
				<div className="mb-4 rounded-xl border border-amber-400/20 bg-amber-400/5">
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
					{depsExpanded ? (
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
					) : null}
				</div>
			</div>
		) : null;

	const zonesBody = hasContent ? (
		<>
			{(backlogGroup.rows.length > 0 || !hideEmptyGroups) ? (
				<BacklogStoriesSection
					group={backlogGroup}
					framework={framework}
					estimationMode={estimationMode}
					plan={safePlan}
					sprintOptions={sprintOptions}
					canManagePlan={canManagePlan}
					memberById={memberById}
					members={members}
					onDeleteStory={handleDeleteStory}
					onEditStory={handleEditStory}
					onUpdateStoryStatus={statusHandlers}
					onUpdateStoryAssignee={assigneeHandlers}
					onMoveStory={canManagePlan ? handleMoveStory : undefined}
					onOpenDetail={setDetailRow}
					onManageEpic={onManageEpic}
				/>
			) : null}

			{safePlan ? (
				<SprintPlanSection
					sprintGroups={activeAndPlanned}
					completedGroups={completed}
					framework={framework}
					estimationMode={estimationMode}
					plan={safePlan}
					sprintOptions={sprintOptions}
					capacitySp={safePlan.config.sprintCapacitySp ?? 20}
					canManagePlan={canManagePlan}
					lifecycleBusy={lifecycleBusy}
					backlogRows={allBacklogRows}
					hideEmptyGroups={hideEmptyGroups}
					memberById={memberById}
					members={members}
					onAddSprint={handleAddSprint}
					onDeleteStory={handleDeleteStory}
					onEditStory={handleEditStory}
					onUpdateStoryStatus={statusHandlers}
					onUpdateStoryAssignee={assigneeHandlers}
					onMoveStory={canManagePlan ? handleMoveStory : undefined}
					onBulkAssign={canManagePlan ? handleBulkAssign : undefined}
					onOpenDetail={setDetailRow}
					onEditSprint={(group) => group.sprint && setEditingSprint(group.sprint)}
					onDeleteSprint={handleDeleteSprint}
					onStartSprint={(group) => group.sprint && onStartSprint && setStartingSprint(group.sprint)}
					onCompleteSprint={(group) => group.sprint && onCompleteSprint && setCompletingSprint(group.sprint)}
					onManageEpic={onManageEpic}
				/>
			) : null}
		</>
	) : (
		<div className="px-6 py-10">
			<div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-8 text-center">
				{hideEmptyGroups ? (
					<>
						<p className="text-sm font-semibold text-foreground">No hay historias que coincidan</p>
						<p className="mt-2 text-sm text-muted">
							Prueba con el ID, título o épica de la HU.
						</p>
					</>
				) : (
					<>
						<p className="text-sm font-semibold text-foreground">
							{canManagePlan ? 'Crea tu primer sprint' : 'Todavía no hay sprints para mostrar.'}
						</p>
						<p className="mt-2 text-sm text-muted">
							{canManagePlan
								? 'Todas las historias están en el backlog. Crea un sprint y asigna HU con el selector Sprint.'
								: 'Cuando haya un plan de sprints, verás las HU organizadas aquí.'}
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
					</>
				)}
			</div>
		</div>
	);

	const tableContent = (
		<>
			{dependenciesBanner}
			<DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
				{zonesBody}
				<DragOverlay>
					{activeStoryTitle ? (
						<div className="rounded-lg border border-border bg-surface px-4 py-2 shadow-sm">
							<span className="text-sm font-semibold text-foreground">{activeStoryTitle}</span>
						</div>
					) : null}
				</DragOverlay>
			</DndContext>

			{editingSprint && safePlan ? (
				<SprintEditModal
					open={Boolean(editingSprint)}
					onClose={() => setEditingSprint(null)}
					sprint={safePlan.sprints.find((s) => s.id === editingSprint.id) ?? editingSprint}
					sprintIndex={safePlan.sprints.findIndex((s) => s.id === editingSprint.id)}
					allSprints={safePlan.sprints}
					defaultDurationWeeks={safePlan.config.sprintDurationWeeks}
					onGoalChange={(goal) => handleGoalChange(editingSprint.id, goal)}
					onDatesChange={(patch) => handleDatesChange(editingSprint.id, patch)}
				/>
			) : null}

			{startingSprint && safePlan ? (
				<StartSprintModal
					open={Boolean(startingSprint)}
					sprint={safePlan.sprints.find((s) => s.id === startingSprint.id) ?? startingSprint}
					plan={safePlan}
					busy={lifecycleBusy}
					onClose={() => {
						if (!lifecycleBusy) setStartingSprint(null);
					}}
					onConfirm={handleStartSprint}
				/>
			) : null}

			{completingSprint ? (
				<CompleteSprintDialog
					sprint={completingSprint}
					incompleteCount={completingSprint.storyIds.filter((id) => {
						const status = executionStatusByStoryId[id] ?? 'todo';
						return status !== 'done';
					}).length}
					hasNextPlanned={hasNextPlannedAfter(completingSprint)}
					busy={lifecycleBusy}
					onCancel={() => setCompletingSprint(null)}
					onConfirm={(rollover) => handleCompleteSprint(completingSprint.id, rollover)}
				/>
			) : null}

			<DashboardCreateStoryModal
				open={isCreating}
				onClose={() => setIsCreating(false)}
				epics={epics}
				framework={framework}
				sprintOptions={sprintOptions}
				estimationMode={estimationMode}
				onCreate={async (input) => {
					await handleCreateStory(input);
					setIsCreating(false);
				}}
			/>

			<DetailModal
				open={Boolean(detailRow)}
				onClose={() => setDetailRow(null)}
				title={detailRow?.story.title ?? ''}
				subtitle={detailRow?.story.id}
				eyebrow={detailRow?.sprintNumber ? `Sprint ${detailRow.sprintNumber}` : 'Historia de usuario'}
				maxWidth="2xl"
			>
				{detailRow ? (
					<>
						<div className="mb-4">
							<ExecutionStatusBadge status={detailRow.executionStatus} />
						</div>
						<UserStoryDetailContent
							story={detailRow.story}
							epicTitle={detailRow.epicTitle}
							estimation={detailRow.estimation}
							estimationMode={estimationMode}
							prioritization={detailRow.prioritization}
							framework={framework ?? undefined}
						/>
					</>
				) : null}
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
						Backlog arriba, sprints abajo. Asigna HU con el selector Sprint o arrastrándolas.
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
						Nuevo ítem
					</button>
					<div className="rounded-2xl border border-border bg-surface px-4 py-3 text-right">
						<p className="text-[11px] font-bold uppercase tracking-[0.16em] text-subtle">Ítems planificados</p>
						<p className="mt-1 text-2xl font-bold text-foreground">{rows.length}</p>
					</div>
				</div>
			</div>
			{tableContent}
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
				aria-labelledby="complete-sprint-title"
				className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl"
			>
				<h3 id="complete-sprint-title" className="text-base font-semibold text-foreground">
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

function PlusIcon() {
	return (
		<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
			<path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
		</svg>
	);
}
