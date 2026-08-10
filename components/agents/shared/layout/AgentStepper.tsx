/**
 * @fileoverview AgentStepper — Indicador visual de progreso entre agentes.
 *
 * Muestra los agentes del pipeline con estados (activo, completado, futuro).
 * Solo lectura: no permite navegar a pasos anteriores ni futuros.
 */

import { AGENT_STEPS } from '@/lib/constants/agent-1';

interface AgentStepperProps {
  currentStep: number;
}

export function AgentStepper({ currentStep }: AgentStepperProps) {
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Progreso de agentes">
      <p className="mb-2 px-2.5 text-xs font-medium text-subtle">Pipeline</p>
      {AGENT_STEPS.map((step) => {
        const isActive = step.number === currentStep;
        const isCompleted = step.number < currentStep;
        const isFuture = step.number > currentStep;

        return (
          <div
            key={step.number}
            className={[
              'grid grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-x-2.5 rounded-lg px-2.5 py-2 transition-colors',
              isActive ? 'bg-surface-hover' : '',
              isFuture ? 'opacity-55' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-current={isActive ? 'step' : undefined}
          >
            <div
              className={[
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold leading-none',
                isActive && 'bg-primary text-white',
                isCompleted && 'bg-success/20 text-success',
                isFuture && 'border border-step-future-border text-step-future-text',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {isCompleted ? (
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.number
              )}
            </div>

            <span
              className={[
                'truncate text-sm leading-5',
                isActive && 'font-medium text-foreground',
                isCompleted && 'text-muted',
                isFuture && 'text-step-future-text',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {step.name}
            </span>

            {isActive ? (
              <span className="col-start-2 text-xs leading-snug text-subtle">
                {step.description}
              </span>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
