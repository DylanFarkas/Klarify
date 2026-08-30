'use client';

import Link from 'next/link';
import { GenerateBacklogButton } from './GenerateBacklogButton';

interface EmptyBacklogStateProps {
  hasInput: boolean;
  onGenerate?: () => void;
  isGenerating?: boolean;
}

export function EmptyBacklogState({ hasInput, onGenerate, isGenerating }: EmptyBacklogStateProps) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center rounded-xl border border-transparent px-5 py-8 text-center animate-[fadeIn_0.3s_ease-out]">
      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-surface-muted">
        {hasInput ? (
          <svg
            className="h-6 w-6 text-muted"
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
        ) : (
          <svg
            className="h-6 w-6 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        )}
      </div>

      <h3 className="mt-5 text-[15px] font-semibold tracking-tight text-foreground">
        {hasInput ? 'Backlog no generado' : 'No hay datos del Agente 1'}
      </h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">
        {hasInput
          ? 'Genera épicas e historias de usuario a partir de tus deseos aprobados.'
          : 'Para generar un backlog, primero debes completar el Agente 1 y aprobar tus deseos.'}
      </p>

      <div className="mt-6">
        {hasInput && onGenerate ? (
          <GenerateBacklogButton onClick={onGenerate} isGenerating={isGenerating ?? false} />
        ) : (
          <Link
            href="/agentes/1"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-surface-muted px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            Volver al Agente 1
          </Link>
        )}
      </div>
    </div>
  );
}
