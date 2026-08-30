/**
 * @fileoverview Página del Agente 3 — Estimación en Story Points.
 *
 * Orquesta el flujo completo del agente:
 *   1. Hidratar input desde pipeline + estado persistido en Firestore
 *   2. Estimación vía API (bajo demanda)
 *   3. Review HITL: ajustar Story Points sugeridos
 *   4. Consolidar y continuar al Agente 4
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/hooks/useWorkspace';
import type { Agent3State, Agent3Status, EstimationMode, StoryEstimation } from '@/lib/types/agent-3';
import type { Agent3Input, UserWorkspace } from '@/lib/types/workspace';
import { EmptyPrioritizationState } from '@/components/agents/agent-3/EmptyPrioritizationState';
import { EstimationWorkspace } from '@/components/agents/agent-3/EstimationWorkspace';
import { AgentErrorBanner } from '@/components/agents/shared/AgentErrorBanner';
import { AgentCelebrationBanner } from '@/components/agents/shared/AgentCelebrationBanner';
import { errorMessage, notifyError, notifySuccess } from '@/lib/notifications/toast';
import { formatEffortTotal, isEstimationMode, isStoryEstimated } from '@/lib/utils/estimation';

const INITIAL_STATE: Agent3State = {
  input: null,
  estimations: {},
  estimationMode: null,
  status: 'idle',
  error: null,
};

function resolveHydratedStatus(a3: Agent3State): Agent3Status {
  if (a3.status === 'approved') return 'approved';
  if (Object.keys(a3.estimations).length > 0) return 'review';
  return 'idle';
}

/** Resuelve el input del Agente 3 desde pipeline, estado persistido o Agente 2 aprobado. */
function resolveAgent3Input(workspace: UserWorkspace): Agent3Input | null {
  const { agent1, agent2, agent3, pipeline } = workspace;

  if (agent3.input?.epics.length) return agent3.input;
  if (pipeline.agent3Input?.epics.length) return pipeline.agent3Input;

  if (agent2.status === 'approved' && agent2.epics.length > 0) {
    return {
      epics: agent2.epics,
      sourceWishIds:
        pipeline.agent3Input?.sourceWishIds ??
        agent2.input?.wishes.map((wish) => wish.id) ??
        agent1.wishes.map((wish) => wish.id),
      approvedAt:
        pipeline.agent3Input?.approvedAt ??
        agent3.input?.approvedAt ??
        Date.now(),
    };
  }

  return null;
}

