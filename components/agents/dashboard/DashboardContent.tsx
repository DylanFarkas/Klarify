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

					<DashboardActiveSprint
						metrics={metrics}
						workspace={workspace}
						executionBoardEnabled={executionBoardEnabled}
						onUpdateStoryStatus={onUpdateStoryStatus}
						onCompleteSprint={onCompleteSprint}
					/>

					<DashboardCompletedSprints metrics={metrics} />

					<DashboardEpicProgress metrics={metrics} />

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
