'use client';

import { useMemo, useState } from 'react';
import type { Epic, UserStory } from '@/lib/types/agent-2';
import type { StoryEstimation } from '@/lib/types/agent-3';
import type { PrioritizationFramework, StoryPrioritization } from '@/lib/types/agent-4';
import type { SprintPlan } from '@/lib/types/agent-5';
import type { ProjectMember } from '@/lib/types/execution';
import type { CreateDashboardUserStoryInput, UpdateDashboardUserStoryOptions } from '@/context/WorkspaceContext';
import type { DashboardSprintStoryRow } from './dashboardMetrics';
import { DashboardEpicManager } from './DashboardEpicManager';
import { DashboardSprintStoriesTable } from './DashboardSprintStoriesTable';

interface DashboardSprintPlanProps {
	epics: Epic[];
	estimations: Record<string, StoryEstimation>;
	framework: PrioritizationFramework | null;
	plan: SprintPlan | null;
	rows: DashboardSprintStoryRow[];
	unassignedRows: DashboardSprintStoryRow[];
	members: ProjectMember[];
	onCreateStory: (input: CreateDashboardUserStoryInput) => Promise<void>;
	onDeleteStory: (storyId: string) => Promise<void>;
	onEditStory: (
		storyId: string,
		updates: Partial<UserStory>,
		estimationUpdates?: Partial<StoryEstimation>,
		options?: UpdateDashboardUserStoryOptions,
		prioritizationUpdates?: Partial<StoryPrioritization>
	) => Promise<void>;
	onCreateEpic: (input: { title: string; description: string }) => Promise<void>;
	onUpdateEpic: (epicId: string, updates: { title?: string; description?: string }) => Promise<void>;
	onDeleteEpic: (epicId: string) => Promise<void>;
	onUpdateSprintPlan: (plan: SprintPlan) => void;
	onStartSprint: (sprintId: string) => Promise<void>;
	onCompleteSprint: (
		sprintId: string,
		rollover?: 'backlog' | 'next_planned'
	) => Promise<void>;
}

function matchesStorySearch(row: DashboardSprintStoryRow, query: string): boolean {
	const q = query.trim().toLowerCase();
	if (!q) return true;
	return (
		row.story.id.toLowerCase().includes(q) ||
		row.story.title.toLowerCase().includes(q) ||
		row.story.description.toLowerCase().includes(q) ||
		row.epicTitle.toLowerCase().includes(q) ||
		row.epicId.toLowerCase().includes(q)
	);
}

export function DashboardSprintPlan({
	epics,
	estimations,
	framework,
	plan,
	rows,
	unassignedRows,
	members,
	onCreateStory,
	onDeleteStory,
	onEditStory,
	onCreateEpic,
	onUpdateEpic,
	onDeleteEpic,
	onUpdateSprintPlan,
	onStartSprint,
	onCompleteSprint,
}: DashboardSprintPlanProps) {
	const [isCreating, setIsCreating] = useState(false);
	const [isManagingEpics, setIsManagingEpics] = useState(false);
	const [editingEpicId, setEditingEpicId] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const sprintCount = plan?.sprints.length ?? 0;
	const backlogCount = unassignedRows.length;

	const filteredRows = useMemo(
		() => rows.filter((row) => matchesStorySearch(row, searchQuery)),
		[rows, searchQuery]
	);
	const filteredUnassignedRows = useMemo(
		() => unassignedRows.filter((row) => matchesStorySearch(row, searchQuery)),
		[unassignedRows, searchQuery]
	);
	const executionStatusByStoryId = useMemo(() => {
		const map: Record<string, DashboardSprintStoryRow['executionStatus']> = {};
		for (const row of [...rows, ...unassignedRows]) {
			map[row.story.id] = row.executionStatus;
		}
		return map;
	}, [rows, unassignedRows]);
	const isSearching = searchQuery.trim().length > 0;
	const matchCount = filteredRows.length + filteredUnassignedRows.length;

	const openEpicManager = (epicId?: string) => {
		setEditingEpicId(epicId ?? null);
		setIsManagingEpics(true);
	};

	return (
		<section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-surface">
			<div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3.5 md:px-5">
				<div className="min-w-0 flex-1">
					<h2 className="text-[15px] font-semibold tracking-tight text-foreground">
						Backlog y sprints
					</h2>
					<p className="mt-1 text-[12px] text-muted">
						Crea sprints, arrastra HU desde el backlog y edítalas en cualquier momento.
						{' · '}
						<span className="tabular-nums text-subtle">
							{sprintCount} sprint{sprintCount !== 1 ? 's' : ''}
							{' · '}
							{backlogCount} en backlog
						</span>
					</p>
				</div>

				<div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
					<label className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
						<span className="sr-only">Buscar historias</span>
						<svg
							className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-subtle"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M21 21l-4.35-4.35m1.6-5.4a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
						<input
							type="search"
							value={searchQuery}
							onChange={(event) => setSearchQuery(event.target.value)}
							placeholder="Buscar HU…"
							className="w-full rounded-lg border border-border bg-background py-1.5 pr-3 pl-8 text-[12px] text-foreground outline-none transition-colors placeholder:text-subtle focus:border-border-strong"
						/>
					</label>
					<button
						type="button"
						onClick={() => openEpicManager()}
						className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
					>
						Épicas
						<span className="tabular-nums text-subtle">{epics.length}</span>
					</button>
					<button
						type="button"
						onClick={() => setIsCreating(true)}
						disabled={epics.length === 0 || isCreating}
						className={[
							'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-opacity',
							epics.length > 0 && !isCreating
								? 'bg-foreground text-background hover:opacity-90'
								: 'cursor-not-allowed bg-disabled text-disabled-text opacity-40',
						].join(' ')}
					>
						<PlusIcon />
						Nueva HU
					</button>
				</div>
			</div>

			{isSearching ? (
				<div className="border-b border-border bg-surface-muted/40 px-4 py-2 text-[11px] text-muted md:px-5">
					{matchCount === 0
						? `Sin resultados para “${searchQuery.trim()}”`
						: `${matchCount} resultado${matchCount !== 1 ? 's' : ''} para “${searchQuery.trim()}”`}
				</div>
			) : null}

			<DashboardSprintStoriesTable
				epics={epics}
				estimations={estimations}
				framework={framework}
				plan={plan}
				rows={filteredRows}
				unassignedRows={filteredUnassignedRows}
				members={members}
				executionStatusByStoryId={executionStatusByStoryId}
				onCreateStory={onCreateStory}
				onDeleteStory={onDeleteStory}
				onEditStory={onEditStory}
				onUpdateSprintPlan={onUpdateSprintPlan}
				onStartSprint={onStartSprint}
				onCompleteSprint={onCompleteSprint}
				onManageEpic={openEpicManager}
				embedded
				isCreating={isCreating}
				onCreatingChange={setIsCreating}
				hideEmptyGroups={isSearching}
			/>

			<DashboardEpicManager
				open={isManagingEpics}
				onClose={() => {
					setIsManagingEpics(false);
					setEditingEpicId(null);
				}}
				epics={epics}
				initialEpicId={editingEpicId}
				onCreate={onCreateEpic}
				onUpdate={onUpdateEpic}
				onDelete={onDeleteEpic}
			/>
		</section>
	);
}

function PlusIcon() {
	return (
		<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
		</svg>
	);
}
