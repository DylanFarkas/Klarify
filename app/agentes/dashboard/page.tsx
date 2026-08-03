/**
 * @fileoverview Dashboard del workspace de Klarify.
 */

'use client';

import { DashboardContent } from '@/components/agents/dashboard/DashboardContent';
import { DashboardLoadingState } from '@/components/agents/dashboard/DashboardLoadingState';
import { buildDashboardMetrics } from '@/components/agents/dashboard/dashboardMetrics';
import { useWorkspace } from '@/hooks/useWorkspace';

export default function DashboardPage() {
	const {
		workspace,
		isLoading,
		plan,
		activeProjectId,
		projects,
		createUserStory,
		deleteUserStory,
		updateUserStory,
		updateSprintPlan,
	} = useWorkspace();

	if (isLoading || !workspace) {
		return <DashboardLoadingState />;
	}

	const metrics = buildDashboardMetrics(workspace);
	const hasContent = metrics.storyCount > 0 || metrics.wishesCount > 0 || metrics.completionCount > 0;
	const activeProject = projects.find((project) => project.id === activeProjectId);
	const canExportGithub = Boolean(workspace.pipeline.agent6Input);

	return (
		<DashboardContent
			hasContent={hasContent}
			metrics={metrics}
			executionBoardEnabled={plan?.limits.executionBoard ?? false}
			projectId={activeProjectId}
			projectName={activeProject?.name ?? 'Proyecto activo'}
			canExportGithub={canExportGithub}
			onCreateStory={createUserStory}
			onDeleteStory={deleteUserStory}
			onEditStory={updateUserStory}
			onUpdateSprintPlan={updateSprintPlan}
			workspace={workspace}
		/>
	);
}
