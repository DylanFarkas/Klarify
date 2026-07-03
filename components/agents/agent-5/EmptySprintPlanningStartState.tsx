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
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </div>

        <h3 className="mb-2 text-xl font-bold text-foreground">Plan de sprints no generado</h3>
        <p className="mb-6 text-sm leading-relaxed text-muted">
          Organiza {storyCount} historia{storyCount !== 1 ? 's' : ''} de {epicCount} épica{epicCount !== 1 ? 's' : ''} ({totalPoints} SP)
          en sprints de {capacity} SP cada {durationWeeks} semana{durationWeeks !== 1 ? 's' : ''}
          {estimatedSprints > 0 ? ` (~${estimatedSprints} sprint${estimatedSprints !== 1 ? 's' : ''} estimado${estimatedSprints !== 1 ? 's' : ''})` : ''}.
        </p>

        <div className="mb-6 flex items-center justify-center gap-2 text-xs text-muted">
          <svg className="h-4 w-4 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Inicio: <span className="font-bold text-foreground">{startDate}</span></span>
          <span className="mx-1 h-3 w-px bg-border" />
          <span>{capacity} SP/sprint</span>
          <span className="mx-1 h-3 w-px bg-border" />
          <span>{durationWeeks} sem</span>
        </div>

        <GenerateSprintPlanButton
          onClick={onGenerate}
          isGenerating={isPlanning}
          label="Generar plan de sprints"
          generatingLabel="Planificando sprints..."
        />
      </div>
    </div>
  );
}
