/**
 * @fileoverview EmptyAgent4State — Estado vacío del Agente 4.
 *
 * Se muestra cuando no hay input del Agente 3 (pipeline.agent4Input).
 */

'use client';

import Link from 'next/link';

export function EmptyAgent4State() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-[fadeIn_0.3s_ease-out]">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-surface-muted">
        <svg className="h-10 w-10 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      </div>

      <h3 className="mb-2 text-lg font-bold text-foreground">
        No hay datos del Agente 3
      </h3>
      <p className="mb-8 max-w-sm text-sm leading-relaxed text-muted">
        Para priorizar el backlog, primero debes completar el Agente 3 y consolidar las estimaciones en Story Points.
      </p>

      <Link
        href="/agentes/3"
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
        Volver al Agente 3
      </Link>
    </div>
  );
}
