/**
 * @fileoverview Página del Agente 5 — Planificación de Sprints.
 *
 * Orquesta el flujo completo del agente:
 *   1. Hidratar input desde pipeline + estado persistido en Firestore
 *   2. Planificación vía API (bajo demanda)
 *   3. Review HITL: ajustar Sprint Goals, reasignar historias
 *   4. Consolidar y continuar al Agente 6 (o finalizar)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useWorkspace } from '@/hooks/useWorkspace';
import type { Agent5State, Agent5Status, SprintPlan } from '@/lib/types/agent-5';
import { EmptyAgent5State } from '@/components/agents/agent-5/EmptyAgent5State';
import { SprintPlanningWorkspace } from '@/components/agents/agent-5/SprintPlanningWorkspace';
import { AgentPageHero, AgentStat } from '@/components/agents/shared/layout/AgentPageHero';
import { AgentErrorBanner } from '@/components/agents/shared/AgentErrorBanner';
import { AgentCelebrationBanner } from '@/components/agents/shared/AgentCelebrationBanner';
import type { Agent5Input, UserWorkspace } from '@/lib/types/workspace';
import { errorMessage, notifyError, notifySuccess } from '@/lib/notifications/toast';

const INITIAL_STATE: Agent5State = {
  input: null,
  plan: null,
  status: 'idle',
  error: null,
};

function resolveHydratedStatus(a5: Agent5State, workspace: UserWorkspace): Agent5Status {
  // Solo consolidado si existe agent6Input (approveAgent5); evita estado obsoleto.
  if (a5.status === 'approved' && workspace.pipeline.agent6Input) {
    return 'approved';
  }
  if (a5.plan?.sprints.length) return 'review';
  return 'idle';
}

function resolveAgent5Input(workspace: UserWorkspace): Agent5Input | null {
  const { agent4, agent5, pipeline } = workspace;

  if (agent5.input?.epics?.length) return agent5.input;
  if (pipeline.agent5Input?.epics?.length) return pipeline.agent5Input;

  if (
    agent4.status === 'approved' &&
    agent4.input?.epics?.length &&
    Object.keys(agent4.priorities).length > 0
  ) {
    return {
      epics: agent4.input.epics,
      estimations: agent4.input.estimations,
      priorities: agent4.priorities,
      framework: agent4.framework,
      sourceWishIds: agent4.input.sourceWishIds,
      approvedAt: agent4.input.approvedAt,
    };
  }

  return null;
}

export default function Agent5Page() {
  const {
    workspace,
    isLoading,
    sessionVersion,
    plan,
    saveAgent5,
    approveAgent5,
  } = useWorkspace();
  const [state, setState] = useState<Agent5State>(INITIAL_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    if (isLoading || !workspace) return;

    const a5 = workspace.agent5;
    const resolvedInput = resolveAgent5Input(workspace);

    const plan = a5.plan ?? null;

    if (plan || resolvedInput || a5.status === 'approved') {
      setState({
        input: resolvedInput,
        plan,
        status: resolveHydratedStatus({ ...a5, plan, input: resolvedInput }, workspace),
        error: null,
      });
      setIsHydrated(true);
      return;
    }

    setIsHydrated(true);
  }, [isLoading, workspace, sessionVersion]);

  useEffect(() => {
    if (!isHydrated) return;
    // "approved" solo se persiste vía approveAgent5, no por autosave al hidratar.
    if (state.status === 'approved') return;
    if (!state.input && !state.plan) return;
    saveAgent5({
      input: state.input,
      plan: state.plan,
      status: state.status,
      error: state.error,
    });
  }, [state.input, state.plan, state.status, state.error, isHydrated, saveAgent5]);

  const handlePlanChange = useCallback((plan: SprintPlan) => {
    setState((prev) => ({ ...prev, plan, status: 'review', error: null }));
  }, []);

  const handleStatusChange = useCallback((status: Agent5Status) => {
    setState((prev) => ({ ...prev, status, error: null }));
  }, []);

  const handleApprove = useCallback(async () => {
    if (!state.input || !state.plan) return;

    setIsApproving(true);
    try {
      await approveAgent5({
        epics: state.input.epics,
        estimations: state.input.estimations,
        priorities: state.input.priorities,
        framework: state.input.framework,
        plan: state.plan,
        sourceWishIds: state.input.sourceWishIds,
        approvedAt: Date.now(),
      });
      setState((prev) => ({ ...prev, status: 'approved' }));
      notifySuccess({
        title: 'Plan de sprints consolidado',
        description: 'Puedes revisar el resumen en el dashboard.',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al consolidar plan de sprints';
      setState((prev) => ({
        ...prev,
        error: message,
      }));
      notifyError(errorMessage(error, 'Error al consolidar plan de sprints'));
    } finally {
      setIsApproving(false);
    }
  }, [state.input, state.plan, approveAgent5]);

  const allStories = state.input?.epics.flatMap((e) => e.userStories) ?? [];
  const epicCount = state.input?.epics.length ?? 0;
  const storyCount = allStories.length;

  const totalPoints = allStories.reduce(
    (sum, s) => sum + (state.input?.estimations[s.id]?.points ?? 0),
    0
  );

  const priorityCount = state.input ? Object.keys(state.input.priorities).length : 0;

  const hasPlan = state.plan !== null && state.plan.sprints.length > 0;
  const sprintCount = state.plan?.sprints.length ?? 0;
  const avgVelocity = sprintCount > 0
    ? Math.round(state.plan!.sprints.reduce((sum, s) => sum + s.velocitySp, 0) / sprintCount)
    : 0;

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
        step={5}
        variant="structure"
        title="Planificación de Sprints"
        description="Organiza las historias priorizadas en sprints concretos: define Sprint Goals, respeta prioridad MoSCoW y capacidad, calcula velocidad y genera el cronograma."
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
                label={`historia${storyCount !== 1 ? 's' : ''}`}
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
              <AgentStat
                icon={
                  <svg className="h-4 w-4 text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                  </svg>
                }
                value={priorityCount}
                label={`priorizada${priorityCount !== 1 ? 's' : ''}`}
              />
              {hasPlan ? (
                <AgentStat
                  icon={
                    <svg className="h-4 w-4 text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  }
                  value={sprintCount}
                  label={`sprint${sprintCount !== 1 ? 's' : ''}`}
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
          <SprintPlanningWorkspace
            input={state.input}
            plan={state.plan}
            status={state.status}
            onStatusChange={handleStatusChange}
            onPlanChange={handlePlanChange}
            onApprove={handleApprove}
            isApproved={isApproved}
            isApproving={isApproving}
            onError={(message) => setState((prev) => ({ ...prev, error: message }))}
          />

          {isApproved && (
            <AgentCelebrationBanner
              title="Plan de Sprints consolidado"
              description={`${epicCount} épica${epicCount !== 1 ? 's' : ''} · ${storyCount} historia${storyCount !== 1 ? 's' : ''} · ${sprintCount} sprint${sprintCount !== 1 ? 's' : ''} planificado${sprintCount !== 1 ? 's' : ''}`}
              extra={
                <p className="mt-1.5 text-[12px] text-subtle">
                  {totalPoints} SP totales
                  {hasPlan ? ` · ${avgVelocity} SP/sprint promedio` : ''}
                </p>
              }
              action={
                <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
                  {plan?.limits.executionBoard ? (
                    <Link
                      href="/agentes/board"
                      className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground sm:w-auto"
                    >
                      Ir al tablero
                    </Link>
                  ) : null}
                  <Link
                    href="/agentes/dashboard"
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 sm:w-auto"
                  >
                    Dashboard
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                </div>
              }
            />
          )}
        </>
      ) : (
        <EmptyAgent5State />
      )}
    </div>
  );
}
