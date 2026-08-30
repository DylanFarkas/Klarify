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
  effortLabel: string;
}

export function EmptyPrioritizationStartState({
  framework,
  onFrameworkChange,
  onPrioritize,
  isPrioritizing,
  epicCount,
  storyCount,
  effortLabel,
}: EmptyPrioritizationStartStateProps) {
  const frameworkLabel = FRAMEWORK_DESCRIPTIONS[framework].label;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center rounded-xl border border-transparent px-5 py-8 text-center animate-[fadeIn_0.3s_ease-out]">
      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-surface-muted">
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
            d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
          />
        </svg>
      </div>

      <h3 className="mt-5 text-[15px] font-semibold tracking-tight text-foreground">
        Elige cómo priorizar
      </h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">
        Clasifica las historias según valor de negocio. Después puedes ajustar las categorías.
      </p>

      <div className="mt-6 flex justify-center">
        <FrameworkSelector
          value={framework}
          onChange={onFrameworkChange}
          disabled={isPrioritizing}
          centered
        />
      </div>

      <div className="mt-6">
        <GeneratePrioritizationButton
          onClick={onPrioritize}
          isGenerating={isPrioritizing}
          label={`Sugerir priorización ${frameworkLabel}`}
          generatingLabel={`Clasificando ${frameworkLabel}…`}
        />
      </div>

      <p className="mt-4 text-[12px] text-subtle">
        <span className="tabular-nums">{epicCount}</span>
        {' '}
        {epicCount === 1 ? 'épica' : 'épicas'}
        {' · '}
        <span className="tabular-nums">{storyCount}</span>
        {' '}
        {storyCount === 1 ? 'historia' : 'historias'}
        {' · '}
        {effortLabel}
        {' · '}
        {frameworkLabel}
      </p>
    </div>
  );
}
