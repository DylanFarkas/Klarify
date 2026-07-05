'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAgentActivity } from '@/hooks/useAgentActivity';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/lib/api-client';
import type { Agent5Input } from '@/lib/types/workspace';
import type { Agent5Status, SprintPlan, SprintPlanningConfig, Agent5PlanResponse, SprintDatePatch } from '@/lib/types/agent-5';
import { DEFAULT_SPRINT_CAPACITY_SP, DEFAULT_SPRINT_DURATION_WEEKS } from '@/lib/constants/agent-5';
import { ApproveButton } from '@/components/agents/shared/workflow/ApproveButton';
import { AgentActivityModal } from '@/components/agents/shared/activity-log/AgentActivityModal';
import { useWorkspaceSettings } from '@/context/WorkspaceSettingsContext';
import {
  addSprintToPlan,
  deleteEmptySprintAtIndex,
  moveStoryInPlan,
  updateSprintDates,
  updateSprintGoal,
} from '@/lib/utils/sprint-plan-mutations';
import { SprintPlanningConfigPanel } from './SprintPlanningConfigPanel';
import { SprintBoard } from './SprintBoard';
import { SprintTimeline } from './SprintTimeline';
import { EmptySprintPlanningStartState } from './EmptySprintPlanningStartState';

interface SprintPlanningWorkspaceProps {
  input: Agent5Input;
  plan: SprintPlan | null;
  status: Agent5Status;
  onStatusChange: (status: Agent5Status) => void;
  onPlanChange: (plan: SprintPlan) => void;
  onApprove: () => void;
  isApproved: boolean;
  isApproving: boolean;
  onError?: (message: string) => void;
}

