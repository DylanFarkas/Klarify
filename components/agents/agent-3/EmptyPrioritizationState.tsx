'use client';

import Link from 'next/link';

export function EmptyPrioritizationState() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center rounded-xl border border-transparent px-5 py-8 text-center animate-[fadeIn_0.3s_ease-out]">
      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-surface-muted">
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
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <h3 className="mt-5 text-[15px] font-semibold tracking-tight text-foreground">
        No hay datos del Agente 2
      </h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">
        Para estimar el backlog, primero debes completar el Agente 2 y aprobar tus épicas e
        historias de usuario.
      </p>

      <div className="mt-6">
        <Link
          href="/agentes/2"
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-surface-muted px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          Volver al Agente 2
        </Link>
      </div>
    </div>
  );
}
