'use client';

import { useDroppable } from '@dnd-kit/core';
import { useState } from 'react';
import { formatEffortTotal } from '@/lib/utils/estimation';
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
import { getCapacityColor, type SprintRowsGroup } from './sprint-plan-groups';
import { AssignStoriesToSprintModal } from './AssignStoriesToSprintModal';
import { BacklogStoriesTableHead, BacklogStoryRow } from './BacklogStoryRow';
import { backlogTableClassName } from './backlog-table-layout';
import { SprintStatusBadge } from './SprintStatusBadge';

interface SprintPlanCardProps {
  group: SprintRowsGroup;
  framework: PrioritizationFramework | null;
  estimationMode: EstimationMode;
  plan: SprintPlan | null;
  sprintOptions: SprintOption[];
  capacitySp: number;
  canManagePlan: boolean;
  lifecycleBusy: boolean;
  backlogRows: DashboardSprintStoryRow[];
  defaultCollapsed?: boolean;
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
  onBulkAssign?: (sprintId: string, storyIds: string[]) => void;
  onOpenDetail: (row: DashboardSprintStoryRow) => void;
  onEditSprint?: () => void;
  onDeleteSprint?: () => void;
  onStartSprint?: () => void;
  onCompleteSprint?: () => void;
  onManageEpic?: (epicId: string) => void;
}

export function SprintPlanCard({
  group,
  framework,
  estimationMode,
  plan,
  sprintOptions,
  capacitySp,
  canManagePlan,
  lifecycleBusy,
  backlogRows,
  defaultCollapsed = false,
  memberById,
  members,
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
}: SprintPlanCardProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [assignOpen, setAssignOpen] = useState(false);

  const status = group.sprint ? getSprintStatus(group.sprint) : null;
  const isCompleted = status === 'completed';
  const dropDisabled = !canManagePlan || isCompleted;
  const showCapacity = estimationMode === 'story_points';
  const capacityPct = showCapacity ? Math.round((group.velocitySp / capacitySp) * 100) : 0;
  const isOverCapacity = showCapacity && group.velocitySp > capacitySp;

  const { setNodeRef, isOver } = useDroppable({
    id: `sprint:${group.key}`,
    data: { sprintId: group.key },
    disabled: dropDisabled,
  });

  const canBulkAssign =
    canManagePlan &&
    !isCompleted &&
    group.rows.length === 0 &&
    backlogRows.length > 0 &&
    onBulkAssign &&
    group.sprint;

  return (
    <>
      <article
        className={[
          'overflow-hidden rounded-xl border border-border bg-surface shadow-sm',
          group.colorClass,
          'border-l-2',
        ].join(' ')}
      >
        <header className="border-b border-border/60 px-4 py-3.5 @lg:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {isCompleted ? (
                  <button
                    type="button"
                    onClick={() => setCollapsed((v) => !v)}
                    className="cursor-pointer text-[13px] font-semibold text-foreground transition-colors hover:text-primary"
                    aria-expanded={!collapsed}
                  >
                    {group.label}
                  </button>
                ) : (
                  <h3 className="text-[13px] font-semibold text-foreground">{group.label}</h3>
                )}
                {status ? <SprintStatusBadge status={status} /> : null}
              </div>
              {group.sprint && onEditSprint && !isCompleted ? (
                <button
                  type="button"
                  onClick={onEditSprint}
                  className="mt-1 block max-w-full cursor-pointer truncate text-left text-[11px] text-subtle transition-colors hover:text-primary @2xl:max-w-2xl"
                  title="Editar sprint"
                >
                  {group.meta}
                </button>
              ) : (
                <p className="mt-1 truncate text-[11px] text-subtle">{group.meta}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {showCapacity && !isCompleted ? (
                <div
                  className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-surface-muted @md:w-20"
                  title={`${group.velocitySp}/${capacitySp} SP`}
                >
                  <div
                    className={`h-full rounded-full transition-all ${getCapacityColor(group.velocitySp, capacitySp)} ${isOverCapacity ? 'ring-1 ring-amber-400/40' : ''}`}
                    style={{ width: `${Math.min(capacityPct, 100)}%` }}
                  />
                </div>
              ) : null}

              <span className="shrink-0 rounded-full border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted">
                {group.rows.length} HU · {formatEffortTotal(group.velocitySp, estimationMode)}
              </span>

              {onStartSprint ? (
                <button
                  type="button"
                  onClick={onStartSprint}
                  disabled={lifecycleBusy}
                  className="cursor-pointer rounded-lg border border-border bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Iniciar
                </button>
              ) : null}

              {onCompleteSprint ? (
                <button
                  type="button"
                  onClick={onCompleteSprint}
                  disabled={lifecycleBusy}
                  className="cursor-pointer rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-foreground transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Cerrar
                </button>
              ) : null}

              {onDeleteSprint ? (
                <button
                  type="button"
                  onClick={onDeleteSprint}
                  className="cursor-pointer rounded-lg px-1.5 py-1 text-muted transition-colors hover:text-danger"
                  title="Eliminar sprint vacío"
                  aria-label="Eliminar sprint vacío"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ) : null}
            </div>
          </div>
        </header>

        {!collapsed ? (
          <div
            ref={!dropDisabled ? setNodeRef : undefined}
            className={[
              'transition-colors',
              isOver ? 'bg-primary/5 ring-2 ring-inset ring-primary/20' : '',
            ].join(' ')}
          >
            {group.rows.length === 0 ? (
              <div className="px-4 py-8 text-center @lg:px-6">
                <p className="text-xs text-muted">
                  {canManagePlan
                    ? isCompleted
                      ? 'Sprint cerrado.'
                      : 'Sin historias. Usa el selector Sprint o arrastra aquí.'
                    : 'Sin historias asignadas.'}
                </p>
                {canBulkAssign ? (
                  <button
                    type="button"
                    onClick={() => setAssignOpen(true)}
                    className="mt-3 cursor-pointer rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-surface-hover"
                  >
                    Asignar historias
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="@container min-w-0 overflow-x-auto">
                <table className={backlogTableClassName()}>
                  <BacklogStoriesTableHead estimationMode={estimationMode} />
                  <tbody>
                    {group.rows.map((row) => (
                      <BacklogStoryRow
                        key={row.id}
                        framework={framework}
                        estimationMode={estimationMode}
                        row={row}
                        assignee={row.assigneeId ? memberById.get(row.assigneeId) ?? null : null}
                        members={members}
                        plan={plan}
                        sprintOptions={sprintOptions}
                        canDrag={canManagePlan && !isCompleted}
                        canChangeSprint={canManagePlan && !isCompleted}
                        locked={isCompleted}
                        onDelete={async () => onDeleteStory(row.story.id)}
                        onEditStory={onEditStory}
                        onUpdateStoryStatus={onUpdateStoryStatus}
                        onUpdateStoryAssignee={onUpdateStoryAssignee}
                        onMoveStory={onMoveStory}
                        onOpenDetail={() => onOpenDetail(row)}
                        onManageEpic={onManageEpic}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </article>

      {canBulkAssign && group.sprint ? (
        <AssignStoriesToSprintModal
          key={group.key}
          open={assignOpen}
          sprintLabel={group.label}
          backlogRows={backlogRows}
          onClose={() => setAssignOpen(false)}
          onConfirm={(storyIds) => {
            onBulkAssign!(group.sprint!.id, storyIds);
            setAssignOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
