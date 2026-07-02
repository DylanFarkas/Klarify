/**
 * @fileoverview Página del Agente 4 — Priorización (MoSCoW).
 *
 * Orquesta el flujo completo del agente:
 *   1. Hidratar input desde pipeline + estado persistido en Firestore
 *   2. Priorización vía API (bajo demanda)
 *   3. Review HITL: ajustar categorías MoSCoW sugeridas
 *   4. Consolidar y continuar al Agente 5
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';
import type {
  Agent4State,
  Agent4Status,
  FrameworkCategory,
  PrioritizationFramework,
  StoryPrioritization,
} from '@/lib/types/agent-4';
import { EmptyAgent4State } from '@/components/agents/agent-4/EmptyAgent4State';
import { PrioritizationWorkspace } from '@/components/agents/agent-4/PrioritizationWorkspace';
import { getFrameworkLabels } from '@/lib/constants/agent-4';

const INITIAL_STATE: Agent4State = {
  input: null,
  priorities: {},
  framework: 'moscow',
  status: 'idle',
  error: null,
};

function resolveHydratedStatus(a4: Agent4State): Agent4Status {
  if (a4.status === 'approved') return 'approved';
  if (Object.keys(a4.priorities).length > 0) return 'review';
  return 'idle';
}

export default function Agent4Page() {
  const {
    workspace,
    isLoading,
    sessionVersion,
    saveAgent4,
    approveAgent4,
  } = useWorkspace();
  const [state, setState] = useState<Agent4State>(INITIAL_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // ── Hidratar desde el workspace (Firestore) ───────────────────
  useEffect(() => {
    if (isLoading || !workspace) return;

    const a4 = workspace.agent4;
    const pipelineInput = workspace.pipeline.agent4Input;
    const pipelinePriorities = workspace.pipeline.agent5Input?.priorities ?? {};

    const priorities =
      Object.keys(a4.priorities).length > 0 ? a4.priorities : pipelinePriorities;

    if (
      Object.keys(priorities).length > 0 ||
      a4.input ||
      a4.status === 'approved'
    ) {
      setState({
        input: a4.input ?? pipelineInput ?? null,
        priorities,
        framework: a4.framework ?? 'moscow',
        status: resolveHydratedStatus({ ...a4, priorities }),
        error: null,
      });
      setIsHydrated(true);
      return;
    }

    if (pipelineInput?.epics.length) {
      setState({
        input: pipelineInput,
        priorities: {},
        framework: 'moscow',
        status: 'idle',
        error: null,
      });
    }

    setIsHydrated(true);
  }, [isLoading, workspace, sessionVersion]);

  // ── Persistir en Firestore (debounced) ────────────────────────
  useEffect(() => {
    if (!isHydrated) return;
    if (state.input || Object.keys(state.priorities).length > 0) {
      saveAgent4({
        input: state.input,
        priorities: state.priorities,
        framework: state.framework,
        status: state.status,
        error: state.error,
      });
    }
  }, [
    state.input,
    state.priorities,
    state.framework,
    state.status,
    state.error,
    isHydrated,
    saveAgent4,
  ]);

  const handlePrioritiesChange = useCallback(
    (priorities: Record<string, StoryPrioritization>) => {
      setState((prev) => ({
        ...prev,
        priorities,
        status: 'review',
        error: null,
      }));
    },
    []
  );

  const handleFrameworkChange = useCallback((framework: PrioritizationFramework) => {
    setState((prev) => ({ ...prev, framework }));
  }, []);

  const handleStatusChange = useCallback((status: Agent4Status) => {
    setState((prev) => ({ ...prev, status, error: null }));
  }, []);

  const handleApprove = useCallback(async () => {
    if (!state.input) return;

    setIsApproving(true);
    try {
      await approveAgent4({
        epics: state.input.epics,
        estimations: state.input.estimations,
        priorities: state.priorities,
        framework: state.framework,
        sourceWishIds: state.input.sourceWishIds,
        approvedAt: Date.now(),
      });
      setState((prev) => ({ ...prev, status: 'approved' }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : 'Error al consolidar priorizaciones',
      }));
    } finally {
      setIsApproving(false);
    }
  }, [state.input, state.priorities, state.framework, approveAgent4]);

  const allStories = state.input?.epics.flatMap((e) => e.userStories) ?? [];
  const epicCount = state.input?.epics.length ?? 0;
  const storyCount = allStories.length;

  // Conteo por categoría del framework activo
  const categoryCounts = Object.values(state.priorities).reduce(
    (acc, pri) => {
      acc[pri.category] = (acc[pri.category] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const isApprovable =
    allStories.length > 0 &&
    allStories.every((s) => state.priorities[s.id]?.category);

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
            Paso 04 / 06
          </span>
          {isApproved && (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
              Consolidado
            </span>
          )}
        </div>
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Priorización del Backlog
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted">
          Con el backlog estimado del Agente 3, este paso ordenará épicas e historias
          según valor de negocio y esfuerzo usando la metodología MoSCoW. El equipo
          revisa y ajusta antes de consolidar.
        </p>
      </div>

      {state.error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      {hasInput && state.input ? (
        <>
          <PrioritizationWorkspace
            input={state.input}
            priorities={state.priorities}
            framework={state.framework}
            onPrioritiesChange={handlePrioritiesChange}
            onFrameworkChange={handleFrameworkChange}
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
                  <svg
                    className="h-5 w-5 text-success"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-success">
                    ¡Backlog priorizado exitosamente!
                  </p>
                  <p className="text-xs text-success/75">
                    {epicCount} épicas · {storyCount} historias priorizadas.
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {Object.entries(categoryCounts).map(([cat, count]) => (
                      <span
                        key={cat}
                        className="text-[10px] font-bold text-success/80"
                      >
                        {getFrameworkLabels(state.framework)[cat]}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center sm:ml-auto">
                <button
                  disabled
                  className="rounded-xl bg-muted px-5 py-2.5 text-sm font-bold text-muted-foreground opacity-50 cursor-not-allowed"
                >
                  Continuar al Agente 5 → (Próximamente)
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <EmptyAgent4State />
      )}
    </div>
  );
}
