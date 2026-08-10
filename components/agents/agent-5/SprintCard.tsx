'use client';

import { useDroppable } from '@dnd-kit/core';
import { useState } from 'react';
import type { PlannedSprint, SprintDatePatch, StoryDependency } from '@/lib/types/agent-5';
import type { UserStory } from '@/lib/types/agent-2';
import type { StoryEstimation } from '@/lib/types/agent-3';
import type { StoryPrioritization } from '@/lib/types/agent-4';
import { formatDateRangeEs } from '@/lib/utils/dates';
import { SprintEditModal } from './SprintEditModal';
import { SprintStoryRow } from './SprintStoryRow';
import type { PrioritizationFramework } from '@/lib/types/agent-4';

interface SprintCardProps {
  sprint: PlannedSprint;
  sprintIndex: number;
  allSprints: PlannedSprint[];
  stories: UserStory[];
  estimations: Record<string, StoryEstimation>;
  priorities: Record<string, StoryPrioritization>;
  framework: PrioritizationFramework;
  dependencies: StoryDependency[];
  epicMap: Record<string, string>;
  colorClass: string;
  sprintCapacitySp: number;
  defaultDurationWeeks: number;
  totalProjectSp: number;
  completedSpBefore: number;
  onGoalChange: (goal: string) => void;
  onDatesChange: (patch: SprintDatePatch) => void;
  onAssignStory: (storyId: string, sprintId: string | null) => void;
  onDeleteSprint?: () => void;
  isEditable: boolean;
}

function getCapacityColor(velocity: number, capacity: number): string {
  const ratio = velocity / capacity;
  if (ratio <= 0.5) return 'bg-emerald-500';
  if (ratio <= 0.75) return 'bg-amber-500';
  if (ratio <= 1.0) return 'bg-orange-500';
  return 'bg-red-500';
}

export function SprintCard({
  sprint,
  sprintIndex,
  allSprints,
  stories,
  estimations,
  priorities,
  framework,
  dependencies,
  epicMap,
  colorClass,
  sprintCapacitySp,
  defaultDurationWeeks,
  totalProjectSp,
  completedSpBefore,
  onGoalChange,
  onDatesChange,
  onAssignStory,
  onDeleteSprint,
  isEditable,
}: SprintCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: `sprint:${sprint.id}`,
    data: { sprintId: sprint.id },
  });

  const sprintStories = sprint.storyIds
    .map((id) => stories.find((s) => s.id === id))
    .filter(Boolean) as UserStory[];

  const storyTitles = Object.fromEntries(stories.map((s) => [s.id, s.title]));

  const cumulativePct = totalProjectSp > 0 ? Math.round(((completedSpBefore + sprint.velocitySp) / totalProjectSp) * 100) : 0;
  const capacityPct = Math.round((sprint.velocitySp / sprintCapacitySp) * 100);
  const isOverCapacity = sprint.velocitySp > sprintCapacitySp;

  const openEditModal = () => {
    if (isEditable) setEditModalOpen(true);
  };

  const capacityTitle = isOverCapacity
    ? `${sprint.velocitySp}/${sprintCapacitySp} SP — excede capacidad`
    : `${sprint.velocitySp}/${sprintCapacitySp} SP (${capacityPct}% capacidad) · avance proyecto ${cumulativePct}%`;

  return (
    <>
      <div
        ref={setNodeRef}
        className={[
          'group overflow-hidden rounded-xl border bg-surface transition-colors',
          colorClass,
          isOver ? 'border-border-strong bg-surface-hover/40' : 'border-border',
          isOverCapacity ? 'border-amber-500/40' : '',
        ].join(' ')}
      >
        <div className={`px-4 py-3 sm:px-5 ${isExpanded ? 'border-b border-border' : ''}`}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              title={isExpanded ? 'Colapsar historias' : 'Ver historias'}
              aria-expanded={isExpanded}
            >
              <svg
                className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="shrink-0 text-[11px] font-medium tabular-nums text-subtle">
                  Sprint {sprintIndex + 1}
                </span>
                {sprint.isEdited && (
                  <span className="shrink-0 text-[11px] text-subtle">· Editado</span>
                )}
              </div>
              <h4
                className={`truncate text-[15px] font-medium text-foreground ${isEditable ? 'cursor-pointer hover:text-muted' : ''}`}
                onClick={openEditModal}
                title={isEditable ? 'Click para editar sprint' : sprint.sprintGoal}
              >
                {sprint.sprintGoal}
              </h4>
              <p className="mt-0.5 text-[12px] text-subtle">
                {sprintStories.length} historia{sprintStories.length !== 1 ? 's' : ''} · {sprint.velocitySp} SP
                <span className="mx-1.5 text-border">·</span>
                <button
                  type="button"
                  onClick={openEditModal}
                  disabled={!isEditable}
                  className={isEditable ? 'cursor-pointer hover:text-foreground' : 'cursor-default'}
                >
                  {formatDateRangeEs(sprint.startDate, sprint.endDate)}
                </button>
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div
                className="h-1.5 w-20 overflow-hidden rounded-full bg-border sm:w-24"
                title={capacityTitle}
              >
                <div
                  className={`h-full rounded-full transition-all ${getCapacityColor(sprint.velocitySp, sprintCapacitySp)}`}
                  style={{ width: `${Math.min(capacityPct, 100)}%` }}
                />
              </div>
              {isEditable && onDeleteSprint && sprint.storyIds.length === 0 && (
                <button
                  type="button"
                  onClick={onDeleteSprint}
                  className="cursor-pointer rounded-lg px-1.5 py-1 text-muted opacity-100 transition-opacity hover:text-danger sm:opacity-0 sm:group-hover:opacity-100"
                  title="Eliminar sprint vacío"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {isExpanded && sprintStories.length > 0 && (
          <div className="divide-y divide-border">
            {sprintStories.map((story) => (
              <SprintStoryRow
                key={story.id}
                story={story}
                sprintId={sprint.id}
                estimations={estimations}
                priorities={priorities}
                framework={framework}
                dependencies={dependencies}
                epicMap={epicMap}
                storyTitles={storyTitles}
                isDraggable={isEditable}
              />
            ))}
          </div>
        )}

        {isExpanded && sprintStories.length === 0 && (
          <div className="px-5 py-6 text-center text-sm text-muted">
            {isEditable ? 'Sin historias — arrastra aquí para asignar.' : 'Sin historias asignadas.'}
          </div>
        )}
      </div>

      {isEditable && (
        <SprintEditModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          sprint={sprint}
          sprintIndex={sprintIndex}
          allSprints={allSprints}
          defaultDurationWeeks={defaultDurationWeeks}
          onGoalChange={onGoalChange}
          onDatesChange={onDatesChange}
        />
      )}
    </>
  );
}
