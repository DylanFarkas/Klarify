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
import type { Agent3State, Agent3Status, StoryEstimation } from '@/lib/types/agent-3';
import { EmptyPrioritizationState } from '@/components/agents/agent-3/EmptyPrioritizationState';
import { EstimationWorkspace } from '@/components/agents/agent-3/EstimationWorkspace';
import { AgentPageHero, AgentStat } from '@/components/agents/shared/layout/AgentPageHero';
import { AgentErrorBanner } from '@/components/agents/shared/AgentErrorBanner';
import { AgentCelebrationBanner } from '@/components/agents/shared/AgentCelebrationBanner';
import { errorMessage, notifyError, notifySuccess } from '@/lib/notifications/toast';

const INITIAL_STATE: Agent3State = {
  input: null,
  estimations: {},
  status: 'idle',
  error: null,
};

function resolveHydratedStatus(a3: Agent3State): Agent3Status {
  if (a3.status === 'approved') return 'approved';
  if (Object.keys(a3.estimations).length > 0) return 'review';
  return 'idle';
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
    const pipelineInput = workspace.pipeline.agent3Input;
    const pipelineEstimations = workspace.pipeline.agent4Input?.estimations ?? {};

    const estimations =
      Object.keys(a3.estimations).length > 0 ? a3.estimations : pipelineEstimations;

    if (Object.keys(estimations).length > 0 || a3.input || a3.status === 'approved') {
      setState({
        input: a3.input ?? pipelineInput ?? null,
        estimations,
        status: resolveHydratedStatus({ ...a3, estimations }),
        error: null,
      });
      setIsHydrated(true);
      return;
    }

    if (pipelineInput && pipelineInput.epics.length > 0) {
      setState({
        input: pipelineInput,
        estimations: {},
        status: 'idle',
        error: null,
      });
    }

    setIsHydrated(true);
  }, [isLoading, workspace, sessionVersion]);

  // ── Persistir en Firestore (debounced) ────────────────────────
  useEffect(() => {
    if (!isHydrated) return;
    if (state.input || Object.keys(state.estimations).length > 0) {
      saveAgent3({
        input: state.input,
        estimations: state.estimations,
        status: state.status,
        error: state.error,
      });
    }
  }, [state.input, state.estimations, state.status, state.error, isHydrated, saveAgent3]);

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
  }, [state.input, state.estimations, approveAgent3]);

  const allStories = state.input?.epics.flatMap((e) => e.userStories) ?? [];
  const epicCount = state.input?.epics.length ?? 0;
  const storyCount = allStories.length;
  const totalPoints = allStories.reduce(
    (sum, s) => sum + (state.estimations[s.id]?.points ?? 0),
    0
  );
  const isApprovable =
    allStories.length > 0 &&
    allStories.every((s) => (state.estimations[s.id]?.points ?? 0) > 0);

  if (isLoading || !isHydrated) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  const hasInput = state.input !== null && state.input.epics.length > 0;
  const isApproved = state.status === 'approved';
  const showReviewStats = hasInput && Object.keys(state.estimations).length > 0;

  return (
    <div
      className={[
        'mx-auto flex w-full flex-col gap-7',
        showReviewStats || hasInput ? 'max-w-5xl' : 'max-w-3xl',
      ].join(' ')}
    >
      <AgentPageHero
        step={3}
        variant="measure"
        title="Estimación en Story Points"
        description="El agente sugiere Story Points para cada historia según su complejidad técnica. Tu equipo revisa y ajusta antes de consolidar."
        statusBadge={
          isApproved ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Aprobado
            </span>
          ) : undefined
        }
        stats={
          showReviewStats ? (
            <>
              <AgentStat
                icon={
                  <svg className="h-4 w-4 text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                  </svg>
                }
                value={epicCount}
                label={`épica${epicCount !== 1 ? 's' : ''}`}
              />
              <AgentStat
                icon={
                  <svg className="h-4 w-4 text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                  </svg>
                }
                value={storyCount}
                label={`historia${storyCount !== 1 ? 's' : ''} de usuario`}
              />
              <AgentStat
                icon={
                  <svg className="h-4 w-4 text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                value={totalPoints}
                label="Story Points"
              />
            </>
          ) : undefined
        }
      />

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
              description={`${epicCount} épica${epicCount !== 1 ? 's' : ''} · ${storyCount} historia${storyCount !== 1 ? 's' : ''} · ${totalPoints} Story Points listos para el Agente 4.`}
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
