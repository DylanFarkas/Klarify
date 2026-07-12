'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import type { UserStory } from '@/lib/types/agent-2';
import type { StoryEstimation } from '@/lib/types/agent-3';
import type { StoryPrioritization, PrioritizationFramework } from '@/lib/types/agent-4';
import type { StoryDependency } from '@/lib/types/agent-5';
import { getFrameworkShortLabels, getFrameworkColors } from '@/lib/constants/agent-4';
import { DetailModal } from '@/components/agents/shared/DetailModal';
import { UserStoryDetailContent } from '@/components/agents/shared/UserStoryDetailContent';
import { ViewDetailsButton } from '@/components/agents/shared/ViewDetailsButton';
import { DependencyBadge } from './DependencyBadge';

interface SprintStoryRowProps {
  story: UserStory;
  sprintId: string | null;
  estimations: Record<string, StoryEstimation>;
  priorities: Record<string, StoryPrioritization>;
  framework: PrioritizationFramework;
  dependencies: StoryDependency[];
  epicMap: Record<string, string>;
  storyTitles: Record<string, string>;
  isDraggable: boolean;
  sprintOptions?: { id: string; number: number }[];
  onAssign?: (storyId: string, sprintId: string | null) => void;
}

export function SprintStoryRow({
  story,
  sprintId,
  estimations,
  priorities,
  framework,
  dependencies,
  epicMap,
  storyTitles,
  isDraggable,
  sprintOptions,
  onAssign,
}: SprintStoryRowProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const dragId = `story:${story.id}`;
  const showSprintSelector = Boolean(sprintOptions && onAssign && sprintId === null);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: { storyId: story.id, sprintId },
    disabled: !isDraggable,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }
    : undefined;

  const pri = priorities[story.id];
  const est = estimations[story.id];
  const labels = getFrameworkShortLabels(framework);
  const colors = getFrameworkColors(framework);

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`group px-4 py-2.5 sm:px-5 hover:bg-surface-hover/30 transition-colors ${isDragging ? 'bg-surface-muted/50' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isDraggable && (
            <button
              type="button"
              className="shrink-0 cursor-grab touch-none rounded p-0.5 text-muted/50 hover:bg-surface-muted hover:text-foreground active:cursor-grabbing"
              aria-label="Arrastrar historia"
              {...listeners}
              {...attributes}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
              </svg>
            </button>
          )}
          <span className="shrink-0 font-mono text-[10px] text-muted/70">{story.id}</span>
          <h5 className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{story.title}</h5>
          <DependencyBadge
            storyId={story.id}
            dependencies={dependencies}
            storyMap={storyTitles}
            compact
          />
          <div className="flex shrink-0 items-center gap-1.5">
            {pri && (
              <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${colors[pri.category] ?? ''}`}>
                {labels[pri.category] ?? pri.category}
              </span>
            )}
            {est && (
              <span className="text-[10px] font-semibold tabular-nums text-muted">
                {est.points} SP
              </span>
            )}
            <ViewDetailsButton
              onClick={() => setDetailOpen(true)}
              className="p-1 text-muted/50 hover:text-primary sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            />
            {showSprintSelector && (
              <select
                value="_unassigned"
                onChange={(e) => {
                  const val = e.target.value;
                  onAssign!(story.id, val === '_unassigned' ? null : val);
                }}
                className="rounded-lg border border-border bg-surface px-2 py-1 text-[10px] font-semibold text-foreground focus:border-primary focus:outline-none cursor-pointer"
                aria-label="Asignar sprint"
              >
                <option value="_unassigned">Sin asignar</option>
                {sprintOptions!.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    Sprint {opt.number}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      <DetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={story.title}
        subtitle={story.id}
        eyebrow="Historia de usuario"
      >
        <UserStoryDetailContent
          story={story}
          epicTitle={epicMap[story.id] ?? ''}
          estimation={est}
          prioritization={pri}
          framework={framework}
        />
      </DetailModal>
    </>
  );
}
