'use client';

import Link from 'next/link';

export function EmptyAgent4State() {
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
            d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
          />
        </svg>
      </div>

      <h3 className="mt-5 text-[15px] font-semibold tracking-tight text-foreground">
        No hay datos del Agente 3
      </h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">
        Para priorizar el backlog, primero debes completar el Agente 3 y consolidar las
        estimaciones.
      </p>

      <div className="mt-6">
        <Link
          href="/agentes/3"
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-surface-muted px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          Volver al Agente 3
        </Link>
      </div>
    </div>
  );
}
