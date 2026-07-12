'use client';

import { FRAMEWORK_DESCRIPTIONS } from '@/lib/constants/agent-4';
import type { PrioritizationFramework } from '@/lib/types/agent-4';
import { FrameworkSelector } from './FrameworkSelector';
import { GeneratePrioritizationButton } from './GeneratePrioritizationButton';

interface EmptyPrioritizationStartStateProps {
  framework: PrioritizationFramework;
  onFrameworkChange: (framework: PrioritizationFramework) => void;
  onPrioritize: () => void;
  isPrioritizing: boolean;
  epicCount: number;
  storyCount: number;
  totalPoints: number;
}

export function EmptyPrioritizationStartState({
  framework,
  onFrameworkChange,
  onPrioritize,
  isPrioritizing,
  epicCount,
  storyCount,
  totalPoints,
}: EmptyPrioritizationStartStateProps) {
  const frameworkLabel = FRAMEWORK_DESCRIPTIONS[framework].label;

  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface-muted/50 py-20 text-center animate-[fadeIn_0.4s_ease-out]">
      <div
        className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-primary/4 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-primary/3 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-md px-6">
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/15 bg-linear-to-br from-primary/10 to-primary/5">
          <svg className="h-10 w-10 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
        </div>

        <h3 className="mb-2 text-xl font-bold text-foreground">Priorización no generada</h3>
        <p className="mb-6 text-sm leading-relaxed text-muted">
          Clasifica {storyCount} historia{storyCount !== 1 ? 's' : ''} de {epicCount} épica{epicCount !== 1 ? 's' : ''} ({totalPoints} SP)
          según valor de negocio con {frameworkLabel}.
        </p>

        <div className="mb-6 flex justify-center">
          <FrameworkSelector
            value={framework}
            onChange={onFrameworkChange}
            disabled={isPrioritizing}
          />
        </div>

        <GeneratePrioritizationButton
          onClick={onPrioritize}
          isGenerating={isPrioritizing}
          label={`Sugerir priorización ${frameworkLabel}`}
          generatingLabel={`Clasificando ${frameworkLabel}...`}
        />
      </div>
    </div>
  );
}
