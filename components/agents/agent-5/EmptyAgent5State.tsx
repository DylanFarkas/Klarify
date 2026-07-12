'use client';

import Link from 'next/link';
import { EmptyAgentState } from '@/components/agents/shared/EmptyAgentState';

const backLinkClass = [
  'inline-flex items-center gap-2 rounded-xl px-6 py-3',
  'text-sm font-bold text-white',
  'bg-primary hover:bg-primary-hover',
  'shadow-[0_4px_20px_color-mix(in_srgb,var(--primary)_35%,transparent)]',
  'transition-all hover:shadow-[0_6px_28px_color-mix(in_srgb,var(--primary)_45%,transparent)]',
  'cursor-pointer',
].join(' ');

export function EmptyAgent5State() {
  return (
    <EmptyAgentState
      title="No hay datos del Agente 4"
      description="Para planificar sprints, primero debes completar el Agente 4 y aprobar la priorización del backlog."
      icon={
        <svg
          className="h-10 w-10 text-primary/60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
          />
        </svg>
      }
      action={
        <Link href="/agentes/4" className={backLinkClass}>
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
          Volver al Agente 4
        </Link>
      }
    />
  );
}
