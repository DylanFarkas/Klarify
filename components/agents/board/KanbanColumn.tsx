'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { KanbanStatus } from '@/lib/types/execution';
import type { BoardStory } from '@/lib/board/board-utils';
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

const COLUMN_ACCENT: Record<KanbanStatus, string> = {
  todo: 'border-t-slate-400',
  in_progress: 'border-t-blue-500',
  code_review: 'border-t-amber-500',
  done: 'border-t-emerald-500',
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

  return (
    <div
      className={[
        'flex min-h-[420px] w-[280px] shrink-0 flex-col rounded-2xl border border-border/80 bg-surface/50',
        'border-t-[3px]',
        COLUMN_ACCENT[status],
        isOver ? 'ring-2 ring-primary/25' : '',
      ].join(' ')}
    >
      <header className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground">{label}</h3>
          <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-bold text-muted">
            {stats.count}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] text-subtle">{stats.points} SP</p>
      </header>

      <div
        ref={setNodeRef}
        className="flex min-h-[320px] flex-1 flex-col gap-2 overflow-y-auto p-3"
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
