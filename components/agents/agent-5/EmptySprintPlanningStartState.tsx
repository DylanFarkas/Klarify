'use client';

import { GenerateSprintPlanButton } from './GenerateSprintPlanButton';

interface EmptySprintPlanningStartStateProps {
  onGenerate: () => void;
  isPlanning: boolean;
  epicCount: number;
  storyCount: number;
  totalPoints: number;
  capacity: number;
  durationWeeks: number;
  startDate: string;
}

export function EmptySprintPlanningStartState({
  onGenerate,
  isPlanning,
  epicCount,
  storyCount,
  totalPoints,
  capacity,
  durationWeeks,
  startDate,
}: EmptySprintPlanningStartStateProps) {
  const estimatedSprints = Math.ceil(totalPoints / capacity);

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface px-5 py-14 text-center animate-[fadeIn_0.3s_ease-out]">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-muted">
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
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
          />
        </svg>
      </div>

      <h3 className="mt-5 text-[15px] font-semibold tracking-tight text-foreground">
        Plan de sprints no generado
      </h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
        Organiza {storyCount} historia{storyCount !== 1 ? 's' : ''} de {epicCount} épica
        {epicCount !== 1 ? 's' : ''} ({totalPoints} SP) en sprints de {capacity} SP cada{' '}
        {durationWeeks} semana{durationWeeks !== 1 ? 's' : ''}
        {estimatedSprints > 0
          ? ` (~${estimatedSprints} sprint${estimatedSprints !== 1 ? 's' : ''} estimado${estimatedSprints !== 1 ? 's' : ''})`
          : ''}
        .
      </p>

      <p className="mt-4 text-[12px] text-subtle">
        Inicio {startDate} · {capacity} SP/sprint · {durationWeeks} sem
      </p>

      <div className="mt-6">
        <GenerateSprintPlanButton
          onClick={onGenerate}
          isGenerating={isPlanning}
          label="Generar plan de sprints"
          generatingLabel="Planificando sprints…"
        />
      </div>
    </div>
  );
}
