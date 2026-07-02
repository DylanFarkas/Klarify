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

  // ── Loading state ──────────────────────────────────────
  if (isLoading || !isHydrated) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <div className="animate-[fadeIn_0.3s_ease-out]">
          <div className="mb-5 h-7 w-28 rounded-full bg-surface-hover animate-[shimmerPulse_2s_ease-in-out_infinite]" />
          <div className="mb-4 h-11 w-72 rounded-xl bg-surface-hover animate-[shimmerPulse_2s_ease-in-out_infinite] md:h-12" />
          <div className="mb-2 h-5 w-96 rounded-lg bg-surface-hover animate-[shimmerPulse_2s_ease-in-out_infinite]" />
          <div className="mb-8 h-5 w-64 rounded-lg bg-surface-hover animate-[shimmerPulse_2s_ease-in-out_infinite]" />
        </div>
      </div>
    );
  }

  const hasInput = state.input !== null && state.input.epics.length > 0;
  const isApproved = state.status === 'approved';

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
      {/* ═══════════════════════════════════════════════════════════
          HERO HEADER
         ═══════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-muted/60 p-8 animate-[fadeIn_0.4s_ease-out]">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/5 blur-3xl animate-[heroGlow_8s_ease-in-out_infinite]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-primary/3 blur-3xl animate-[heroGlow_10s_ease-in-out_infinite_2s]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute right-1/3 top-0 h-px w-32 bg-linear-to-r from-transparent via-primary/20 to-transparent"
          aria-hidden="true"
        />

        <div className="relative z-10">
          <div className="mb-5 flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
              <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Paso 03 · 06
            </span>
            {isApproved && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-success">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Consolidado
              </span>
            )}
          </div>

          <h1 className="mb-4 bg-linear-to-r from-foreground via-primary to-foreground bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-4xl">
            Estimación en Story Points
          </h1>

          <p className="max-w-2xl text-lg leading-relaxed text-muted">
            Como Scrum Master, el agente sugiere una estimación en Story Points para
            cada historia de usuario del backlog aprobado, basándose en su complejidad
            técnica. El equipo revisa y ajusta antes de consolidar.
          </p>

          {/* Stats en el header (solo si hay estimaciones) */}
          {hasInput && Object.keys(state.estimations).length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-5 animate-[fadeIn_0.5s_ease-out_0.2s_both]">
              <span className="flex items-center gap-1.5 text-sm text-subtle">
                <svg className="h-4 w-4 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
                <span className="font-medium text-foreground">{epicCount}</span>
                <span>épica{epicCount !== 1 ? 's' : ''}</span>
              </span>
              <span className="flex items-center gap-1.5 text-sm text-subtle">
                <svg className="h-4 w-4 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                </svg>
                <span className="font-medium text-foreground">{storyCount}</span>
                <span>historia{storyCount !== 1 ? 's' : ''} de usuario</span>
              </span>
              <span className="flex items-center gap-1.5 text-sm text-subtle">
                <svg className="h-4 w-4 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium text-foreground">{totalPoints}</span>
                <span>Story Points</span>
              </span>
              {isApproved && (
                <span className="flex items-center gap-1.5 text-sm text-success">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Consolidado</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          ERROR
         ═══════════════════════════════════════════════════════════ */}
      {state.error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-5 py-4 animate-[scaleIn_0.25s_ease-out]">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/15">
            <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div className="flex-1 pt-0.5">
            <p className="text-sm font-medium text-danger">{state.error}</p>
          </div>
          <button
            onClick={() => setState((prev) => ({ ...prev, error: null }))}
            className="shrink-0 rounded-lg p-1 text-muted hover:bg-surface-hover hover:text-foreground transition-colors cursor-pointer"
            aria-label="Cerrar mensaje de error"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          CONTENIDO PRINCIPAL
         ═══════════════════════════════════════════════════════════ */}
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

          {/* ═════════════════════════════════════════════════════
              ESTADO APROBADO — Celebración
             ═════════════════════════════════════════════════════ */}
          {isApproved && (
            <div className="relative overflow-hidden rounded-2xl border border-success/25 bg-linear-to-br from-success/[0.07] via-success/3 to-transparent px-6 py-6 animate-[scaleIn_0.35s_ease-out]">
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-success/10 blur-3xl animate-[heroGlow_6s_ease-in-out_infinite]"
                aria-hidden="true"
              />

              <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-success/30 bg-success/15 animate-[celebrationPop_0.5s_ease-out]">
                    <svg className="h-7 w-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-bold text-success">
                      ¡Backlog estimado exitosamente!
                    </p>
                    <p className="mt-0.5 text-sm text-success/70">
                      {epicCount} épica{epicCount !== 1 ? 's' : ''} · {storyCount} historia{storyCount !== 1 ? 's' : ''} · {totalPoints} Story Points listos para el Agente 4.
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center sm:ml-auto">
                  <button
                    onClick={() => router.push('/agentes/4')}
                    className={[
                      'inline-flex w-full items-center justify-center gap-2 rounded-xl sm:w-auto',
                      'bg-success px-6 py-3 text-sm font-bold text-black',
                      'shadow-[0_4px_20px_color-mix(in_srgb,var(--success)_35%,transparent)]',
                      'transition-all duration-200 hover:shadow-[0_6px_28px_color-mix(in_srgb,var(--success)_45%,transparent)] hover:opacity-90',
                      'cursor-pointer',
                    ].join(' ')}
                  >
                    Continuar al Agente 4
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                </div>
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
