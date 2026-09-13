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
  overview: 'Resumen',
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
    <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-8">
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium tabular-nums text-subtle">
            Paso {step}/{totalSteps}
          </span>
          <span className="text-subtle" aria-hidden>
            ·
          </span>
          <span className="text-xs font-medium text-subtle">
            {VARIANT_LABELS[variant]}
          </span>
          {statusBadge}
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.75rem]">
          {title}
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>

        {stats ? (
          <div className="mt-4 flex flex-wrap items-center gap-4">{stats}</div>
        ) : null}
      </div>

      <div className="hidden shrink-0 opacity-80 md:flex md:items-center md:justify-center md:pt-1">
        <AgentHeroMotif variant={variant} />
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
        'flex items-center gap-1.5 text-[13px]',
        accent === 'success' ? 'text-success' : 'text-subtle',
      ].join(' ')}
    >
      {icon}
      <span className="font-medium text-foreground">{value}</span>
      <span>{label}</span>
    </span>
  );
}
