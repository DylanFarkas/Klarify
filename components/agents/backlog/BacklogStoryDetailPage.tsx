'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BacklogStoryDetailHeader } from '@/components/agents/backlog/BacklogStoryDetailHeader';
import { DashboardLoadingState } from '@/components/agents/dashboard/DashboardLoadingState';
import { DashboardStoryEditForm } from '@/components/agents/dashboard/DashboardStoryEditForm';
import { buildDashboardMetrics } from '@/components/agents/dashboard/dashboardMetrics';
import { useWorkspace } from '@/hooks/useWorkspace';
import {
  findBacklogStoryRow,
  getEditableSprintOptions,
  getOrderedBacklogStoryRows,
  isSprintAssignmentLocked,
} from '@/lib/utils/backlog-story-navigation';

export function BacklogStoryDetailPage() {
  const params = useParams<{ storyId: string }>();
  const router = useRouter();
  const storyId = decodeURIComponent(params.storyId);

  const {
    workspace,
    isLoading,
    plan,
    updateUserStory,
    updateStoryExecution,
  } = useWorkspace();

  const metrics = useMemo(
    () => (workspace ? buildDashboardMetrics(workspace) : null),
    [workspace]
  );

  const orderedRows = useMemo(
    () => (metrics ? getOrderedBacklogStoryRows(metrics) : []),
    [metrics]
  );

  const storyIndex = useMemo(
    () => orderedRows.findIndex((row) => row.story.id === storyId),
    [orderedRows, storyId]
  );

  const row = useMemo(
    () => (metrics ? findBacklogStoryRow(metrics, storyId) : null),
    [metrics, storyId]
  );

  const previousStoryId =
    storyIndex > 0 ? orderedRows[storyIndex - 1]?.story.id ?? null : null;
  const nextStoryId =
    storyIndex >= 0 && storyIndex < orderedRows.length - 1
      ? orderedRows[storyIndex + 1]?.story.id ?? null
      : null;

  const sprintOptions = useMemo(
    () => getEditableSprintOptions(metrics?.plan ?? null, row),
    [metrics?.plan, row]
  );

  const sprintAssignmentLocked = useMemo(
    () => isSprintAssignmentLocked(row, metrics?.plan ?? null),
    [row, metrics?.plan]
  );

  const executionBoardEnabled = plan?.limits.executionBoard ?? false;
  const members = workspace?.execution?.members ?? [];

  if (isLoading || !workspace || !metrics) {
    return <DashboardLoadingState variant="story-detail" />;
  }

  if (!row) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <p className="text-sm font-medium text-foreground">
          No encontramos la historia <span className="font-mono">{storyId}</span>.
        </p>
        <p className="max-w-sm text-sm text-muted">
          Puede que haya sido eliminada o que el ID no exista en el backlog activo.
        </p>
        <Link
          href="/agentes/backlog"
          className="mt-2 inline-flex cursor-pointer items-center rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Volver al backlog
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <BacklogStoryDetailHeader
        row={row}
        storyIndex={storyIndex}
        storyCount={orderedRows.length}
        previousStoryId={previousStoryId}
        nextStoryId={nextStoryId}
      />
      <DashboardStoryEditForm
        key={row.story.id}
        row={row}
        epics={metrics.epics}
        framework={metrics.framework}
        sprintOptions={sprintOptions}
        sprintAssignmentLocked={sprintAssignmentLocked}
        estimationMode={metrics.estimationMode}
        members={members}
        canEditStatus={executionBoardEnabled}
        onCancel={() => {
          router.push('/agentes/backlog');
        }}
        onSave={async (updates, estimationUpdates, options, prioritizationUpdates) => {
          await updateUserStory(
            row.story.id,
            updates,
            estimationUpdates,
            options,
            prioritizationUpdates
          );
          router.push('/agentes/backlog');
        }}
        onUpdateStoryStatus={
          executionBoardEnabled
            ? async (id, status) => {
                await updateStoryExecution(id, { status });
              }
            : undefined
        }
        onUpdateStoryAssignee={
          executionBoardEnabled
            ? async (id, assigneeId) => {
                await updateStoryExecution(id, { assigneeId });
              }
            : undefined
        }
      />
    </div>
  );
}
