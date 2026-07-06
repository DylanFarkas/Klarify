'use client';

import Link from 'next/link';

interface BoardEmptyStateProps {
  reason: 'pipeline' | 'stories';
}

export function BoardEmptyState({ reason }: BoardEmptyStateProps) {
  if (reason === 'pipeline') {
    return (
      <div className="rounded-2xl border border-border bg-surface/80 px-6 py-10 text-center">
        <p className="text-sm font-semibold text-foreground">Pipeline incompleto</p>
        <p className="mt-2 text-sm text-muted">
          Completa la planificación de sprints para desbloquear el tablero de ejecución.
        </p>
        <Link
          href="/agentes/5"
          className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          Ir a planificación
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-10 text-center">
      <p className="text-sm font-semibold text-foreground">Sin historias en el tablero</p>
      <p className="mt-2 text-sm text-muted">Ajusta los filtros o añade historias desde el dashboard.</p>
    </div>
  );
}
