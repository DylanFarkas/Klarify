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
      <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.16em] text-subtle">
        Pipeline
      </p>
      {AGENT_STEPS.map((step, index) => {
        const isActive = step.number === currentStep;
        const isCompleted = step.number < currentStep;
        const isFuture = step.number > currentStep;
        const isLast = index === AGENT_STEPS.length - 1;

        return (
          <div key={step.number} className="flex items-start gap-4">
            <div
              className={[
                'flex flex-1 items-start gap-4 rounded-xl -mx-2 px-2 py-1',
                isFuture ? 'opacity-70' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={isActive ? 'step' : undefined}
            >
              <div className="flex flex-col items-center">
                <div
                  className={[
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                    'transition-all duration-300',
                    isActive && 'bg-primary text-white',
                    isCompleted && 'bg-success/20 text-success',
                    isFuture && 'border border-step-future-border text-step-future-text',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {isCompleted ? (
                    <svg
                      className="h-4 w-4"
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

                {!isLast && (
                  <div
                    className={[
                      'h-8 w-px transition-colors duration-300',
                      isCompleted ? 'bg-success/30' : 'bg-border',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-hidden="true"
                  />
                )}
              </div>

              <div className="min-w-0 pt-2">
                <span
                  className={[
                    'block text-sm font-medium leading-tight transition-colors duration-300',
                    isActive && 'text-foreground',
                    isCompleted && 'text-success/80',
                    isFuture && 'text-step-future-text',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {step.name}
                </span>
                {isActive && (
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                    {step.description}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
