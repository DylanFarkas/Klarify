/**
 * @fileoverview Dashboard del workspace de Klarify.
 */

'use client';

import { DashboardContent } from '@/components/agents/dashboard/DashboardContent';
import { DashboardLoadingState } from '@/components/agents/dashboard/DashboardLoadingState';
import { buildDashboardMetrics } from '@/components/agents/dashboard/dashboardMetrics';
import { useWorkspace } from '@/hooks/useWorkspace';

export default function DashboardPage() {
	const { workspace, isLoading, updateUserStory } = useWorkspace();

	if (isLoading || !workspace) {
		return <DashboardLoadingState />;
	}

	const metrics = buildDashboardMetrics(workspace);
	const hasContent = metrics.storyCount > 0 || metrics.wishesCount > 0 || metrics.completionCount > 0;

	return (
		<DashboardContent
			hasContent={hasContent}
			metrics={metrics}
			onEditStory={updateUserStory}
			workspace={workspace}
		/>
	);
}
