/**
 * @fileoverview EmptyBacklogState — Estado vacío del Agente 2.
 *
 * Se muestra cuando no hay input del Agente 1 (link para volver)
 * o cuando hay input pero aún no se generó el backlog (botón generar).
 *
 * Patrón replicado del empty state de WishesList.tsx (Agente 1).
 *
 * Cumple: caso borde de acceso directo a /agentes/2 sin datos.
 */

'use client';

import Link from 'next/link';
import { GenerateBacklogButton } from './GenerateBacklogButton';

interface EmptyBacklogStateProps {
  /** Si hay input del Agente 1 disponible */
  hasInput: boolean;
  /** Callback para generar backlog (solo cuando hasInput es true) */
  onGenerate?: () => void;
  /** Estado de carga */
  isGenerating?: boolean;
}

export function EmptyBacklogState({ hasInput, onGenerate, isGenerating }: EmptyBacklogStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-[fadeIn_0.3s_ease-out]">
      {/* Icono */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-surface-muted">
        {hasInput ? (
          <svg className="h-10 w-10 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
          </svg>
        ) : (
          <svg className="h-10 w-10 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        )}
      </div>

      {/* Texto */}
      <h3 className="mb-2 text-lg font-bold text-foreground">
        {hasInput ? 'Backlog no generado' : 'No hay datos del Agente 1'}
      </h3>
      <p className="mb-8 max-w-sm text-sm leading-relaxed text-muted">
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
            'transition-all hover:shadow-[0_6px_28px_color-mix(in_srgb,var(--primary)_45%,transparent)]',
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
  );
}
