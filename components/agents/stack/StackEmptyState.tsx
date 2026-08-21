/**
 * @fileoverview Empty state del módulo Stack.
 */

'use client';

import Link from 'next/link';
import { EmptyAgentState } from '@/components/agents/shared/EmptyAgentState';

interface StackEmptyStateProps {
  pipelineReady: boolean;
  onBuildManual: () => void;
  onRecommend: () => void;
}

export function StackEmptyState({
  pipelineReady,
  onBuildManual,
  onRecommend,
}: StackEmptyStateProps) {
  if (!pipelineReady) {
    return (
      <EmptyAgentState
        className="mx-auto w-full max-w-md"
        title="Pipeline incompleto"
        description="Completa la priorización y genera el backlog para desbloquear la recomendación de stack."
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
            />
          </svg>
        }
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              href="/agentes/backlog"
              className="inline-flex rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Ir al backlog
            </Link>
            <Link
              href="/agentes/1"
              className="inline-flex rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              Agente 1
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <EmptyAgentState
      className="mx-auto w-full max-w-3xl"
      title="Define el stack del proyecto"
      description="Arma el stack a mano desde el catálogo o deja que Klark investigue en la web y proponga uno coherente con tu backlog."
      icon={
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
          />
        </svg>
      }
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onRecommend}
            className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 cursor-pointer"
          >
            Preguntar a Klark
          </button>
          <button
            type="button"
            onClick={onBuildManual}
            className="inline-flex rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground cursor-pointer"
          >
            Armar el stack
          </button>
        </div>
      }
    />
  );
}
