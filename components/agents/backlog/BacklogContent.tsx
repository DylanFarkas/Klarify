import { DashboardSprintPlan } from '@/components/agents/dashboard/DashboardSprintPlan';
import type { DashboardMetrics } from '@/components/agents/dashboard/dashboardMetrics';
import type { UserStory } from '@/lib/types/agent-2';
import type { StoryEstimation } from '@/lib/types/agent-3';
import type { StoryPrioritization } from '@/lib/types/agent-4';
import type { SprintPlan } from '@/lib/types/agent-5';
import type { KanbanStatus } from '@/lib/types/execution';
import type { CreateDashboardUserStoryInput, UpdateDashboardUserStoryOptions } from '@/context/WorkspaceContext';
import type { UserWorkspace } from '@/lib/types/workspace';

interface BacklogContentProps {
	hasContent: boolean;
	metrics: DashboardMetrics;
	projectName: string;
	executionBoardEnabled: boolean;
	workspace: UserWorkspace;
	onCreateStory: (input: CreateDashboardUserStoryInput) => Promise<void>;
	onDeleteStory: (storyId: string) => Promise<void>;
	onEditStory: (
		storyId: string,
		updates: Partial<UserStory>,
		estimationUpdates?: Partial<StoryEstimation>,
		options?: UpdateDashboardUserStoryOptions,
		prioritizationUpdates?: Partial<StoryPrioritization>
	) => Promise<void>;
	onUpdateStoryStatus: (storyId: string, status: KanbanStatus) => Promise<void>;
	onUpdateStoryAssignee: (storyId: string, assigneeId: string | null) => Promise<void>;
	onUpdateSprintPlan: (plan: SprintPlan) => void;
	onStartSprint: (sprintId: string) => Promise<void>;
	onCompleteSprint: (
		sprintId: string,
		rollover?: 'backlog' | 'next_planned'
	) => Promise<void>;
	onCreateEpic: (input: { title: string; description: string }) => Promise<void>;
	onUpdateEpic: (epicId: string, updates: { title?: string; description?: string }) => Promise<void>;
	onDeleteEpic: (epicId: string) => Promise<void>;
}

export function BacklogContent({
	hasContent,
	metrics,
	projectName,
	executionBoardEnabled,
	workspace,
	onCreateStory,
	onDeleteStory,
	onEditStory,
	onUpdateStoryStatus,
	onUpdateStoryAssignee,
	onUpdateSprintPlan,
	onStartSprint,
	onCompleteSprint,
	onCreateEpic,
	onUpdateEpic,
	onDeleteEpic,
}: BacklogContentProps) {
	const subtitle = hasContent ? (
		<>
			{projectName}
			{' · '}
			<span className="tabular-nums text-subtle">
				{metrics.sprintCount} sprint{metrics.sprintCount !== 1 ? 's' : ''}
				{' · '}
				{metrics.unassignedStoryCount} en backlog
				{' · '}
				{metrics.storyCount} HU
			</span>
		</>
	) : (
		<>
			{projectName} · Sin historias todavía
		</>
	);

	return (
		<div className="flex w-full flex-col gap-5 px-6 pt-3 pb-5 md:gap-6">
			{hasContent ? (
				<DashboardSprintPlan
					title="Backlog y Sprints"
					subtitle={subtitle}
					epics={metrics.epics}
					estimations={metrics.estimations}
					framework={metrics.framework}
					plan={metrics.plan}
					rows={metrics.sprintStoryRows}
					unassignedRows={metrics.unassignedStoryRows}
					members={workspace.execution?.members ?? []}
					executionBoardEnabled={executionBoardEnabled}
					estimationMode={metrics.estimationMode}
					onCreateStory={onCreateStory}
					onDeleteStory={onDeleteStory}
					onEditStory={onEditStory}
					onUpdateStoryStatus={onUpdateStoryStatus}
					onUpdateStoryAssignee={onUpdateStoryAssignee}
					onCreateEpic={onCreateEpic}
					onUpdateEpic={onUpdateEpic}
					onDeleteEpic={onDeleteEpic}
					onUpdateSprintPlan={onUpdateSprintPlan}
					onStartSprint={onStartSprint}
					onCompleteSprint={onCompleteSprint}
				/>
			) : (
				<>
					<header className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
						<div className="min-w-0 flex flex-col justify-center gap-0.5">
							<h1 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
								Backlog y sprints
							</h1>
							<p className="truncate text-[12px] text-muted">{subtitle}</p>
						</div>
					</header>
					<section className="rounded-xl border border-dashed border-border bg-surface/60 px-6 py-10 text-center">
						<p className="text-sm text-muted">
							Completa el pipeline de agentes para generar historias y planificar sprints.
						</p>
					</section>
				</>
			)}
		</div>
	);
}
