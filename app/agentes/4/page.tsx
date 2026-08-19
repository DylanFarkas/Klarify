/**
 * @fileoverview Página del Agente 4 — Priorización (MoSCoW).
 *
 * Orquesta el flujo completo del agente:
 *   1. Hidratar input desde pipeline + estado persistido en Firestore
 *   2. Priorización vía API (bajo demanda)
 *   3. Review HITL: ajustar categorías MoSCoW sugeridas
 *   4. Consolidar y continuar al dashboard (planificación manual de sprints)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useWorkspace } from '@/hooks/useWorkspace';
import type {
  Agent4State,
  Agent4Status,
  PrioritizationFramework,
  StoryPrioritization,
} from '@/lib/types/agent-4';
import { EmptyAgent4State } from '@/components/agents/agent-4/EmptyAgent4State';
import { PrioritizationWorkspace } from '@/components/agents/agent-4/PrioritizationWorkspace';
import { AgentPageHero, AgentStat } from '@/components/agents/shared/layout/AgentPageHero';
import { AgentErrorBanner } from '@/components/agents/shared/AgentErrorBanner';
import { AgentCelebrationBanner } from '@/components/agents/shared/AgentCelebrationBanner';
import { getFrameworkLabels } from '@/lib/constants/agent-4';
import type { Agent4Input, UserWorkspace } from '@/lib/types/workspace';
import { errorMessage, notifyError, notifySuccess } from '@/lib/notifications/toast';
import { formatEffortTotal, getEffortValue } from '@/lib/utils/estimation';

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

/** Resuelve el input del Agente 4 desde pipeline, estado persistido o Agente 3 aprobado. */
function resolveAgent4Input(workspace: UserWorkspace): Agent4Input | null {
  const { agent3, agent4, pipeline } = workspace;

  if (agent4.input?.epics.length) return agent4.input;
  if (pipeline.agent4Input?.epics.length) return pipeline.agent4Input;

  if (
    agent3.status === 'approved' &&
    agent3.input?.epics.length &&
    Object.keys(agent3.estimations).length > 0
  ) {
    return {
      epics: agent3.input.epics,
      estimations: agent3.estimations,
      estimationMode: agent3.estimationMode ?? 'story_points',
      sourceWishIds: agent3.input.sourceWishIds,
      approvedAt: agent3.input.approvedAt,
    };
  }

  return null;
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
    const resolvedInput = resolveAgent4Input(workspace);
    const pipelinePriorities = workspace.pipeline.agent5Input?.priorities ?? {};

    const priorities =
      Object.keys(a4.priorities).length > 0 ? a4.priorities : pipelinePriorities;

    if (
      Object.keys(priorities).length > 0 ||
      resolvedInput ||
      a4.status === 'approved'
    ) {
      setState({
        input: resolvedInput,
        priorities,
        framework: a4.framework ?? 'moscow',
        status: resolveHydratedStatus({
          ...a4,
          priorities,
          input: resolvedInput,
        }),
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
        estimationMode: state.input.estimationMode ?? 'story_points',
        priorities: state.priorities,
        framework: state.framework,
        sourceWishIds: state.input.sourceWishIds,
        approvedAt: Date.now(),
      });
      setState((prev) => ({ ...prev, status: 'approved' }));
      notifySuccess({
        title: 'Priorización consolidada',
        description: 'Listo para organizar sprints en el dashboard.',
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Error al consolidar priorizaciones';
      setState((prev) => ({
        ...prev,
        error: message,
      }));
      notifyError(errorMessage(error, 'Error al consolidar priorizaciones'));
    } finally {
      setIsApproving(false);
    }
  }, [state.input, state.priorities, state.framework, approveAgent4]);

  const allStories = state.input?.epics.flatMap((e) => e.userStories) ?? [];
  const epicCount = state.input?.epics.length ?? 0;
  const storyCount = allStories.length;

  const estimationMode = state.input?.estimationMode ?? 'story_points';
  const totalEffort = allStories.reduce(
    (sum, s) => sum + getEffortValue(state.input?.estimations[s.id], estimationMode),
    0
  );

  const hasPriorities = Object.keys(state.priorities).length > 0;

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
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  const hasInput = state.input !== null && state.input.epics.length > 0;
  const isApproved = state.status === 'approved';

  return (
    <div
      className={[
        'mx-auto flex w-full flex-col gap-7',
        hasInput ? 'max-w-5xl' : 'max-w-3xl',
      ].join(' ')}
    >
      <AgentPageHero
        step={4}
        variant="order"
        title="Priorización del Backlog"
        description="Ordena épicas e historias según valor de negocio y esfuerzo. Tu equipo revisa y ajusta antes de consolidar."
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
          hasInput ? (
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
                value={formatEffortTotal(totalEffort, estimationMode)}
                label={estimationMode === 'time' ? 'Tiempo total' : 'Story Points'}
              />
              {hasPriorities ? (
                <AgentStat
                  icon={
                    <svg className="h-4 w-4 text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                    </svg>
                  }
                  value={Object.keys(state.priorities).length}
                  label={`priorizada${Object.keys(state.priorities).length !== 1 ? 's' : ''}`}
                />
              ) : null}
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
            onError={(message) => setState((prev) => ({ ...prev, error: message }))}
          />

          {isApproved && (
            <AgentCelebrationBanner
              title="Backlog priorizado"
              description={`${epicCount} épica${epicCount !== 1 ? 's' : ''} · ${storyCount} historia${storyCount !== 1 ? 's' : ''} priorizada${storyCount !== 1 ? 's' : ''}.`}
              extra={
                Object.keys(categoryCounts).length > 0 ? (
                  <p className="mt-1.5 text-[12px] text-subtle">
                    {Object.entries(categoryCounts)
                      .map(([cat, count]) => `${count} ${getFrameworkLabels(state.framework)[cat]}`)
                      .join(' · ')}
                  </p>
                ) : null
              }
              action={
                <Link
                  href="/agentes/dashboard"
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 sm:w-auto"
                >
                  Ir al dashboard
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              }
            />
          )}
        </>
      ) : (
        <EmptyAgent4State />
      )}
    </div>
  );
}
