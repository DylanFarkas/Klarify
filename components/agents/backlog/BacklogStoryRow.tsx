'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { StorySprintSelect } from '@/components/agents/backlog/StorySprintSelect';
import { TimeDurationInput } from '@/components/agents/shared/TimeDurationInput';
import { useConfirm } from '@/components/agents/shared/ConfirmDialog';
import { ViewDetailsButton } from '@/components/agents/shared/ViewDetailsButton';
import { WorkItemIdLabel } from '@/components/agents/shared/WorkItemTypeBadge';
import { DropdownSelect } from '@/components/ui/DropdownSelect';
import type { UpdateDashboardUserStoryOptions } from '@/context/WorkspaceContext';
import { FIBONACCI_SCALE } from '@/lib/constants/agent-3';
import { getFrameworkCategories, getFrameworkShortLabels } from '@/lib/constants/agent-4';
import type { UserStory } from '@/lib/types/agent-2';
import type { EstimationMode, StoryEstimation } from '@/lib/types/agent-3';
import type { FrameworkCategory, PrioritizationFramework, StoryPrioritization } from '@/lib/types/agent-4';
import type { SprintPlan } from '@/lib/types/agent-5';
import type { KanbanStatus, ProjectMember } from '@/lib/types/execution';
import {
  backlogStoryHref,
  getEditableSprintOptions,
  isSprintAssignmentLocked,
  type SprintOption,
} from '@/lib/utils/backlog-story-navigation';
import type { DashboardSprintStoryRow } from '@/components/agents/dashboard/dashboardMetrics';
import { AssigneeAvatarStatic, AssigneeSelect } from '@/components/agents/dashboard/AssigneeSelect';
import { ExecutionStatusBadge, ExecutionStatusSelect } from '@/components/agents/dashboard/ExecutionStatusBadge';
import {
  BacklogStoriesTableColGroup,
  backlogTableHeadCell,
  backlogTableCell,
} from './backlog-table-layout';

export function BacklogStoriesTableHead({
  estimationMode,
}: {
  estimationMode: EstimationMode;
}) {
  return (
    <>
      <BacklogStoriesTableColGroup estimationMode={estimationMode} />
      <thead>
        <tr className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">
          <th className={backlogTableHeadCell.id}>ID</th>
          <th className={backlogTableHeadCell.hu}>HU</th>
          <th className={backlogTableHeadCell.epic}>Epica</th>
          <th className={backlogTableHeadCell.sp}>
            {estimationMode === 'time' ? 'Tiempo' : 'SP'}
          </th>
          <th className={backlogTableHeadCell.priority}>Prioridad</th>
          <th className={backlogTableHeadCell.sprint}>Sprint</th>
          <th className={backlogTableHeadCell.status}>Estado</th>
          <th className={backlogTableHeadCell.assignee}>Asignado</th>
          <th className={backlogTableHeadCell.actions}>Acciones</th>
        </tr>
      </thead>
    </>
  );
}

interface BacklogStoryRowProps {
  framework: PrioritizationFramework | null;
  estimationMode: EstimationMode;
  row: DashboardSprintStoryRow;
  assignee: ProjectMember | null;
  members: ProjectMember[];
  plan: SprintPlan | null;
  sprintOptions: SprintOption[];
  canDrag: boolean;
  canChangeSprint: boolean;
  locked?: boolean;
  onDelete: () => Promise<void>;
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
  onOpenDetail: () => void;
  onManageEpic?: (epicId: string) => void;
}

