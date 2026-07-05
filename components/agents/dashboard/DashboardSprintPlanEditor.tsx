'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Epic } from '@/lib/types/agent-2';
import type { StoryEstimation } from '@/lib/types/agent-3';
import type { PrioritizationFramework, StoryPrioritization } from '@/lib/types/agent-4';
import type { SprintDatePatch, SprintPlan } from '@/lib/types/agent-5';
import {
  addSprintToPlan,
  deleteEmptySprintAtIndex,
  hasDuplicateSprintIds,
  hasSprintLabelMismatches,
  moveStoryInPlan,
  normalizeSprintPlan,
  updateSprintDates,
  updateSprintGoal,
} from '@/lib/utils/sprint-plan-mutations';
import { SprintBoard } from '@/components/agents/agent-5/SprintBoard';
import { SprintTimeline } from '@/components/agents/agent-5/SprintTimeline';

interface DashboardSprintPlanEditorProps {
  plan: SprintPlan;
  epics: Epic[];
  estimations: Record<string, StoryEstimation>;
  priorities: Record<string, StoryPrioritization>;
  framework: PrioritizationFramework;
  onPlanChange: (plan: SprintPlan) => Promise<void>;
}

export function DashboardSprintPlanEditor({
  plan,
  epics,
  estimations,
  priorities,
  framework,
  onPlanChange,
}: DashboardSprintPlanEditorProps) {
  const safePlan = useMemo(() => normalizeSprintPlan(plan), [plan]);
  const repairAttempted = useRef(false);

  useEffect(() => {
    if (repairAttempted.current) return;
    if (!hasDuplicateSprintIds(plan) && !hasSprintLabelMismatches(plan)) return;
    repairAttempted.current = true;
    void onPlanChange(safePlan);
  }, [plan, safePlan, onPlanChange]);

  const allStories = useMemo(() => epics.flatMap((epic) => epic.userStories), [epics]);

  const epicMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const epic of epics) {
      for (const story of epic.userStories) {
        map[story.id] = epic.title;
      }
    }
    return map;
  }, [epics]);

  const persist = useCallback(
    async (nextPlan: SprintPlan) => {
      await onPlanChange(nextPlan);
    },
    [onPlanChange]
  );

  const handleGoalChange = useCallback(
    async (sprintId: string, goal: string) => {
      await persist(updateSprintGoal(safePlan, sprintId, goal));
    },
    [safePlan, persist]
  );

  const handleDatesChange = useCallback(
    async (sprintId: string, patch: SprintDatePatch) => {
      await persist(updateSprintDates(safePlan, sprintId, patch));
    },
    [safePlan, persist]
  );

  const handleMoveStory = useCallback(
    async (storyId: string, fromSprintId: string | null, toSprintId: string | null) => {
      const storyPoints = estimations[storyId]?.points ?? 0;
      await persist(moveStoryInPlan(safePlan, storyId, fromSprintId, toSprintId, storyPoints));
    },
    [safePlan, estimations, persist]
  );

  const handleAddSprint = useCallback(async () => {
    await persist(addSprintToPlan(safePlan));
  }, [safePlan, persist]);

  const handleDeleteSprint = useCallback(
    async (sprintIndex: number) => {
      const nextPlan = deleteEmptySprintAtIndex(safePlan, sprintIndex);
      if (!nextPlan) return;
      if (!window.confirm('¿Eliminar este sprint vacío?')) return;
      await persist(nextPlan);
    },
    [safePlan, persist]
  );

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-border bg-surface/80 p-6 shadow-sm">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-subtle">Plan de sprints</p>
        <h2 className="mt-2 text-xl font-bold text-foreground">Editar planificación</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Ajusta objetivos, fechas y asignaciones en cualquier momento. Los sprints posteriores se
          recalculan automáticamente para evitar solapamientos.
        </p>
      </div>

      <SprintBoard
        plan={safePlan}
        stories={allStories}
        estimations={estimations}
        priorities={priorities}
        framework={framework}
        epicMap={epicMap}
        isApproved={false}
        onGoalChange={(sprintId, goal) => void handleGoalChange(sprintId, goal)}
        onDatesChange={(sprintId, patch) => void handleDatesChange(sprintId, patch)}
        onMoveStory={(storyId, from, to) => void handleMoveStory(storyId, from, to)}
        onAddSprint={() => void handleAddSprint()}
        onDeleteSprint={(sprintIndex) => void handleDeleteSprint(sprintIndex)}
      />

      <SprintTimeline sprints={safePlan.sprints} />
    </section>
  );
}
