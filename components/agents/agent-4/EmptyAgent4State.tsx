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

export function EmptyAgent4State() {
  return (
    <EmptyAgentState
      title="No hay datos del Agente 3"
      description="Para priorizar el backlog, primero debes completar el Agente 3 y consolidar las estimaciones en Story Points."
      icon={
        <svg className="h-10 w-10 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
        </svg>
      }
      action={
        <Link href="/agentes/3" className={backLinkClass}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Volver al Agente 3
        </Link>
      }
    />
  );
}