export function BacklogStoryRow({
  framework,
  estimationMode,
  row,
  assignee,
  members,
  plan,
  sprintOptions,
  canDrag,
  canChangeSprint,
  locked = false,
  onDelete,
  onEditStory,
  onUpdateStoryStatus,
  onUpdateStoryAssignee,
  onMoveStory,
  onOpenDetail,
  onManageEpic,
}: BacklogStoryRowProps) {
  const confirm = useConfirm();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingField, setIsSavingField] = useState<
    'points' | 'priority' | 'status' | 'assignee' | 'sprint' | null
  >(null);

  const dragId = `story:${row.story.id}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: { storyId: row.story.id, sprintId: row.sprintId },
    disabled: !canDrag,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }
    : isDragging
      ? { opacity: 0.5 }
      : undefined;

  const rowSprintOptions = useMemo(
    () => getEditableSprintOptions(plan, row),
    [plan, row]
  );
  const effectiveSprintOptions = rowSprintOptions.length > 0 ? rowSprintOptions : sprintOptions;
  const sprintLocked = locked || isSprintAssignmentLocked(row, plan);

  const currentPoints = row.estimation?.points ?? 0;
  const pointsOptions = useMemo(() => {
    const scale = FIBONACCI_SCALE.map((value) => ({
      value: String(value),
      label: String(value),
    }));
    if (currentPoints > 0 && !FIBONACCI_SCALE.includes(currentPoints as (typeof FIBONACCI_SCALE)[number])) {
      return [{ value: String(currentPoints), label: String(currentPoints) }, ...scale];
    }
    return scale;
  }, [currentPoints]);

  const priorityOptions = useMemo(() => {
    if (!framework) return [];
    const labels = getFrameworkShortLabels(framework);
    return getFrameworkCategories(framework).map((category) => ({
      value: category,
      label: labels[category] ?? category,
    }));
  }, [framework]);

  const fieldsDisabled = locked || isSavingField !== null;

  const handleSprintChange = (nextSprintId: string | null) => {
    if (!onMoveStory || sprintLocked || isSavingField) return;
    if ((row.sprintId ?? null) === nextSprintId) return;
    setIsSavingField('sprint');
    try {
      onMoveStory(row.story.id, row.sprintId ?? null, nextSprintId);
    } finally {
      setIsSavingField(null);
    }
  };

  const sprintControl =
    canChangeSprint && onMoveStory && !sprintLocked ? (
      <StorySprintSelect
        value={row.sprintId}
        options={effectiveSprintOptions}
        disabled={isSavingField !== null}
        onChange={handleSprintChange}
        storyId={row.story.id}
      />
    ) : (
      <span className="truncate text-xs text-muted">
        {row.sprintNumber ? `Sprint ${row.sprintNumber}` : 'Backlog'}
      </span>
    );

  const statusControl =
    onUpdateStoryStatus && !locked ? (
      <ExecutionStatusSelect
        status={row.executionStatus}
        onChange={async (nextStatus) => {
          if (isSavingField) return;
          if (nextStatus === row.executionStatus) return;
          setIsSavingField('status');
          try {
            await onUpdateStoryStatus(row.story.id, nextStatus);
          } finally {
            setIsSavingField(null);
          }
        }}
        disabled={isSavingField !== null}
        aria-label={`Estado de ${row.story.id}`}
      />
    ) : (
      <ExecutionStatusBadge status={row.executionStatus} />
    );

  const assigneeControl =
    onUpdateStoryAssignee && !locked ? (
      <AssigneeSelect
        assignee={assignee}
        members={members}
        onChange={async (nextAssigneeId) => {
          if (isSavingField) return;
          if (nextAssigneeId === (assignee?.id ?? null)) return;
          setIsSavingField('assignee');
          try {
            await onUpdateStoryAssignee(row.story.id, nextAssigneeId);
          } finally {
            setIsSavingField(null);
          }
        }}
        disabled={isSavingField !== null}
        aria-label={`Responsable de ${row.story.id}`}
      />
    ) : (
      <AssigneeAvatarStatic assignee={assignee} />
    );

  return (
    <tr
      ref={canDrag ? setNodeRef : undefined}
      style={style}
      className={[
        'transition-colors hover:bg-surface-hover/30 border-b border-border/60',
        isDragging ? 'bg-surface-muted/50' : '',
      ].join(' ')}
    >
      <td className={backlogTableCell.id}>
        <WorkItemIdLabel id={row.story.id} type={row.story.type} />
      </td>
      <td className={backlogTableCell.hu}>
        <div className="flex min-w-0 items-center gap-2.5">
          {canDrag ? (
            <button
              type="button"
              className="shrink-0 cursor-grab touch-none rounded p-0.5 text-subtle/60 transition-colors hover:bg-surface-muted hover:text-muted active:cursor-grabbing"
              aria-label="Arrastrar ítem"
              {...listeners}
              {...attributes}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
              </svg>
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 @3xl:hidden">
              <WorkItemIdLabel id={row.story.id} type={row.story.type} />
            </div>
            <Link
              href={backlogStoryHref(row.story.id)}
              className="block min-w-0 truncate text-sm font-medium text-foreground transition-colors hover:text-primary"
              title={row.story.title}
            >
              {row.story.title}
            </Link>
            {onManageEpic ? (
              <button
                type="button"
                onClick={() => onManageEpic(row.epicId)}
                className="mt-0.5 block max-w-full cursor-pointer truncate text-left text-[11px] text-subtle transition-colors hover:text-muted @lg:hidden"
                title={row.epicTitle}
              >
                {row.epicTitle}
              </button>
            ) : (
              <p className="mt-0.5 truncate text-[11px] text-subtle @lg:hidden" title={row.epicTitle}>
                {row.epicTitle}
              </p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-2 @lg:hidden">
              {sprintControl}
              {statusControl}
              {assigneeControl}
            </div>
          </div>
        </div>
      </td>
      <td className={backlogTableCell.epic}>
        {onManageEpic ? (
          <button
            type="button"
            onClick={() => onManageEpic(row.epicId)}
            className="block w-full min-w-0 cursor-pointer truncate text-left text-[13px] text-subtle transition-colors hover:text-foreground"
            title={row.epicTitle}
          >
            {row.epicTitle}
          </button>
        ) : (
          <span className="block truncate text-[13px] text-subtle" title={row.epicTitle}>
            {row.epicTitle}
          </span>
        )}
      </td>
      <td className={backlogTableCell.sp}>
        {estimationMode === 'time' ? (
          <TimeDurationInput
            id={`dash-duration-${row.story.id}`}
            value={row.estimation?.durationLabel ?? ''}
            disabled={fieldsDisabled}
            onCommit={async (label, minutes) => {
              if (minutes === (row.estimation?.durationMinutes ?? 0) || isSavingField) return;
              setIsSavingField('points');
              try {
                await onEditStory(row.story.id, {}, {
                  points: 0,
                  durationMinutes: minutes,
                  durationLabel: label,
                  justification:
                    row.estimation?.justification ||
                    'Estimacion ajustada manualmente desde el dashboard.',
                  isModified: true,
                });
              } finally {
                setIsSavingField(null);
              }
            }}
            size="compact"
            className="min-w-0"
          />
        ) : (
          <DropdownSelect
            value={currentPoints > 0 ? String(currentPoints) : ''}
            onChange={async (nextValue) => {
              const nextPoints = Number(nextValue);
              if (!Number.isFinite(nextPoints) || nextPoints === currentPoints || isSavingField) return;
              setIsSavingField('points');
              try {
                await onEditStory(row.story.id, {}, {
                  points: nextPoints,
                  justification:
                    row.estimation?.justification ||
                    'Estimacion ajustada manualmente desde el dashboard.',
                  isModified: true,
                });
              } finally {
                setIsSavingField(null);
              }
            }}
            options={pointsOptions}
            placeholder="—"
            disabled={fieldsDisabled}
            size="compact"
            className="w-full"
            aria-label={`Story points de ${row.story.id}`}
          />
        )}
      </td>
      <td className={backlogTableCell.priority}>
        {framework ? (
          <DropdownSelect
            value={row.prioritization?.category ?? ''}
            onChange={async (nextValue) => {
              if (isSavingField) return;
              const nextCategory = nextValue as FrameworkCategory;
              if (nextCategory === row.prioritization?.category) return;
              setIsSavingField('priority');
              try {
                await onEditStory(
                  row.story.id,
                  {},
                  undefined,
                  undefined,
                  {
                    category: nextCategory,
                    justification:
                      row.prioritization?.justification ||
                      'Priorizacion ajustada manualmente desde el dashboard.',
                    isModified: true,
                  }
                );
              } finally {
                setIsSavingField(null);
              }
            }}
            options={priorityOptions}
            placeholder="—"
            disabled={fieldsDisabled}
            size="compact"
            className="w-full"
            aria-label={`Prioridad de ${row.story.id}`}
          />
        ) : (
          <span className="text-xs text-muted">N/D</span>
        )}
      </td>
      <td className={backlogTableCell.sprint}>
        {sprintControl}
      </td>
      <td className={backlogTableCell.status}>
        {statusControl}
      </td>
      <td className={backlogTableCell.assignee}>
        {assigneeControl}
      </td>
      <td className={backlogTableCell.actions}>
        <div className="flex justify-end gap-0.5 @lg:gap-1">
          <ViewDetailsButton onClick={onOpenDetail} label="Ver HU en detalle" />
          {locked ? null : (
            <button
              type="button"
              onClick={async () => {
                const confirmed = await confirm({
                  title: `¿Eliminar ${row.story.id}?`,
                  description: `"${row.story.title}" se eliminará del backlog. Esta acción no se puede deshacer.`,
                  confirmLabel: 'Eliminar',
                  variant: 'danger',
                });
                if (!confirmed) return;
                setIsDeleting(true);
                try {
                  await onDelete();
                } finally {
                  setIsDeleting(false);
                }
              }}
              disabled={isDeleting}
              aria-label="Eliminar HU"
              title="Eliminar HU"
              className={[
                'cursor-pointer inline-flex items-center justify-center rounded-md p-1.5 text-subtle transition-all',
                isDeleting
                  ? 'cursor-not-allowed opacity-60'
                  : 'hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/30',
              ].join(' ')}
            >
              <TrashIcon />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}
