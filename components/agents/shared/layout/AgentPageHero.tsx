import type { ReactNode } from 'react';
import { AgentHeroMotif, type AgentHeroVariant } from './AgentHeroMotif';

export type { AgentHeroVariant };

interface AgentPageHeroProps {
  step: number;
  totalSteps?: number;
  title: string;
  description: string;
  variant: AgentHeroVariant;
  statusBadge?: ReactNode;
  stats?: ReactNode;
}

const VARIANT_LABELS: Record<AgentHeroVariant, string> = {
  capture: 'Captura',
  structure: 'Estructura',
  measure: 'Medición',
  order: 'Orden',
};

export function AgentPageHero({
  step,
  totalSteps = 6,
  title,
  description,
  variant,
  statusBadge,
  stats,
}: AgentPageHeroProps) {
  return (
    <header
      className={[
        'agent-hero relative overflow-hidden rounded-2xl border border-border',
        'bg-surface-muted/60 p-8 animate-[fadeIn_0.4s_ease-out]',
        `agent-hero--${variant}`,
      ].join(' ')}
    >
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/5 blur-3xl animate-[heroGlow_8s_ease-in-out_infinite]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-primary/3 blur-3xl animate-[heroGlow_10s_ease-in-out_infinite_2s]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-1/3 top-0 h-px w-32 bg-linear-to-r from-transparent via-primary/20 to-transparent"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-10">
        <div className="min-w-0 flex-1">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
              <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Paso {String(step).padStart(2, '0')} - {totalSteps}
            </span>
            <span className="rounded-full border border-border bg-surface/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              {VARIANT_LABELS[variant]}
            </span>
            {statusBadge}
          </div>

          <h1 className="mb-4 bg-foreground bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-4xl">
            {title}
          </h1>

          <p className="text-lg leading-relaxed text-muted">{description}</p>

          {stats && (
            <div className="mt-5 flex flex-wrap items-center gap-5 animate-[fadeIn_0.5s_ease-out_0.2s_both]">
              {stats}
            </div>
          )}
        </div>

        <div className="hidden shrink-0 md:flex md:items-center md:justify-center md:pt-2">
          <AgentHeroMotif variant={variant} />
        </div>
      </div>
    </header>
  );
}

interface AgentStatProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  accent?: 'default' | 'success';
}

export function AgentStat({ icon, value, label, accent = 'default' }: AgentStatProps) {
  return (
    <span
      className={[
        'flex items-center gap-1.5 text-sm',
        accent === 'success' ? 'text-success' : 'text-subtle',
      ].join(' ')}
    >
      {icon}
      <span className="font-medium text-foreground">{value}</span>
      <span>{label}</span>
    </span>
  );
}
