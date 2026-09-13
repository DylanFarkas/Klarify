/**
 * @fileoverview Backlog y planificación de sprints del workspace.
 */

'use client';

import { BacklogContent } from '@/components/agents/backlog/BacklogContent';
import { DashboardLoadingState } from '@/components/agents/dashboard/DashboardLoadingState';
import { buildDashboardMetrics } from '@/components/agents/dashboard/dashboardMetrics';
import { useWorkspace } from '@/hooks/useWorkspace';

export default function BacklogPage() {
	const {
		workspace,
		isLoading,
		plan,
		activeProjectId,
		projects,
		createUserStory,
		deleteUserStory,
		updateUserStory,
		updateStoryExecution,
		createEpic,
		updateEpic,
		deleteEpic,
		updateSprintPlan,
		startSprint,
		completeSprint,
	} = useWorkspace();

	if (isLoading || !workspace) {
		return <DashboardLoadingState variant="backlog" />;
	}

	const metrics = buildDashboardMetrics(workspace);
	const hasContent = metrics.storyCount > 0;
	const activeProject = projects.find((project) => project.id === activeProjectId);

	return (
		<BacklogContent
			hasContent={hasContent}
			metrics={metrics}
			projectName={activeProject?.name ?? 'Proyecto activo'}
			executionBoardEnabled={plan?.limits.executionBoard ?? false}
			workspace={workspace}
			onCreateStory={createUserStory}
			onDeleteStory={deleteUserStory}
			onEditStory={updateUserStory}
			onUpdateStoryStatus={async (storyId, status) => {
				await updateStoryExecution(storyId, { status });
			}}
			onUpdateStoryAssignee={async (storyId, assigneeId) => {
				await updateStoryExecution(storyId, { assigneeId });
			}}
			onCreateEpic={createEpic}
			onUpdateEpic={updateEpic}
			onDeleteEpic={deleteEpic}
			onUpdateSprintPlan={updateSprintPlan}
			onStartSprint={startSprint}
			onCompleteSprint={completeSprint}
		/>
	);
}
