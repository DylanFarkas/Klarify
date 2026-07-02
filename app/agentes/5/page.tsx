/**
 * @fileoverview Página del Agente 5 — Planificación de Sprints.
 *
 * Muestra el contrato de datos (`Agent5Input`) recibido del Agente 4.
 * Próximamente: asignación de HU a sprints, Sprint Goals, velocidad y cronograma.
 */

'use client';

import { useState, useEffect } from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';
import type { Agent5Input, UserWorkspace } from '@/lib/types/workspace';
import { Agent5InputPreview } from '@/components/agents/agent-5/Agent5InputPreview';
import { EmptyAgent5State } from '@/components/agents/agent-5/EmptyAgent5State';
import { AgentPageHero, AgentStat } from '@/components/agents/shared/layout/AgentPageHero';

/** Resuelve el input del Agente 5 desde pipeline o Agente 4 aprobado. */
function resolveAgent5Input(workspace: UserWorkspace): Agent5Input | null {
  const { agent4, pipeline } = workspace;

  if (pipeline.agent5Input?.epics.length) return pipeline.agent5Input;

  if (
    agent4.status === 'approved' &&
    agent4.input?.epics.length &&
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
  const { workspace, isLoading, sessionVersion } = useWorkspace();
  const [input, setInput] = useState<Agent5Input | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (isLoading || !workspace) return;

    setInput(resolveAgent5Input(workspace));
    setIsHydrated(true);
  }, [isLoading, workspace, sessionVersion]);

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

  const hasInput = input !== null && input.epics.length > 0;
  const allStories = input?.epics.flatMap((e) => e.userStories) ?? [];
  const epicCount = input?.epics.length ?? 0;
  const storyCount = allStories.length;
  const totalPoints = allStories.reduce(
    (sum, s) => sum + (input?.estimations[s.id]?.points ?? 0),
    0
  );
  const priorityCount = input ? Object.keys(input.priorities).length : 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
      <AgentPageHero
        step={5}
        variant="structure"
        title="Planificación de Sprints"
        description="Organiza las historias priorizadas en sprints concretos: define Sprint Goals, respeta prioridad MoSCoW y capacidad, calcula velocidad y genera el cronograma."
        stats={
          hasInput ? (
            <>
              <AgentStat
                icon={
                  <svg
                    className="h-4 w-4 text-primary/60"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
                    />
                  </svg>
                }
                value={epicCount}
                label={`épica${epicCount !== 1 ? 's' : ''}`}
              />
              <AgentStat
                icon={
                  <svg
                    className="h-4 w-4 text-primary/60"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
                    />
                  </svg>
                }
                value={storyCount}
                label={`historia${storyCount !== 1 ? 's' : ''} de usuario`}
              />
              <AgentStat
                icon={
                  <svg
                    className="h-4 w-4 text-primary/60"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                }
                value={totalPoints}
                label="Story Points"
              />
              <AgentStat
                icon={
                  <svg
                    className="h-4 w-4 text-primary/60"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
                    />
                  </svg>
                }
                value={priorityCount}
                label={`priorizada${priorityCount !== 1 ? 's' : ''}`}
              />
            </>
          ) : undefined
        }
      />

      {hasInput && input ? <Agent5InputPreview input={input} /> : <EmptyAgent5State />}
    </div>
  );
}
