'use client';

import { useState } from 'react';
import type { Epic, UserStory } from '@/lib/types/agent-2';
import type { StoryEstimation } from '@/lib/types/agent-3';
import type { PrioritizationFramework, StoryPrioritization } from '@/lib/types/agent-4';
import type { SprintPlan } from '@/lib/types/agent-5';
import type { CreateDashboardUserStoryInput, UpdateDashboardUserStoryOptions } from '@/context/WorkspaceContext';
import type { DashboardSprintStoryRow } from './dashboardMetrics';
import { DashboardSprintStoriesTable } from './DashboardSprintStoriesTable';

interface DashboardSprintPlanProps {
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
	onUpdateSprintPlan: (plan: SprintPlan) => void;
}

export function DashboardSprintPlan({
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
}: DashboardSprintPlanProps) {
	const [isCreating, setIsCreating] = useState(false);

	return (
		<section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-surface">
			<div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3.5 md:px-5">
				<div className="min-w-0 flex-1">
					<h2 className="text-[15px] font-semibold tracking-tight text-foreground">
						Plan de sprints
					</h2>
					<p className="mt-1 text-[12px] text-muted">
						Arrastra HU entre sprints, edita objetivos y fechas, o crea nuevas historias.
						{' · '}
						<span className="tabular-nums text-subtle">{rows.length} planificadas</span>
					</p>
				</div>

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

			<DashboardSprintStoriesTable
				epics={epics}
				estimations={estimations}
				framework={framework}
				plan={plan}
				rows={rows}
				unassignedRows={unassignedRows}
				onCreateStory={onCreateStory}
				onDeleteStory={onDeleteStory}
				onEditStory={onEditStory}
				onUpdateSprintPlan={onUpdateSprintPlan}
				embedded
				isCreating={isCreating}
				onCreatingChange={setIsCreating}
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
