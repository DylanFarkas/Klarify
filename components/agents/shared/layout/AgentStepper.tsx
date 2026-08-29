/**
 * @fileoverview AgentStepper — Indicador visual de progreso entre agentes.
 *
 * Se muestra solo mientras el pipeline está en curso (pasos 1–4).
 * Al llegar al dashboard, el sidebar pasa a WorkspaceSidebarNav.
 * Omite pasos con `disabled: true` (p. ej. Agente 5 desactivado).
 */

import { AGENT_STEPS } from '@/lib/constants/agent-1';
import { sidebarFadeClass, sidebarGroupLabelClass, sidebarIconSlotClass, sidebarRowClass } from './sidebar-styles';

interface AgentStepperProps {
  currentStep: number;
}

export function AgentStepper({ currentStep }: AgentStepperProps) {
  const visibleSteps = AGENT_STEPS.filter((step) => !step.disabled);

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Progreso de agentes">
      <p className={sidebarGroupLabelClass}>Pipeline</p>
      {visibleSteps.map((step, index) => {
        const displayNumber = index + 1;
        const isActive = step.number === currentStep;
        const isCompleted = step.number < currentStep;
        const isFuture = step.number > currentStep;

        return (
          <div
            key={step.number}
            className={[
              sidebarRowClass,
              isActive ? 'bg-elevated' : '',
              isFuture ? 'opacity-55' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            title={step.name}
            aria-current={isActive ? 'step' : undefined}
          >
            <div className={sidebarIconSlotClass}>
              <div
                className={[
                  'flex size-5 items-center justify-center rounded-full text-[11px] font-semibold leading-none',
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
                  displayNumber
                )}
              </div>
            </div>

            <div className={`min-w-0 flex-1 ${sidebarFadeClass}`}>
              <span
                className={[
                  'block truncate text-sm leading-5',
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
                <span className="mt-0.5 block text-xs leading-snug text-subtle">
                  {step.description}
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
