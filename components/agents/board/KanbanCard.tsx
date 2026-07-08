'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { BoardStory } from '@/lib/board/board-utils';
import { memberInitials } from '@/lib/board/board-utils';
import type { ProjectMember } from '@/lib/types/execution';
import type { PrioritizationFramework } from '@/lib/types/agent-4';
import { getFrameworkShortLabels, getFrameworkColors } from '@/lib/constants/agent-4';
import { DependencyBadge } from '@/components/agents/agent-5/DependencyBadge';
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
  } = useSortable({ id: item.story.id });

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
    opacity: isDragging ? 0.45 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'group rounded-xl border border-border/80 bg-background/90 p-3 shadow-sm transition-shadow',
        'hover:border-primary/25 hover:shadow-md',
        isDragging ? 'ring-2 ring-primary/30 opacity-45' : '',
      ].join(' ')}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="flex h-7 w-5 shrink-0 items-center justify-center self-start rounded-md cursor-grab touch-none text-subtle hover:bg-surface-hover hover:text-muted active:cursor-grabbing"
          aria-label="Arrastrar historia"
        >
          <svg className="block h-[18px] w-[10px]" fill="currentColor" viewBox="0 0 10 18" aria-hidden>
            <circle cx="2.5" cy="2.5" r="1.5" />
            <circle cx="7.5" cy="2.5" r="1.5" />
            <circle cx="2.5" cy="9" r="1.5" />
            <circle cx="7.5" cy="9" r="1.5" />
            <circle cx="2.5" cy="15.5" r="1.5" />
            <circle cx="7.5" cy="15.5" r="1.5" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => onOpen(item.story.id)}
          className="min-w-0 flex-1 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] font-medium text-subtle">{item.story.id}</span>
            {item.sprintNumber !== null && (
              <span className="rounded-md bg-surface-muted px-1.5 py-0.5 text-[9px] font-bold text-muted">
                S{item.sprintNumber}
              </span>
            )}
            <DependencyBadge
              storyId={item.story.id}
              dependencies={allDependencies}
              storyMap={storyMap}
              compact
            />
          </div>
          <p className="mt-1 line-clamp-2 text-sm font-semibold text-foreground cursor-pointer">{item.story.title}</p>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-subtle">{item.epicTitle}</p>
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {item.points > 0 && (
            <span className="rounded-md border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] font-bold text-muted">
              {item.points} SP
            </span>
          )}
          {priorityLabel && (
            <span
              className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white"
              style={{ backgroundColor: priorityColor }}
            >
              {priorityLabel}
            </span>
          )}
        </div>

        {assignee ? (
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
            style={{ backgroundColor: assignee.avatarColor }}
            title={assignee.displayName}
          >
            {memberInitials(assignee.displayName)}
          </span>
        ) : (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-[9px] text-subtle">
            ?
          </span>
        )}
      </div>
    </div>
  );
}
