/**
 * @fileoverview Empty state del módulo Stack.
 */

'use client';

import Link from 'next/link';

interface StackEmptyStateProps {
  pipelineReady: boolean;
  onBuildManual: () => void;
  onRecommend: () => void;
}

const STACK_ICON = (
  <svg className="h-6 w-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
    />
  </svg>
);

export function StackEmptyState({
  pipelineReady,
  onBuildManual,
  onRecommend,
}: StackEmptyStateProps) {
  if (!pipelineReady) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center py-16 text-center animate-[fadeIn_0.3s_ease-out]">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-surface-muted">
          {STACK_ICON}
        </div>
        <h3 className="mt-5 text-[15px] font-semibold tracking-tight text-foreground">
          Pipeline incompleto
        </h3>
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
          Completa la priorización y genera el backlog para desbloquear la recomendación de stack.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/agentes/backlog"
            className="inline-flex rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Ir al backlog
          </Link>
          <Link
            href="/agentes/1"
            className="inline-flex rounded-md bg-surface-muted px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            Agente 1
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center py-16 text-center animate-[fadeIn_0.3s_ease-out]">
      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-surface-muted">
        {STACK_ICON}
      </div>
      <h3 className="mt-5 text-[15px] font-semibold tracking-tight text-foreground">
        Define el stack del proyecto
      </h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">
        Arma el stack a mano desde el catálogo o deja que Klark investigue en la web y proponga uno
        coherente con tu backlog.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onRecommend}
          className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Preguntar a Klark
        </button>
        <button
          type="button"
          onClick={onBuildManual}
          className="inline-flex cursor-pointer rounded-md bg-surface-muted px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          Armar el stack
        </button>
      </div>
    </div>
  );
}
