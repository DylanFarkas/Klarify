'use client';

import { useDroppable } from '@dnd-kit/core';
import { formatEffortTotal } from '@/lib/utils/estimation';
import type { EstimationMode } from '@/lib/types/agent-3';
import type { PrioritizationFramework, StoryPrioritization } from '@/lib/types/agent-4';
import type { SprintPlan } from '@/lib/types/agent-5';
import type { KanbanStatus, ProjectMember } from '@/lib/types/execution';
import type { UserStory } from '@/lib/types/agent-2';
import type { StoryEstimation } from '@/lib/types/agent-3';
import type { UpdateDashboardUserStoryOptions } from '@/context/WorkspaceContext';
import type { SprintOption } from '@/lib/utils/backlog-story-navigation';
import type { DashboardSprintStoryRow } from '@/components/agents/dashboard/dashboardMetrics';
import type { SprintRowsGroup } from './sprint-plan-groups';
import { BacklogStoriesTableHead, BacklogStoryRow } from './BacklogStoryRow';
import { backlogTableClassName } from './backlog-table-layout';

interface BacklogStoriesSectionProps {
  group: SprintRowsGroup;
  framework: PrioritizationFramework | null;
  estimationMode: EstimationMode;
  plan: SprintPlan | null;
  sprintOptions: SprintOption[];
  canManagePlan: boolean;
  memberById: Map<string, ProjectMember>;
  members: ProjectMember[];
  onDeleteStory: (storyId: string) => Promise<void>;
  onEditStory: (
    storyId: string,
    updates: Partial<UserStory>,
    estimationUpdates?: Partial<StoryEstimation>,
    options?: UpdateDashboardUserStoryOptions,
    prioritizationUpdates?: Partial<StoryPrioritization>
  ) => Promise<void>;
  onUpdateStoryStatus?: (storyId: string, status: KanbanStatus) => Promise<void>;
  onUpdateStoryAssignee?: (storyId: string, assigneeId: string | null) => Promise<void>;
  onMoveStory?: (storyId: string, fromSprintId: string | null, toSprintId: string | null) => void;
  onOpenDetail: (row: DashboardSprintStoryRow) => void;
  onManageEpic?: (epicId: string) => void;
}

export function BacklogStoriesSection({
  group,
  framework,
  estimationMode,
  plan,
  sprintOptions,
  canManagePlan,
  memberById,
  members,
  onDeleteStory,
  onEditStory,
  onUpdateStoryStatus,
  onUpdateStoryAssignee,
  onMoveStory,
  onOpenDetail,
  onManageEpic,
}: BacklogStoriesSectionProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'sprint:unassigned',
    data: { sprintId: null },
    disabled: !canManagePlan,
  });

  return (
    <section className="border-b border-border/60 px-6 py-5" aria-label="Backlog">
      <div
        ref={canManagePlan ? setNodeRef : undefined}
        className={[
          '@container min-w-0 overflow-x-auto rounded-xl bg-surface transition-colors',
          isOver ? 'border-primary/40 bg-primary/5 ring-2 ring-inset ring-primary/20' : '',
        ].join(' ')}
      >
        <table className={backlogTableClassName()}>
          <BacklogStoriesTableHead estimationMode={estimationMode} />
          <tbody>
            {group.rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-xs text-muted @lg:px-6">
                  {canManagePlan
                    ? 'Sin historias en el backlog. Crea una HU o suelta aquí historias desasignadas.'
                    : 'Sin historias en el backlog.'}
                </td>
              </tr>
            ) : (
              group.rows.map((row) => (
                <BacklogStoryRow
                  key={row.id}
                  framework={framework}
                  estimationMode={estimationMode}
                  row={row}
                  assignee={row.assigneeId ? memberById.get(row.assigneeId) ?? null : null}
                  members={members}
                  plan={plan}
                  sprintOptions={sprintOptions}
                  canDrag={canManagePlan}
                  canChangeSprint={canManagePlan}
                  onDelete={async () => onDeleteStory(row.story.id)}
                  onEditStory={onEditStory}
                  onUpdateStoryStatus={onUpdateStoryStatus}
                  onUpdateStoryAssignee={onUpdateStoryAssignee}
                  onMoveStory={onMoveStory}
                  onOpenDetail={() => onOpenDetail(row)}
                  onManageEpic={onManageEpic}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
