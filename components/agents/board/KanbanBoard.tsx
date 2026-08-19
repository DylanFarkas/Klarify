'use client';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { BoardStory } from '@/lib/board/board-utils';
import { groupStoriesByColumn, computeColumnStats } from '@/lib/board/board-utils';
import { KANBAN_COLUMNS, type KanbanStatus } from '@/lib/types/execution';
import type { ProjectMember } from '@/lib/types/execution';
import type { PrioritizationFramework } from '@/lib/types/agent-4';
import type { StoryDependency } from '@/lib/types/agent-5';
import { KanbanColumn } from './KanbanColumn';

interface KanbanBoardProps {
  stories: BoardStory[];
  members: ProjectMember[];
  framework: PrioritizationFramework;
  dependencies: StoryDependency[];
  storyMap: Record<string, string>;
  onBulkReorder: (updates: { storyId: string; status: KanbanStatus; columnOrder: number }[]) => void;
  onOpenStory: (storyId: string) => void;
}

type ColumnItems = Record<KanbanStatus, string[]>;

function toColumnItems(grouped: Record<KanbanStatus, BoardStory[]>): ColumnItems {
  return {
    todo: grouped.todo.map((item) => item.story.id),
    in_progress: grouped.in_progress.map((item) => item.story.id),
    code_review: grouped.code_review.map((item) => item.story.id),
    done: grouped.done.map((item) => item.story.id),
  };
}

function buildStoryLayoutKey(stories: BoardStory[]): string {
  return stories
    .map((item) => `${item.story.id}:${item.execution.status}:${item.execution.columnOrder}`)
    .join('|');
}

function buildColumnItemsKey(items: ColumnItems): string {
  return KANBAN_COLUMNS.map((column) => `${column.id}:${items[column.id].join(',')}`).join('|');
}

function findColumn(storyId: string, items: ColumnItems): KanbanStatus | null {
  if (storyId.startsWith('column:')) {
    return storyId.replace('column:', '') as KanbanStatus;
  }

  for (const column of KANBAN_COLUMNS) {
    if (items[column.id].includes(storyId)) {
      return column.id;
    }
  }

  return null;
}

function getInsertIndex(
  overId: string,
  container: KanbanStatus,
  items: ColumnItems
): number {
  if (overId.startsWith('column:')) {
    return items[container].length;
  }

  const index = items[container].indexOf(overId);
  return index === -1 ? items[container].length : index;
}

function buildUpdates(items: ColumnItems): { storyId: string; status: KanbanStatus; columnOrder: number }[] {
  const updates: { storyId: string; status: KanbanStatus; columnOrder: number }[] = [];

  for (const column of KANBAN_COLUMNS) {
    items[column.id].forEach((storyId, index) => {
      updates.push({ storyId, status: column.id, columnOrder: index });
    });
  }

  return updates;
}

function moveBetweenColumns(
  items: ColumnItems,
  activeId: string,
  activeContainer: KanbanStatus,
  overContainer: KanbanStatus,
  overId: string
): ColumnItems {
  const overIndex = getInsertIndex(overId, overContainer, items);

  return {
    ...items,
    [activeContainer]: items[activeContainer].filter((id) => id !== activeId),
    [overContainer]: [
      ...items[overContainer].filter((id) => id !== activeId).slice(0, overIndex),
      activeId,
      ...items[overContainer].filter((id) => id !== activeId).slice(overIndex),
    ],
  };
}

function finalizeColumnItems(
  items: ColumnItems,
  activeId: string,
  overId: string
): ColumnItems {
  const activeContainer = findColumn(activeId, items);
  const overContainer = findColumn(overId, items);
  if (!activeContainer || !overContainer) return items;

  if (activeContainer !== overContainer) {
    return moveBetweenColumns(items, activeId, activeContainer, overContainer, overId);
  }

  const oldIndex = items[activeContainer].indexOf(activeId);
  const newIndex = getInsertIndex(overId, overContainer, items);
  if (oldIndex === -1 || oldIndex === newIndex) {
    return items;
  }

  return {
    ...items,
    [activeContainer]: arrayMove(items[activeContainer], oldIndex, newIndex),
  };
}

const kanbanCollision: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) return pointerHits;
  return rectIntersection(args);
};

export function KanbanBoard({
  stories,
  members,
  framework,
  dependencies,
  storyMap,
  onBulkReorder,
  onOpenStory,
}: KanbanBoardProps) {
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const isDraggingRef = useRef(false);
  const layoutKey = buildStoryLayoutKey(stories);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const grouped = useMemo(() => groupStoriesByColumn(stories), [stories]);
  const stats = useMemo(() => computeColumnStats(stories), [stories]);

  const storiesById = useMemo(() => {
    const map: Record<string, BoardStory> = {};
    for (const item of stories) {
      map[item.story.id] = item;
    }
    return map;
  }, [stories]);

  const [columnItems, setColumnItems] = useState<ColumnItems>(() => toColumnItems(grouped));

  useEffect(() => {
    if (isDraggingRef.current) return;
    const next = toColumnItems(groupStoriesByColumn(stories));
    setColumnItems((prev) =>
      buildColumnItemsKey(prev) === buildColumnItemsKey(next) ? prev : next
    );
  }, [layoutKey, stories]);

  const activeItem = activeStoryId ? storiesById[activeStoryId] ?? null : null;

  const handleDragStart = (event: DragStartEvent) => {
    const storyId = String(event.active.id);
    if (storiesById[storyId]?.sprintLocked) {
      isDraggingRef.current = false;
      return;
    }
    isDraggingRef.current = true;
    setActiveStoryId(storyId);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    setColumnItems((prev) => {
      const activeContainer = findColumn(activeId, prev);
      const overContainer = findColumn(overId, prev);

      if (!activeContainer || !overContainer || activeContainer === overContainer) {
        return prev;
      }

      return moveBetweenColumns(prev, activeId, activeContainer, overContainer, overId);
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = String(active.id);

    if (!over) {
      isDraggingRef.current = false;
      setActiveStoryId(null);
      return;
    }

    const overId = String(over.id);
    let persistedItems: ColumnItems | null = null;

    setColumnItems((prev) => {
      const next = finalizeColumnItems(prev, activeId, overId);
      persistedItems = next;
      return next;
    });

    if (persistedItems) {
      onBulkReorder(buildUpdates(persistedItems));
    }

    isDraggingRef.current = false;
    setActiveStoryId(null);
  };

  const handleDragCancel = () => {
    isDraggingRef.current = false;
    setActiveStoryId(null);
    setColumnItems(toColumnItems(grouped));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={kanbanCollision}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            status={col.id}
            label={col.label}
            storyIds={columnItems[col.id]}
            storiesById={storiesById}
            stats={stats[col.id]}
            members={members}
            framework={framework}
            dependencies={dependencies}
            storyMap={storyMap}
            onOpenStory={onOpenStory}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div className="w-65 rounded-lg border border-border-strong bg-surface p-3 shadow-md">
            <span className="font-mono text-[10px] font-medium text-subtle">{activeItem.story.id}</span>
            <p className="mt-1 line-clamp-2 text-[13px] font-medium text-foreground">{activeItem.story.title}</p>
            <p className="mt-0.5 line-clamp-1 text-[11px] text-subtle">{activeItem.epicTitle}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
