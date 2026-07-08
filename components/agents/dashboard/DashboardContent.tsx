import { DashboardCoverageMetrics } from './DashboardCoverageMetrics';
import { DashboardEmptyState } from './DashboardEmptyState';
import { DashboardEpicBreakdown } from './DashboardEpicBreakdown';
import { DashboardHero } from './DashboardHero';
import { DashboardNextActionPanel } from './DashboardNextActionPanel';
import { DashboardPipelinePanel } from './DashboardPipelinePanel';
import { DashboardPriorityBuckets } from './DashboardPriorityBuckets';
import { DashboardSecondaryMetrics } from './DashboardSecondaryMetrics';
import { DashboardSprintStoriesTable } from './DashboardSprintStoriesTable';
import { GitHubExportButton } from '@/components/agents/github/GitHubExportButton';
import type { DashboardMetrics } from './dashboardMetrics';
import type { UserStory } from '@/lib/types/agent-2';
import type { StoryEstimation } from '@/lib/types/agent-3';
import type { CreateDashboardUserStoryInput, UpdateDashboardUserStoryOptions } from '@/context/WorkspaceContext';
import type { SprintPlan } from '@/lib/types/agent-5';
import { DashboardSprintPlanEditor } from './DashboardSprintPlanEditor';
import { DashboardExecutionPanel } from './DashboardExecutionPanel';
import type { UserWorkspace } from '@/lib/types/workspace';

interface DashboardContentProps {
	hasContent: boolean;
	metrics: DashboardMetrics;
	executionBoardEnabled: boolean;
	projectId: string | null;
	projectName: string;
	canExportGithub: boolean;
	onCreateStory: (input: CreateDashboardUserStoryInput) => Promise<void>;
	onDeleteStory: (storyId: string) => Promise<void>;
	onEditStory: (
		storyId: string,
		updates: Partial<UserStory>,
		estimationUpdates?: Partial<StoryEstimation>,
		options?: UpdateDashboardUserStoryOptions
	) => Promise<void>;
	onUpdateSprintPlan: (plan: SprintPlan) => Promise<void>;
	workspace: UserWorkspace;
}

export function DashboardContent({
	hasContent,
	metrics,
	executionBoardEnabled,
	projectId,
	projectName,
	canExportGithub,
	onCreateStory,
	onDeleteStory,
	onEditStory,
	onUpdateSprintPlan,
	workspace,
}: DashboardContentProps) {
	const activeAgents = [
		{ name: 'Agente 1', status: workspace.agent1.status, href: '/agentes/1' },
		{ name: 'Agente 2', status: workspace.agent2.status, href: '/agentes/2' },
		{ name: 'Agente 3', status: workspace.agent3.status, href: '/agentes/3' },
		{ name: 'Agente 4', status: workspace.agent4.status, href: '/agentes/4' },
		{ name: 'Agente 5', status: workspace.agent5.status, href: '/agentes/5' },
	] as const;

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
			<DashboardHero hasContent={hasContent} metrics={metrics} />
			{projectId ? (
				<section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/80 p-5 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="text-sm font-semibold text-foreground">GitHub Projects</p>
						<p className="mt-1 text-xs text-muted">
							Exporta épicas, historias, criterios de aceptación, estimaciones, prioridades y sprints.
						</p>
					</div>
					<GitHubExportButton
						projectId={projectId}
						projectName={projectName}
						canExport={canExportGithub}
						variant="secondary"
						className="shrink-0"
					/>
				</section>
			) : null}
			<DashboardCoverageMetrics metrics={metrics} />

			<section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
				<DashboardPipelinePanel
					activeAgents={activeAgents}
					completionPercentage={metrics.completionPercentage}
				/>
				<DashboardNextActionPanel metrics={metrics} executionBoardEnabled={executionBoardEnabled} />
			</section>

			<DashboardExecutionPanel workspace={workspace} executionBoardEnabled={executionBoardEnabled} />

			<DashboardPriorityBuckets metrics={metrics} />
			<DashboardSecondaryMetrics metrics={metrics} />
			{metrics.plan && metrics.framework && (
				<DashboardSprintPlanEditor
					plan={metrics.plan}
					epics={metrics.epics}
					estimations={metrics.estimations}
					priorities={metrics.priorities}
					framework={metrics.framework}
					onPlanChange={onUpdateSprintPlan}
				/>
			)}
			<DashboardSprintStoriesTable
				epics={metrics.epics}
				framework={metrics.framework}
				plan={metrics.plan}
				rows={metrics.sprintStoryRows}
				unassignedRows={metrics.unassignedStoryRows}
				onCreateStory={onCreateStory}
				onDeleteStory={onDeleteStory}
				onEditStory={onEditStory}
			/>
			{hasContent ? <DashboardEpicBreakdown metrics={metrics} /> : <DashboardEmptyState />}
		</div>
	);
}
