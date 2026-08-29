'use client';

import type { EstimationMode } from '@/lib/types/agent-3';
import type { PrioritizationFramework, StoryPrioritization } from '@/lib/types/agent-4';
import type { SprintPlan } from '@/lib/types/agent-5';
import { getSprintStatus } from '@/lib/types/agent-5';
import type { KanbanStatus, ProjectMember } from '@/lib/types/execution';
import type { UserStory } from '@/lib/types/agent-2';
import type { StoryEstimation } from '@/lib/types/agent-3';
import type { UpdateDashboardUserStoryOptions } from '@/context/WorkspaceContext';
import type { SprintOption } from '@/lib/utils/backlog-story-navigation';
import type { DashboardSprintStoryRow } from '@/components/agents/dashboard/dashboardMetrics';
import type { SprintRowsGroup } from './sprint-plan-groups';
import { SprintPlanCard } from './SprintPlanCard';

interface SprintPlanSectionProps {
  sprintGroups: SprintRowsGroup[];
  completedGroups: SprintRowsGroup[];
  framework: PrioritizationFramework | null;
  estimationMode: EstimationMode;
  plan: SprintPlan | null;
  sprintOptions: SprintOption[];
  capacitySp: number;
  canManagePlan: boolean;
  lifecycleBusy: boolean;
  backlogRows: DashboardSprintStoryRow[];
  hideEmptyGroups: boolean;
  memberById: Map<string, ProjectMember>;
  members: ProjectMember[];
  onAddSprint: () => void;
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
  onBulkAssign?: (sprintId: string, storyIds: string[]) => void;
  onOpenDetail: (row: DashboardSprintStoryRow) => void;
  onEditSprint: (group: SprintRowsGroup) => void;
  onDeleteSprint: (sprintIndex: number) => void;
  onStartSprint: (group: SprintRowsGroup) => void;
  onCompleteSprint: (group: SprintRowsGroup) => void;
  onManageEpic?: (epicId: string) => void;
}

export function SprintPlanSection({
  sprintGroups,
  completedGroups,
  framework,
  estimationMode,
  plan,
  sprintOptions,
  capacitySp,
  canManagePlan,
  lifecycleBusy,
  backlogRows,
  hideEmptyGroups,
  memberById,
  members,
  onAddSprint,
  onDeleteStory,
  onEditStory,
  onUpdateStoryStatus,
  onUpdateStoryAssignee,
  onMoveStory,
  onBulkAssign,
  onOpenDetail,
  onEditSprint,
  onDeleteSprint,
  onStartSprint,
  onCompleteSprint,
  onManageEpic,
}: SprintPlanSectionProps) {
  const visibleGroups = hideEmptyGroups
    ? sprintGroups.filter((g) => g.rows.length > 0 || g.sprint)
    : sprintGroups;

  const showEmptySprintsHint =
    !hideEmptyGroups && canManagePlan && visibleGroups.length === 0 && plan;

  return (
    <section className="px-6 py-5" aria-label="Sprints">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[50px] font-semibold tracking-tight text-foreground">Sprints</h2>
          <p className="mt-0.5 text-[12px] text-muted">
            Planifica iteraciones y asigna historias desde el backlog.
          </p>
        </div>
        {canManagePlan && plan ? (
          <button
            type="button"
            onClick={onAddSprint}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo sprint
          </button>
        ) : null}
      </div>

      {showEmptySprintsHint ? (
        <div className="mb-4 rounded-xl border border-dashed border-border bg-surface/50 px-4 py-6 text-center">
          <p className="text-sm font-medium text-foreground">Aún no hay sprints</p>
          <p className="mt-1 text-[12px] text-muted">
            Crea un sprint y asigna historias con el selector Sprint o el botón Asignar historias.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        {visibleGroups.map((group) => {
          const status = group.sprint ? getSprintStatus(group.sprint) : null;
          return (
            <SprintPlanCard
              key={group.key}
              group={group}
              framework={framework}
              estimationMode={estimationMode}
              plan={plan}
              sprintOptions={sprintOptions}
              capacitySp={capacitySp}
              canManagePlan={canManagePlan}
              lifecycleBusy={lifecycleBusy}
              backlogRows={backlogRows}
              memberById={memberById}
              members={members}
              onDeleteStory={onDeleteStory}
              onEditStory={onEditStory}
              onUpdateStoryStatus={onUpdateStoryStatus}
              onUpdateStoryAssignee={onUpdateStoryAssignee}
              onMoveStory={onMoveStory}
              onBulkAssign={onBulkAssign}
              onOpenDetail={onOpenDetail}
              onEditSprint={group.sprint ? () => onEditSprint(group) : undefined}
              onDeleteSprint={
                group.sprintIndex != null &&
                group.sprint?.storyIds.length === 0 &&
                status !== 'completed'
                  ? () => onDeleteSprint(group.sprintIndex!)
                  : undefined
              }
              onStartSprint={
                group.sprint && status === 'planned'
                  ? () => onStartSprint(group)
                  : undefined
              }
              onCompleteSprint={
                group.sprint && status === 'active'
                  ? () => onCompleteSprint(group)
                  : undefined
              }
              onManageEpic={onManageEpic}
            />
          );
        })}

        {completedGroups.length > 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">
              Sprints cerrados ({completedGroups.length})
            </p>
            {completedGroups.map((group) => (
              <SprintPlanCard
                key={group.key}
                group={group}
                framework={framework}
                estimationMode={estimationMode}
                plan={plan}
                sprintOptions={sprintOptions}
                capacitySp={capacitySp}
                canManagePlan={canManagePlan}
                lifecycleBusy={lifecycleBusy}
                backlogRows={backlogRows}
                defaultCollapsed
                memberById={memberById}
                members={members}
                onDeleteStory={onDeleteStory}
                onEditStory={onEditStory}
                onOpenDetail={onOpenDetail}
                onManageEpic={onManageEpic}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
