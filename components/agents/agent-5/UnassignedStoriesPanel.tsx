'use client';

import { useDroppable } from '@dnd-kit/core';
import type { UserStory } from '@/lib/types/agent-2';
import type { StoryEstimation } from '@/lib/types/agent-3';
import type { StoryPrioritization, PrioritizationFramework } from '@/lib/types/agent-4';
import type { StoryDependency } from '@/lib/types/agent-5';
import { SprintStoryRow } from './SprintStoryRow';

interface UnassignedStoriesPanelProps {
  storyIds: string[];
  stories: UserStory[];
  estimations: Record<string, StoryEstimation>;
  priorities: Record<string, StoryPrioritization>;
  framework: PrioritizationFramework;
  dependencies: StoryDependency[];
  epicMap: Record<string, string>;
  isEditable: boolean;
  sprintOptions: { id: string; number: number }[];
  onAssign: (storyId: string, sprintId: string | null) => void;
}

export function UnassignedStoriesPanel({
  storyIds,
  stories,
  estimations,
  priorities,
  framework,
  dependencies,
  epicMap,
  isEditable,
  sprintOptions,
  onAssign,
}: UnassignedStoriesPanelProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'sprint:unassigned',
    data: { sprintId: null },
  });

  const unassignedStories = storyIds
    .map((id) => stories.find((s) => s.id === id))
    .filter(Boolean) as UserStory[];

  const storyTitles = Object.fromEntries(stories.map((s) => [s.id, s.title]));

  if (storyIds.length === 0 && !isEditable) return null;

  return (
    <div
      ref={setNodeRef}
      className={[
        'overflow-hidden rounded-xl border border-dashed transition-colors',
        isOver ? 'border-primary bg-primary/5' : 'border-border bg-surface-muted/30',
      ].join(' ')}
    >
      <div className="border-b border-border bg-surface-muted/40 px-4 py-2.5 sm:px-5">
        <h4 className="text-sm font-semibold text-foreground">
          Sin asignar
          {unassignedStories.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-muted">
              {unassignedStories.length}
            </span>
          )}
        </h4>
      </div>

      {unassignedStories.length > 0 ? (
        <div className="divide-y divide-border">
          {unassignedStories.map((story) => (
            <SprintStoryRow
              key={story.id}
              story={story}
              sprintId={null}
              estimations={estimations}
              priorities={priorities}
              framework={framework}
              dependencies={dependencies}
              epicMap={epicMap}
              storyTitles={storyTitles}
              isDraggable={isEditable}
              sprintOptions={isEditable ? sprintOptions : undefined}
              onAssign={isEditable ? onAssign : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="px-6 py-8 text-center text-sm text-muted">
          {isEditable ? 'Suelta historias aquí para desasignarlas.' : 'No hay historias sin asignar.'}
        </div>
      )}
    </div>
  );
}