export function SprintPlanningWorkspace({
  input,
  plan,
  status,
  onStatusChange,
  onPlanChange,
  onApprove,
  isApproved,
  isApproving,
  onError,
}: SprintPlanningWorkspaceProps) {
  const { user } = useAuth();
  const { entries, reset, consumeStream } = useAgentActivity();
  const { showModelReasoning } = useWorkspaceSettings();

  const [config, setConfig] = useState<SprintPlanningConfig>(() => {
    const today = new Date().toISOString().slice(0, 10);
    return plan?.config ?? {
      sprintCapacitySp: DEFAULT_SPRINT_CAPACITY_SP,
      sprintDurationWeeks: DEFAULT_SPRINT_DURATION_WEEKS,
      projectStartDate: today,
    };
  });

  const isPlanning = status === 'planning';
  const activityModalOpen = isPlanning && showModelReasoning;
  const hasPlan = plan !== null && plan.sprints.length > 0;

  const allStories = useMemo(
    () => input.epics.flatMap((e) => e.userStories),
    [input.epics]
  );
  const totalStories = allStories.length;
  const totalPoints = useMemo(
    () => allStories.reduce((sum, s) => sum + (input.estimations[s.id]?.points ?? 0), 0),
    [allStories, input.estimations]
  );

  const epicMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const epic of input.epics) {
      for (const story of epic.userStories) {
        map[story.id] = epic.title;
      }
    }
    return map;
  }, [input.epics]);

  const handleGenerate = useCallback(async () => {
    if (!input || !user) return;

    onStatusChange('planning');
    reset();

    try {
      const response = await authFetch('/api/agentes/5/plan', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epics: input.epics,
          estimations: input.estimations,
          priorities: input.priorities,
          framework: input.framework,
          config,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al obtener el plan de sprints');
      }

      const data = await consumeStream<Agent5PlanResponse>(response);
      onPlanChange(data.plan);
      onStatusChange('review');
    } catch (error) {
      console.error('Error en la conexión con el Agente 5:', error);
      onStatusChange('idle');
      const message = error instanceof Error ? error.message : 'Error al procesar la planificación.';
      onError?.(message);
    }
  }, [input, user, config, consumeStream, reset, onPlanChange, onStatusChange, onError]);

  const handleGoalChange = useCallback(
    (sprintId: string, goal: string) => {
      if (!plan) return;
      onPlanChange(updateSprintGoal(plan, sprintId, goal));
    },
    [plan, onPlanChange]
  );

  const handleSprintDatesChange = useCallback(
    (sprintId: string, patch: SprintDatePatch) => {
      if (!plan) return;
      onPlanChange(updateSprintDates(plan, sprintId, patch));
    },
    [plan, onPlanChange]
  );

  const handleMoveStory = useCallback(
    (storyId: string, fromSprintId: string | null, toSprintId: string | null) => {
      if (!plan) return;
      const storyPoints = input.estimations[storyId]?.points ?? 0;
      onPlanChange(moveStoryInPlan(plan, storyId, fromSprintId, toSprintId, storyPoints));
    },
    [plan, input.estimations, onPlanChange]
  );

  const handleAddSprint = useCallback(() => {
    if (!plan) return;
    onPlanChange(addSprintToPlan(plan));
  }, [plan, onPlanChange]);

  const handleDeleteSprint = useCallback(
    (sprintIndex: number) => {
      if (!plan) return;
      const nextPlan = deleteEmptySprintAtIndex(plan, sprintIndex);
      if (!nextPlan) return;
      if (!window.confirm('¿Eliminar este sprint vacío?')) return;
      onPlanChange(nextPlan);
    },
    [plan, onPlanChange]
  );

  const isApprovable = hasPlan && plan.sprints.every((s) => s.sprintGoal.trim().length > 0);

  if (input.epics.length === 0) return null;

  return (
    <div className="flex flex-col gap-8 animate-[fadeIn_0.3s_ease-out]">
      {showModelReasoning && (
        <AgentActivityModal
          open={activityModalOpen}
          isActive={isPlanning}
          title={hasPlan ? 'Regenerando plan de sprints...' : 'Planificando sprints...'}
          description={
            hasPlan
              ? 'El Scrum Master IA reorganiza las historias en sprints según la nueva configuración.'
              : 'El Scrum Master IA analiza el backlog priorizado y organiza las historias en sprints con objetivos claros.'
          }
          meta={
            input
              ? `${input.epics.length} épica${input.epics.length !== 1 ? 's' : ''} · ${totalStories} historias`
              : undefined
          }
          entries={entries}
        />
      )}

      <SprintPlanningConfigPanel
        config={config}
        onChange={setConfig}
        disabled={isPlanning || isApproving}
        isApproved={isApproved}
        hasPlan={hasPlan}
        onRegenerate={handleGenerate}
        isRegenerating={isPlanning}
      />

      {!hasPlan && !isPlanning && !isApproved && (
        <EmptySprintPlanningStartState
          onGenerate={handleGenerate}
          isPlanning={isPlanning}
          epicCount={input.epics.length}
          storyCount={totalStories}
          totalPoints={totalPoints}
          capacity={config.sprintCapacitySp}
          durationWeeks={config.sprintDurationWeeks}
          startDate={config.projectStartDate}
        />
      )}

      {isPlanning && !showModelReasoning && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface-muted/60 px-6 py-14 animate-[fadeIn_0.25s_ease-out]">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-[3px] border-border border-t-primary" />
          <p className="text-sm font-semibold text-foreground">
            {hasPlan ? 'Regenerando plan de sprints...' : 'Planificando sprints...'}
          </p>
          <p className="mt-1.5 text-xs text-muted">
            El Scrum Master IA está distribuyendo {totalStories} historia{totalStories !== 1 ? 's' : ''} en sprints de {config.sprintCapacitySp} SP.
          </p>
        </div>
      )}

      {hasPlan && plan && !isPlanning && (
        <>
          <SprintBoard
            plan={plan}
            stories={allStories}
            estimations={input.estimations}
            priorities={input.priorities}
            framework={input.framework}
            epicMap={epicMap}
            isApproved={isApproved}
            onGoalChange={handleGoalChange}
            onDatesChange={handleSprintDatesChange}
            onMoveStory={handleMoveStory}
            onAddSprint={!isApproved ? handleAddSprint : undefined}
            onDeleteSprint={!isApproved ? handleDeleteSprint : undefined}
          />

          <SprintTimeline sprints={plan.sprints} />
        </>
      )}

      {hasPlan && !isApproved && plan && !isPlanning && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface-muted/80 px-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Revisar y aprobar plan de sprints
            </h3>
            <p className="mt-0.5 text-xs text-muted">
              Edita objetivos y fechas desde cada sprint. Arrastra historias entre sprints para reorganizar.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <ApproveButton
              onClick={onApprove}
              disabled={!isApprovable || isApproving || isPlanning}
              label={isApproving ? 'Consolidando...' : 'Consolidar Plan de Sprints'}
            />
          </div>
        </div>
      )}
    </div>
  );
}
