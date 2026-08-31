import { getSprintStatus } from '@/lib/types/agent-5';
import { DashboardEmptyState } from './DashboardEmptyState';
import { DashboardHero } from './DashboardHero';
import { DashboardSummaryStrip } from './DashboardSummaryStrip';
import { DashboardEpicProgress } from './DashboardEpicProgress';
import { DashboardActiveSprint } from './DashboardActiveSprint';
import { DashboardCompletedSprints } from './DashboardCompletedSprints';
import { ProjectExportPanel } from '@/components/agents/export/ProjectExportPanel';
import { GitHubExportButton } from '@/components/agents/github/GitHubExportButton';
import type { DashboardMetrics } from './dashboardMetrics';
import type { UserWorkspace } from '@/lib/types/workspace';
import type { KanbanStatus } from '@/lib/types/execution';

interface DashboardContentProps {
	hasContent: boolean;
	metrics: DashboardMetrics;
	executionBoardEnabled: boolean;
	projectId: string | null;
	projectName: string;
	canExportGithub: boolean;
	onUpdateStoryStatus: (storyId: string, status: KanbanStatus) => Promise<void>;
	onCompleteSprint: (
		sprintId: string,
		rollover?: 'backlog' | 'next_planned'
	) => Promise<void>;
	workspace: UserWorkspace;
}

export function DashboardContent({
	hasContent,
	metrics,
	executionBoardEnabled,
	projectId,
	projectName,
	canExportGithub,
	onUpdateStoryStatus,
	onCompleteSprint,
	workspace,
}: DashboardContentProps) {
	const hasCompletedSprints = Boolean(
		metrics.plan?.sprints.some((sprint) => getSprintStatus(sprint) === 'completed')
	);
	const showAside = metrics.epicBreakdown.length > 0 || hasCompletedSprints;

	return (
		<div className="flex w-full flex-col gap-8 px-6 pt-3 pb-5 animate-[fadeIn_0.3s_ease-out]">
			<div className="flex flex-col gap-5 border-b border-border/60 pb-5">
				<DashboardHero
					projectName={projectName}
					hasContent={hasContent}
					metrics={metrics}
					executionBoardEnabled={executionBoardEnabled}
				/>

				{hasContent ? (
					<DashboardSummaryStrip
						metrics={metrics}
						workspace={workspace}
						executionBoardEnabled={executionBoardEnabled}
					/>
				) : null}
			</div>

			{hasContent ? (
				<>
					<div
						className={
							showAside
								? 'grid items-start gap-10 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-12'
								: 'min-w-0'
						}
					>
						<DashboardActiveSprint
							metrics={metrics}
							workspace={workspace}
							executionBoardEnabled={executionBoardEnabled}
							onUpdateStoryStatus={onUpdateStoryStatus}
							onCompleteSprint={onCompleteSprint}
						/>

						{showAside ? (
							<aside className="flex min-w-0 flex-col gap-10">
								<DashboardEpicProgress metrics={metrics} />
								<DashboardCompletedSprints metrics={metrics} />
							</aside>
						) : null}
					</div>

					{projectId ? (
						<section className="flex flex-col gap-3 border-t border-border/60 pt-5">
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
