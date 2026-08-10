'use client';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useState } from 'react';
import type { SprintPlan, SprintDatePatch } from '@/lib/types/agent-5';
import type { UserStory } from '@/lib/types/agent-2';
import type { StoryEstimation } from '@/lib/types/agent-3';
import type { StoryPrioritization, PrioritizationFramework } from '@/lib/types/agent-4';
import { SPRINT_COLORS } from '@/lib/constants/agent-5';
import { SprintCard } from './SprintCard';
import { UnassignedStoriesPanel } from './UnassignedStoriesPanel';
import { DependencyBadge } from './DependencyBadge';

interface SprintBoardProps {
  plan: SprintPlan;
  stories: UserStory[];
  estimations: Record<string, StoryEstimation>;
  priorities: Record<string, StoryPrioritization>;
  framework: PrioritizationFramework;
  epicMap: Record<string, string>;
  isApproved: boolean;
  onGoalChange: (sprintId: string, goal: string) => void;
  onDatesChange: (sprintId: string, patch: SprintDatePatch) => void;
  onMoveStory: (storyId: string, fromSprintId: string | null, toSprintId: string | null) => void;
  onAddSprint?: () => void;
  onDeleteSprint?: (sprintIndex: number) => void;
}

function parseDragId(id: string): { type: 'story' | 'sprint'; value: string } | null {
  const [type, value] = id.split(':');
  if ((type === 'story' || type === 'sprint') && value) {
    return { type, value: type === 'sprint' && value === 'unassigned' ? 'unassigned' : value };
  }
  return null;
}

export function SprintBoard({
  plan,
  stories,
  estimations,
  priorities,
  framework,
  epicMap,
  isApproved,
  onGoalChange,
  onDatesChange,
  onMoveStory,
  onAddSprint,
  onDeleteSprint,
}: SprintBoardProps) {
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [depsExpanded, setDepsExpanded] = useState(false);
  const isEditable = !isApproved;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const totalSp = plan.sprints.reduce((sum, s) => sum + s.velocitySp, 0);
  const sprintOptions = plan.sprints.map((s) => ({ id: s.id, number: s.number }));

  const handleDragStart = (event: DragStartEvent) => {
    const parsed = parseDragId(String(event.active.id));
    if (parsed?.type === 'story') {
      setActiveStoryId(parsed.value);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveStoryId(null);
    const { active, over } = event;
    if (!over) return;

    const activeParsed = parseDragId(String(active.id));
    const overParsed = parseDragId(String(over.id));
    if (activeParsed?.type !== 'story' || overParsed?.type !== 'sprint') return;

    const storyId = activeParsed.value;
    const fromSprintId = (active.data.current?.sprintId as string | null) ?? null;
    const toSprintId = overParsed.value === 'unassigned' ? null : overParsed.value;

    if (fromSprintId === toSprintId) return;
    onMoveStory(storyId, fromSprintId, toSprintId);
  };

  const handleAssignFromSelect = (storyId: string, toSprintId: string | null) => {
    let fromSprintId: string | null = null;
    if (plan.unassignedStoryIds.includes(storyId)) {
      fromSprintId = null;
    } else {
      const sprint = plan.sprints.find((s) => s.storyIds.includes(storyId));
      fromSprintId = sprint?.id ?? null;
    }
    if (fromSprintId === toSprintId) return;
    onMoveStory(storyId, fromSprintId, toSprintId);
  };

  const activeStory = activeStoryId ? stories.find((s) => s.id === activeStoryId) : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-6 animate-[fadeIn_0.3s_ease-out]">
        {plan.dependencies.length > 0 && (
          <div className="rounded-xl border border-border bg-surface">
            <button
              type="button"
              onClick={() => setDepsExpanded(!depsExpanded)}
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-left transition-colors hover:bg-surface-hover/40"
              aria-expanded={depsExpanded}
            >
              <div className="flex items-center gap-2">
                <svg className="h-3.5 w-3.5 text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
                <span className="text-[13px] font-medium text-foreground">
                  {plan.dependencies.length} dependencia{plan.dependencies.length !== 1 ? 's' : ''} entre historias
                </span>
              </div>
              <span className="text-[11px] text-subtle">{depsExpanded ? 'Ocultar' : 'Ver'}</span>
            </button>
            {depsExpanded && (
              <div className="flex flex-wrap gap-1.5 border-t border-border px-4 py-2.5">
                {plan.dependencies.map((dep) => (
                  <DependencyBadge
                    key={`${dep.storyId}-${dep.dependsOnStoryId}`}
                    storyId={dep.storyId}
                    dependencies={[dep]}
                    storyMap={Object.fromEntries(stories.map((s) => [s.id, s.title]))}
                    isDetailed
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {plan.sprints.map((sprint, idx) => {
            const completedSpBefore = plan.sprints.slice(0, idx).reduce((sum, item) => sum + item.velocitySp, 0);

            return (
              <SprintCard
                key={sprint.id}
                sprint={sprint}
                sprintIndex={idx}
                allSprints={plan.sprints}
                stories={stories}
                estimations={estimations}
                priorities={priorities}
                framework={framework}
                dependencies={plan.dependencies}
                epicMap={epicMap}
                colorClass={`border-l-4 ${SPRINT_COLORS[idx % SPRINT_COLORS.length]}`}
                sprintCapacitySp={plan.config.sprintCapacitySp}
                defaultDurationWeeks={plan.config.sprintDurationWeeks}
                totalProjectSp={totalSp}
                completedSpBefore={completedSpBefore}
                onGoalChange={(goal) => onGoalChange(sprint.id, goal)}
                onDatesChange={(patch) => onDatesChange(sprint.id, patch)}
                onAssignStory={handleAssignFromSelect}
                onDeleteSprint={onDeleteSprint ? () => onDeleteSprint(idx) : undefined}
                isEditable={isEditable}
              />
            );
          })}

          {isEditable && onAddSprint && (
            <button
              type="button"
              onClick={onAddSprint}
              className={[
                'flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border',
                'px-5 py-3.5 text-sm font-medium text-muted',
                'transition-colors hover:border-border-strong hover:bg-surface-hover/40 hover:text-foreground',
              ].join(' ')}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nuevo sprint
            </button>
          )}
        </div>

        <UnassignedStoriesPanel
          storyIds={plan.unassignedStoryIds}
          stories={stories}
          estimations={estimations}
          priorities={priorities}
          framework={framework}
          dependencies={plan.dependencies}
          epicMap={epicMap}
          isEditable={isEditable}
          sprintOptions={sprintOptions}
          onAssign={handleAssignFromSelect}
        />

      </div>

      <DragOverlay>
        {activeStory ? (
          <div className="rounded-lg border border-border-strong bg-surface px-4 py-2 shadow-sm">
            <span className="text-sm font-medium text-foreground">{activeStory.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
