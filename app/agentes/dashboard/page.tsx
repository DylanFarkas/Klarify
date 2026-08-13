/**
 * @fileoverview Dashboard del workspace de Klarify.
 */

'use client';

import { useEffect, useRef } from 'react';
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
		updateStoryExecution,
		createEpic,
		updateEpic,
		deleteEpic,
		updateSprintPlan,
		startSprint,
		completeSprint,
		bootstrapDashboardFromAgent4,
	} = useWorkspace();
	const bootstrapped = useRef(false);

	useEffect(() => {
		if (!workspace || bootstrapped.current) return;
		if (workspace.pipeline.agent6Input) return;
		if (workspace.agent4.status !== 'approved') return;

		bootstrapped.current = true;
		void bootstrapDashboardFromAgent4().catch(() => {
			bootstrapped.current = false;
		});
	}, [workspace, bootstrapDashboardFromAgent4]);

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
			workspace={workspace}
		/>
	);
}
