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
		<section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface/80 shadow-sm">
			<div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-6 py-5">
				<div className="min-w-0 flex-1">
					<p className="text-[11px] font-bold uppercase tracking-[0.16em] text-subtle">Plan de sprints</p>
					<h2 className="mt-2 text-xl font-bold text-foreground">Planificación e historias</h2>
					<p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
						Ajusta sprints e historias en un solo lugar. Arrastra HU entre sprints, edita objetivos y fechas, o
						crea nuevas historias.
					</p>
				</div>

				<div className="flex flex-wrap items-start gap-3">
					<button
						type="button"
						onClick={() => setIsCreating(true)}
						disabled={epics.length === 0 || isCreating}
						className={[
							'cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all',
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
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
		</svg>
	);
}
