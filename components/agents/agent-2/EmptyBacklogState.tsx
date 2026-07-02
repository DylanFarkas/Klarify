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
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface-muted/50 py-20 text-center animate-[fadeIn_0.4s_ease-out]">
      {/* Decoración de fondo */}
      <div
        className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-primary/4 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-primary/3 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10">
        {/* Icono con gradiente */}
        <div className="relative mb-6 mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-linear-to-br from-primary/10 to-primary/5 border border-primary/15">
          {hasInput ? (
            <svg className="h-10 w-10 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
          ) : (
            <svg className="h-10 w-10 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          )}
        </div>

        {/* Texto */}
        <h3 className="mb-2 text-xl font-bold text-foreground">
          {hasInput ? 'Backlog no generado' : 'No hay datos del Agente 1'}
        </h3>
        <p className="mb-8 max-w-md text-sm leading-relaxed text-muted">
          {hasInput
            ? 'Haz clic en el botón para generar épicas e historias de usuario a partir de tus deseos aprobados.'
            : 'Para generar un backlog, primero debes completar el Agente 1 y aprobar tus deseos.'}
        </p>

        {/* Acción */}
        {hasInput && onGenerate ? (
          <GenerateBacklogButton onClick={onGenerate} isGenerating={isGenerating ?? false} />
        ) : (
          <Link
            href="/agentes/1"
            className={[
              'inline-flex items-center gap-2 rounded-xl px-6 py-3',
              'text-sm font-bold text-white',
              'bg-primary hover:bg-primary-hover',
              'shadow-[0_4px_20px_color-mix(in_srgb,var(--primary)_35%,transparent)]',
              'transition-all hover:shadow-[0_6px_28px_color-mix(in_srgb,var(--primary)_45%,transparent)] hover:-translate-y-px',
              'cursor-pointer',
            ].join(' ')}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Volver al Agente 1
          </Link>
        )}
      </div>
    </div>
  );
}