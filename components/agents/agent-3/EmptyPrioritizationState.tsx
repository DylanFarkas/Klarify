'use client';

import Link from 'next/link';
import { EmptyAgentState } from '@/components/agents/shared/EmptyAgentState';

export function EmptyPrioritizationState() {
  return (
    <EmptyAgentState
      title="No hay datos del Agente 2"
      description="Para estimar el backlog, primero debes completar el Agente 2 y aprobar tus épicas e historias de usuario."
      icon={
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
      }
      action={
        <Link
          href="/agentes/2"
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          Volver al Agente 2
        </Link>
      }
    />
  );
}
