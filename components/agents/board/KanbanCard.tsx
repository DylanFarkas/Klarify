'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { BoardStory } from '@/lib/board/board-utils';
import { formatEstimation, isStoryEstimated } from '@/lib/utils/estimation';
import { memberInitials } from '@/lib/board/board-utils';
import type { ProjectMember } from '@/lib/types/execution';
import type { PrioritizationFramework } from '@/lib/types/agent-4';
import { getFrameworkShortLabels, getFrameworkColors } from '@/lib/constants/agent-4';
import { DependencyBadge } from '@/components/agents/agent-5/DependencyBadge';
import { WorkItemTypeBadge } from '@/components/agents/shared/WorkItemTypeBadge';
import type { StoryDependency } from '@/lib/types/agent-5';

interface KanbanCardProps {
  item: BoardStory;
  members: ProjectMember[];
  framework: PrioritizationFramework;
  allDependencies: StoryDependency[];
  storyMap: Record<string, string>;
  onOpen: (storyId: string) => void;
}

export function KanbanCard({
  item,
  members,
  framework,
  allDependencies,
  storyMap,
  onOpen,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.story.id, disabled: item.sprintLocked });

  const assignee = members.find((m) => m.id === item.execution.assigneeId);
  const priorityLabel = item.priority
    ? getFrameworkShortLabels(framework)[item.priority.category]
    : null;
  const priorityColor = item.priority
    ? getFrameworkColors(framework)[item.priority.category]
    : undefined;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'group rounded-lg bg-surface p-4 transition-colors',
        'hover:border-border hover:bg-surface-hover/30',
        isDragging ? 'border-border-strong' : '',
      ].join(' ')}
    >
      <div className="flex items-start gap-2">
        {item.sprintLocked ? (
          <span
            className="flex h-6 w-4 shrink-0 items-center justify-center self-start text-subtle"
            title="Sprint cerrado"
            aria-hidden
          />
        ) : (
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="flex h-6 w-4 shrink-0 cursor-grab touch-none items-center justify-center self-start rounded text-subtle/50 hover:bg-surface-hover hover:text-muted active:cursor-grabbing"
            aria-label="Arrastrar historia"
          >
            <svg className="block h-3.5 w-2" fill="currentColor" viewBox="0 0 10 18" aria-hidden>
              <circle cx="2.5" cy="2.5" r="1.5" />
              <circle cx="7.5" cy="2.5" r="1.5" />
              <circle cx="2.5" cy="9" r="1.5" />
              <circle cx="7.5" cy="9" r="1.5" />
              <circle cx="2.5" cy="15.5" r="1.5" />
              <circle cx="7.5" cy="15.5" r="1.5" />
            </svg>
          </button>
        )}

        <button
          type="button"
          onClick={() => onOpen(item.story.id)}
          className="min-w-0 flex-1 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-medium text-subtle">{item.story.id}</span>
            <WorkItemTypeBadge type={item.story.type} />
            {item.sprintNumber !== null && (
              <span className="text-[10px] text-subtle">S{item.sprintNumber}</span>
            )}
            <DependencyBadge
              storyId={item.story.id}
              dependencies={allDependencies}
              storyMap={storyMap}
              compact
            />
          </div>
          <p className="mt-2.5 line-clamp-2 cursor-pointer text-[13px] font-medium leading-snug text-foreground">
            {item.story.title}
          </p>
          <p className="mt-1 line-clamp-1 text-[11px] text-subtle">{item.epicTitle}</p>
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {isStoryEstimated(item.estimation, item.estimationMode) && (
            <span className="rounded-lg border border-border/60 px-1.5 py-0.5 text-[10px] font-medium text-subtle">
              {formatEstimation(item.estimation, item.estimationMode)}
            </span>
          )}
          {priorityLabel && (
            <span className="inline-flex items-center text-xs text-foreground font-medium">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: priorityColor }}
                aria-hidden
              />
              {priorityLabel}
            </span>
          )}
        </div>

        {assignee ? (
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-medium text-white"
            style={{ backgroundColor: assignee.avatarColor }}
            title={assignee.displayName}
          >
            {memberInitials(assignee.displayName)}
          </span>
        ) : (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/60 bg-surface-muted text-[9px] font-bold text-subtle">
            ?
          </span>
        )}
      </div>
    </div>
  );
}