export default function Agent3Page() {
  const router = useRouter();
  const { workspace, isLoading, sessionVersion, saveAgent3, approveAgent3 } = useWorkspace();
  const [state, setState] = useState<Agent3State>(INITIAL_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // ── Hidratar desde el workspace (Firestore) ───────────────────
  useEffect(() => {
    if (isLoading || !workspace) return;

    const a3 = workspace.agent3;
    const resolvedInput = resolveAgent3Input(workspace);
    const pipelineEstimations = workspace.pipeline.agent4Input?.estimations ?? {};
    const pipelineMode = workspace.pipeline.agent4Input?.estimationMode;
    const estimationMode: EstimationMode | null = isEstimationMode(a3.estimationMode)
      ? a3.estimationMode
      : isEstimationMode(pipelineMode)
        ? pipelineMode
        : Object.keys(a3.estimations).length > 0 || Object.keys(pipelineEstimations).length > 0
          ? 'story_points'
          : null;

    const estimations =
      Object.keys(a3.estimations).length > 0 ? a3.estimations : pipelineEstimations;

    if (Object.keys(estimations).length > 0 || resolvedInput || a3.status === 'approved') {
      setState({
        input: resolvedInput,
        estimations,
        estimationMode,
        status: resolveHydratedStatus({ ...a3, estimations }),
        error: null,
      });
      setIsHydrated(true);
      return;
    }

    setIsHydrated(true);
  }, [isLoading, workspace, sessionVersion]);

  // ── Persistir en Firestore (debounced) ────────────────────────
  useEffect(() => {
    if (!isHydrated) return;
    if (state.input || Object.keys(state.estimations).length > 0 || state.estimationMode) {
      saveAgent3({
        input: state.input,
        estimations: state.estimations,
        estimationMode: state.estimationMode ?? null,
        status: state.status,
        error: state.error,
      });
    }
  }, [state.input, state.estimations, state.estimationMode, state.status, state.error, isHydrated, saveAgent3]);

  const handleEstimationsChange = useCallback(
    (estimations: Record<string, StoryEstimation>) => {
      setState((prev) => ({
        ...prev,
        estimations,
        status: 'review',
        error: null,
      }));
    },
    []
  );

  const handleEstimationModeChange = useCallback((mode: EstimationMode) => {
    setState((prev) => ({
      ...prev,
      estimationMode: mode,
      error: null,
    }));
  }, []);

  const handleStatusChange = useCallback((status: Agent3Status) => {
    setState((prev) => ({ ...prev, status, error: null }));
  }, []);

  const handleApprove = useCallback(async () => {
    if (!state.input) return;

    setIsApproving(true);
    try {
      await approveAgent3({
        epics: state.input.epics,
        estimations: state.estimations,
        estimationMode: state.estimationMode ?? 'story_points',
        sourceWishIds: state.input.sourceWishIds,
        approvedAt: Date.now(),
      });
      setState((prev) => ({ ...prev, status: 'approved' }));
      notifySuccess({
        title: 'Estimaciones consolidadas',
        description: 'Listo para priorizar en el Agente 4.',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al consolidar estimaciones';
      setState((prev) => ({
        ...prev,
        error: message,
      }));
      notifyError(errorMessage(error, 'Error al consolidar estimaciones'));
    } finally {
      setIsApproving(false);
    }
  }, [state.input, state.estimations, state.estimationMode, approveAgent3]);

  const allStories = state.input?.epics.flatMap((e) => e.userStories) ?? [];
  const epicCount = state.input?.epics.length ?? 0;
  const storyCount = allStories.length;
  const activeMode: EstimationMode = state.estimationMode ?? 'story_points';
  const totalEffort = allStories.reduce((sum, s) => {
    const est = state.estimations[s.id];
    if (activeMode === 'time') return sum + (est?.durationMinutes ?? 0);
    return sum + (est?.points ?? 0);
  }, 0);
  const isApprovable =
    allStories.length > 0 &&
    Boolean(state.estimationMode) &&
    allStories.every((s) => isStoryEstimated(state.estimations[s.id], activeMode));

  if (isLoading || !isHydrated) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  const hasInput = state.input !== null && state.input.epics.length > 0;
  const isApproved = state.status === 'approved';
  const showReviewStats = hasInput && Object.keys(state.estimations).length > 0;
  const headerSubtitle =
    showReviewStats
      ? null
      : 'Elige el modo y sugiere estimaciones para cada historia.';

  return (
    <div
      className={[
        'mx-auto flex w-full animate-[fadeIn_0.3s_ease-out] flex-col px-6 pt-3 pb-5',
        showReviewStats ? 'max-w-5xl gap-5' : 'max-w-3xl gap-5',
      ].join(' ')}
    >
      <header className="shrink-0 pb-3">
        <h1 className="text-[50px] font-semibold tracking-tight text-foreground">
          {activeMode === 'time' ? 'Estimación en tiempo' : 'Estimación en Story Points'}
        </h1>
        <p className="mt-1 text-[12px] text-muted">
          Paso 3/6 · Medición
          {headerSubtitle ? <> · {headerSubtitle}</> : null}
        </p>
        {showReviewStats ? (
          <p className="mt-1 text-[12px] text-muted">
            <span className="tabular-nums text-foreground">{epicCount}</span>
            {' '}
            {epicCount === 1 ? 'épica' : 'épicas'}
            {' · '}
            <span className="tabular-nums text-foreground">{storyCount}</span>
            {' '}
            {storyCount === 1 ? 'historia' : 'historias'}
            {' · '}
            <span className="tabular-nums text-foreground">
              {formatEffortTotal(totalEffort, activeMode)}
            </span>
            {' '}
            {activeMode === 'time' ? 'tiempo total' : 'Story Points'}
            {isApproved ? (
              <>
                {' · '}
                <span className="text-success">Aprobado</span>
              </>
            ) : null}
          </p>
        ) : null}
      </header>

      {state.error && (
        <AgentErrorBanner
          message={state.error}
          onDismiss={() => setState((prev) => ({ ...prev, error: null }))}
        />
      )}

      {hasInput && state.input ? (
        <>
          <EstimationWorkspace
            input={state.input}
            estimations={state.estimations}
            onEstimationsChange={handleEstimationsChange}
            estimationMode={state.estimationMode ?? null}
            onEstimationModeChange={handleEstimationModeChange}
            status={state.status}
            onStatusChange={handleStatusChange}
            onApprove={handleApprove}
            isApprovable={isApprovable}
            isApproved={isApproved}
            isApproving={isApproving}
          />

          {isApproved && (
            <AgentCelebrationBanner
              title="Backlog estimado"
              description={`${epicCount} épica${epicCount !== 1 ? 's' : ''} · ${storyCount} historia${storyCount !== 1 ? 's' : ''} · ${formatEffortTotal(totalEffort, activeMode)} listos para el Agente 4.`}
              action={
                <button
                  type="button"
                  onClick={() => router.push('/agentes/4')}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 sm:w-auto"
                >
                  Continuar al Agente 4
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              }
            />
          )}
        </>
      ) : (
        <EmptyPrioritizationState />
      )}
    </div>
  );
}
