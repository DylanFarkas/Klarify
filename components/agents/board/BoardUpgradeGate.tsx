'use client';

import Link from 'next/link';

export function BoardUpgradeGate() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-border bg-surface/80 px-8 py-12 text-center shadow-sm">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-foreground">Tablero de ejecución</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Gestiona tu equipo, asigna responsables y mueve historias por el tablero Kanban. Disponible en los planes Starter y Pro.
      </p>
      <Link
        href="/#pricing"
        className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
      >
        Ver planes
      </Link>
    </div>
  );
}
