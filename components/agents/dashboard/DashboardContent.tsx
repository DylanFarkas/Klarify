import { DashboardBacklogPanel } from './DashboardBacklogPanel';
import { DashboardEmptyState } from './DashboardEmptyState';
import { DashboardHero } from './DashboardHero';
import { DashboardSummaryStrip } from './DashboardSummaryStrip';
import { ProjectExportPanel } from '@/components/agents/export/ProjectExportPanel';
import { GitHubExportButton } from '@/components/agents/github/GitHubExportButton';
import type { DashboardMetrics } from './dashboardMetrics';
import type { UserStory } from '@/lib/types/agent-2';
import type { StoryEstimation } from '@/lib/types/agent-3';
import type { StoryPrioritization } from '@/lib/types/agent-4';
import type { CreateDashboardUserStoryInput, UpdateDashboardUserStoryOptions } from '@/context/WorkspaceContext';
import type { SprintPlan } from '@/lib/types/agent-5';
import { DashboardSprintPlan } from './DashboardSprintPlan';
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
		options?: UpdateDashboardUserStoryOptions,
		prioritizationUpdates?: Partial<StoryPrioritization>
	) => Promise<void>;
	onUpdateSprintPlan: (plan: SprintPlan) => void;
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
	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-7">
			<DashboardHero
				projectName={projectName}
				hasContent={hasContent}
				metrics={metrics}
				executionBoardEnabled={executionBoardEnabled}
			/>

			{hasContent ? (
				<>
					<DashboardSummaryStrip
						metrics={metrics}
						workspace={workspace}
						executionBoardEnabled={executionBoardEnabled}
					/>

					<DashboardBacklogPanel metrics={metrics} />

					<DashboardSprintPlan
						epics={metrics.epics}
						estimations={metrics.estimations}
						framework={metrics.framework}
						plan={metrics.plan}
						rows={metrics.sprintStoryRows}
						unassignedRows={metrics.unassignedStoryRows}
						onCreateStory={onCreateStory}
						onDeleteStory={onDeleteStory}
						onEditStory={onEditStory}
						onUpdateSprintPlan={onUpdateSprintPlan}
					/>

					{projectId ? (
						<section className="flex flex-col gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 md:px-5">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div className="min-w-0">
									<h2 className="text-[15px] font-semibold tracking-tight text-foreground">
										Exportar
									</h2>
									<p className="mt-0.5 text-[12px] text-muted">
										Descarga el proyecto o envíalo a GitHub Projects.
									</p>
								</div>
								<GitHubExportButton
									projectId={projectId}
									projectName={projectName}
									canExport={canExportGithub}
									variant="secondary"
									className="shrink-0 self-start"
								/>
							</div>
							<ProjectExportPanel projectName={projectName} compact />
						</section>
					) : null}
				</>
			) : (
				<DashboardEmptyState />
			)}
		</div>
	);
}
