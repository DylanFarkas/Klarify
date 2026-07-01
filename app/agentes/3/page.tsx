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
import type { Agent3Input } from '@/lib/types/workspace';
import type { Agent3State, Agent3Status, StoryEstimation } from '@/lib/types/agent-3';
import { EmptyPrioritizationState } from '@/components/agents/agent-3/EmptyPrioritizationState';
import { EstimationWorkspace } from '@/components/agents/agent-3/EstimationWorkspace';

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
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error al consolidar estimaciones',
      }));
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
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  const hasInput = state.input !== null && state.input.epics.length > 0;
  const isApproved = state.status === 'approved';

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
      <div className="mb-2">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
            Paso 03 / 06
          </span>
          {isApproved && (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
              Consolidado
            </span>
          )}
        </div>
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Estimación en Story Points
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted">
          Como Scrum Master, el agente sugiere una estimación en Story Points para
          cada historia de usuario del backlog aprobado, basándose en su complejidad
          técnica. El equipo revisa y ajusta antes de consolidar.
        </p>
      </div>

      {state.error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
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
            <div className="flex flex-col gap-4 rounded-2xl border border-success/30 bg-success/10 px-6 py-5 animate-[fadeIn_0.3s_ease-out] sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-success/30 bg-success/20">
                  <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-success">
                    ¡Backlog estimado exitosamente!
                  </p>
                  <p className="text-xs text-success/75">
                    {epicCount} épicas · {storyCount} historias · {totalPoints} Story Points listos.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center sm:ml-auto">
                <button
                  onClick={() => router.push('/agentes/4')}
                  className="rounded-xl bg-success px-5 py-2.5 text-sm font-bold text-black shadow-[0_4px_16px_color-mix(in_srgb,var(--success)_35%,transparent)] transition-all hover:opacity-90 cursor-pointer"
                >
                  Continuar al Agente 4 →
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <EmptyPrioritizationState />
      )}
    </div>
  );
}
