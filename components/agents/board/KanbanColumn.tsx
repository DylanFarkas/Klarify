'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { KanbanStatus } from '@/lib/types/execution';
import type { BoardStory } from '@/lib/board/board-utils';
import { formatEffortTotal } from '@/lib/utils/estimation';
import { KanbanCard } from './KanbanCard';
import type { ProjectMember } from '@/lib/types/execution';
import type { PrioritizationFramework } from '@/lib/types/agent-4';
import type { StoryDependency } from '@/lib/types/agent-5';

interface KanbanColumnProps {
  status: KanbanStatus;
  label: string;
  storyIds: string[];
  storiesById: Record<string, BoardStory>;
  stats: { count: number; points: number };
  members: ProjectMember[];
  framework: PrioritizationFramework;
  dependencies: StoryDependency[];
  storyMap: Record<string, string>;
  onOpenStory: (storyId: string) => void;
}

const COLUMN_DOT: Record<KanbanStatus, string> = {
  todo: 'bg-subtle',
  in_progress: 'bg-primary',
  code_review: 'bg-[var(--sileo-state-warning)]',
  done: 'bg-green-500',
};

export function KanbanColumn({
  status,
  label,
  storyIds,
  storiesById,
  stats,
  members,
  framework,
  dependencies,
  storyMap,
  onOpenStory,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${status}` });

  const projectEstimationMode =
    (storyIds[0] ? storiesById[storyIds[0]]?.estimationMode : undefined) ??
    Object.values(storiesById)[0]?.estimationMode ??
    'story_points';

  return (
    <div
      className={[
        'flex min-h-105 w-70 shrink-0 flex-col rounded-xl border border-border bg-surface',
        isOver ? 'border-border-strong' : '',
      ].join(' ')}
    >
      <header className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${COLUMN_DOT[status]}`}
              aria-hidden
            />
            <h3 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
              {label}
            </h3>
          </div>
          <span className="tabular-nums text-[11px] text-subtle">{stats.count}</span>
        </div>
        <p className="mt-0.5 pl-3.5 text-[11px] text-subtle">
          {formatEffortTotal(stats.points, projectEstimationMode)}
        </p>
      </header>

      <div
        ref={setNodeRef}
        className="flex min-h-80 flex-1 flex-col gap-2 overflow-y-auto p-3"
      >
        <SortableContext items={storyIds} strategy={verticalListSortingStrategy}>
          {storyIds.map((storyId) => {
            const item = storiesById[storyId];
            if (!item) return null;
            return (
              <KanbanCard
                key={storyId}
                item={item}
                members={members}
                framework={framework}
                allDependencies={dependencies}
                storyMap={storyMap}
                onOpen={onOpenStory}
              />
            );
          })}
        </SortableContext>
      </div>
    </div>
  );
}
