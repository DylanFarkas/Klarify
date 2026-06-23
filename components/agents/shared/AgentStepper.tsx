/**
 * @fileoverview AgentStepper — Indicador visual de progreso entre agentes.
 *
 * Componente server-side que muestra los 6 agentes del pipeline con sus
 * estados (activo, completado, futuro). Se usa en el sidebar del workspace.
 *
 * Reutilizable: recibe `currentStep` como prop para resaltar el agente activo.
 */

import { AGENT_STEPS } from '@/lib/constants/agent-1';

interface AgentStepperProps {
  /** Número del agente actualmente activo (1-6) */
  currentStep: number;
}

export function AgentStepper({ currentStep }: AgentStepperProps) {
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Progreso de agentes">
      {AGENT_STEPS.map((step, index) => {
        const isActive = step.number === currentStep;
        const isCompleted = step.number < currentStep;
        const isFuture = step.number > currentStep;
        const isLast = index === AGENT_STEPS.length - 1;

        return (
          <div key={step.number} className="flex items-start gap-4">
            {/* Indicador circular + línea conectora */}
            <div className="flex flex-col items-center">
              <div
                className={[
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                  'transition-all duration-300',
                  isActive && 'bg-primary text-white shadow-[0_0_20px_color-mix(in_srgb,var(--primary)_40%,transparent)]',
                  isCompleted && 'bg-success/20 text-success',
                  isFuture && 'border border-step-future-border text-step-future-text',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-current={isActive ? 'step' : undefined}
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

              {/* Línea conectora entre pasos */}
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

            {/* Texto del paso */}
            <div className="pt-2">
              <span
                className={[
                  'text-sm font-medium leading-tight transition-colors duration-300',
                  isActive && 'text-foreground',
                  isCompleted && 'text-success/80',
                  isFuture && 'text-step-future-text',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {step.name}
              </span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
