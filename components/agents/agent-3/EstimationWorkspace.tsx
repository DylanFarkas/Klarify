'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAgentActivity } from '@/hooks/useAgentActivity';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/lib/api-client';
import type { Agent3Input } from '@/lib/types/workspace';
import type { UserStory } from '@/lib/types/agent-2';
import type {
  Agent3EstimationResponse,
  Agent3Status,
  StoryEstimation,
} from '@/lib/types/agent-3';
import { ApproveButton } from '@/components/agents/shared/workflow/ApproveButton';
import { AgentActivityModal } from '@/components/agents/shared/activity-log/AgentActivityModal';
import { DetailModal } from '@/components/agents/shared/DetailModal';
import { ViewDetailsButton } from '@/components/agents/shared/ViewDetailsButton';
import { UserStoryDetailContent } from '@/components/agents/shared/UserStoryDetailContent';
import { useWorkspaceSettings } from '@/context/WorkspaceSettingsContext';
import { FIBONACCI_SCALE } from '@/lib/constants/agent-3';

interface EstimationWorkspaceProps {
  input: Agent3Input;
  estimations: Record<string, StoryEstimation>;
  onEstimationsChange: (estimations: Record<string, StoryEstimation>) => void;
  status: Agent3Status;
  onStatusChange: (status: Agent3Status) => void;
  onApprove: () => void;
  isApprovable: boolean;
  isApproved: boolean;
  isApproving: boolean;
}

const POINT_COLORS: Record<number, string> = {
  1: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30 ring-emerald-500/20',
  2: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25 ring-emerald-500/15',
  3: 'bg-sky-500/15 text-sky-400 border-sky-500/30 ring-sky-500/20',
  5: 'bg-amber-500/15 text-amber-400 border-amber-500/30 ring-amber-500/20',
  8: 'bg-orange-500/15 text-orange-400 border-orange-500/30 ring-orange-500/20',
  13: 'bg-rose-500/15 text-rose-400 border-rose-500/30 ring-rose-500/20',
  21: 'bg-red-500/15 text-red-400 border-red-500/30 ring-red-500/20',
};

function getPointColor(points: number, selected = false): string {
  const base = POINT_COLORS[points] ?? 'bg-surface-muted text-muted border-border';
  return selected ? `${base} ring-2` : base;
}

function getPointLabel(points: number): string {
  if (points <= 1) return 'Trivial';
  if (points <= 2) return 'Simple';
  if (points <= 3) return 'Media';
  if (points <= 5) return 'Compleja';
  if (points <= 8) return 'Muy compleja';
  return 'Masiva';
}

function AnalyzeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  );
}

function RegenerateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
    </svg>
  );
}

interface FibonacciPickerProps {
  value: number;
  onChange: (points: number) => void;
  disabled: boolean;
}

function FibonacciPicker({ value, onChange, disabled }: FibonacciPickerProps) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Seleccionar Story Points">
      {FIBONACCI_SCALE.map((num) => {
        const isSelected = value === num;
        return (
          <button
            key={num}
            type="button"
            disabled={disabled}
            onClick={() => onChange(num)}
            className={[
              'flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-bold',
              'transition-all duration-150 cursor-pointer',
              isSelected
                ? getPointColor(num, true)
                : 'border-border/60 bg-surface text-muted hover:border-border-strong hover:bg-surface-hover hover:text-foreground',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface',
            ].join(' ')}
            aria-pressed={isSelected}
            aria-label={`${num} Story Points — ${getPointLabel(num)}`}
          >
            {num}
          </button>
        );
      })}
    </div>
  );
}

interface StoryRowProps {
  story: UserStory;
  epicTitle: string;
  estimation: StoryEstimation | undefined;
  isAnalyzing: boolean;
  isApproved: boolean;
  onPointChange: (points: number) => void;
  index: number;
}

function StoryRow({
  story,
  epicTitle,
  estimation,
  isAnalyzing,
  isApproved,
  onPointChange,
  index,
}: StoryRowProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const points = estimation?.points ?? 0;
  const hasPoint = points > 0;
  const disabled = !estimation || isApproved || isAnalyzing;

  return (
    <article
      className={[
        'group rounded-xl border border-border/60 bg-surface p-4 sm:p-5',
        'transition-all duration-200 hover:border-border hover:shadow-sm',
        estimation?.isModified && 'border-amber-500/25 bg-amber-500/3',
        'animate-[fadeIn_0.3s_ease-out]',
      ].join(' ')}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        {/* Story info */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="shrink-0 rounded-md border border-border bg-surface-muted px-2 py-0.5 font-mono text-[10px] font-medium text-muted">
              {story.id}
            </span>
            <h5 className="text-sm font-semibold text-foreground">{story.title}</h5>
            {estimation?.isModified && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-500">
                <span className="h-1 w-1 rounded-full bg-amber-500" />
                Ajustado
              </span>
            )}
            <ViewDetailsButton
              onClick={() => setIsDetailOpen(true)}
              className="ml-auto sm:ml-0"
            />
          </div>
          <p className="text-xs leading-relaxed text-muted line-clamp-3">{story.description}</p>
        </div>

        {/* Agent reasoning */}
        <div className="lg:w-[280px] shrink-0">
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted">
            <svg className="h-3 w-3 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
            Razonamiento IA
          </p>
          <div className="rounded-lg border border-border/50 bg-surface-muted/50 px-3 py-2.5 min-h-[52px]">
            {estimation?.justification ? (
              <p className="text-[11px] italic leading-relaxed text-muted">
                &ldquo;{estimation.justification}&rdquo;
              </p>
            ) : (
              <p className="text-[11px] italic text-muted/40">
                {isAnalyzing ? 'Analizando complejidad...' : 'Pendiente de análisis'}
              </p>
            )}
          </div>
        </div>

        {/* Points */}
        <div className="lg:w-[200px] shrink-0">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">Story Points</p>
          <div className="flex items-center gap-3">
            {hasPoint && (
              <div
                className={[
                  'flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border',
                  getPointColor(points, true),
                ].join(' ')}
                aria-hidden="true"
              >
                <span className="text-base font-bold leading-none">{points}</span>
                <span className="mt-0.5 text-[8px] font-medium uppercase opacity-70">SP</span>
              </div>
            )}
            <div className="flex-1">
              <FibonacciPicker
                value={hasPoint ? points : 0}
                onChange={onPointChange}
                disabled={disabled}
              />
              {hasPoint && (
                <p className="mt-1.5 text-[10px] text-muted">{getPointLabel(points)}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <DetailModal
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={story.title}
        subtitle={story.id}
        eyebrow="Historia de usuario"
      >
        <UserStoryDetailContent
          story={story}
          epicTitle={epicTitle}
          estimation={estimation}
        />
      </DetailModal>
    </article>
  );
}

export function EstimationWorkspace({
  input,
  estimations,
  onEstimationsChange,
  status,
  onStatusChange,
  onApprove,
  isApprovable,
  isApproved,
  isApproving,
}: EstimationWorkspaceProps) {
  const { user } = useAuth();
  const { entries, reset, consumeStream } = useAgentActivity();
  const { showModelReasoning } = useWorkspaceSettings();

  const isAnalyzing = status === 'estimating';
  const activityModalOpen = isAnalyzing && showModelReasoning;

  const allStories = useMemo(
    () => input.epics.flatMap((e) => e.userStories),
    [input.epics]
  );
  const totalStories = allStories.length;
  const totalPoints = useMemo(
    () => allStories.reduce((sum, s) => sum + (estimations[s.id]?.points ?? 0), 0),
    [allStories, estimations]
  );
  const estimatedCount = useMemo(
    () => allStories.filter((s) => (estimations[s.id]?.points ?? 0) > 0).length,
    [allStories, estimations]
  );
  const hasEstimations = Object.keys(estimations).length > 0;
  const progressPct = totalStories > 0 ? Math.round((estimatedCount / totalStories) * 100) : 0;

  const handleAnalyzeWithAgent = useCallback(async () => {
    if (!input || !user) return;

    onStatusChange('estimating');
    reset();

    try {
      const response = await authFetch('/api/agentes/3/estimate', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ epics: input.epics }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al obtener las estimaciones del Scrum Master');
      }

      const data = await consumeStream<Agent3EstimationResponse>(response);

      const aiResult: Record<string, StoryEstimation> = {};
      data.suggestions.forEach((sug) => {
        aiResult[sug.storyId] = {
          points: sug.suggestedPoints,
          justification: sug.justification,
          isModified: false,
        };
      });

      onEstimationsChange(aiResult);
      onStatusChange('review');
    } catch (error) {
      console.error('Error en la conexión con el Agente 3:', error);
      onStatusChange('idle');
      alert(error instanceof Error ? error.message : 'Error al procesar la estimación.');
    }
  }, [input, user, consumeStream, reset, onEstimationsChange, onStatusChange]);

  const handlePointChange = (storyId: string, newPoints: number) => {
    onEstimationsChange({
      ...estimations,
      [storyId]: {
        ...estimations[storyId],
        points: newPoints,
        isModified: true,
      },
    });
  };

  if (input.epics.length === 0) return null;

  return (
    <section
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface-muted backdrop-blur-sm animate-[fadeIn_0.4s_ease-out]"
      aria-labelledby="estimation-workspace-heading"
    >
      {showModelReasoning && (
        <AgentActivityModal
          open={activityModalOpen}
          isActive={isAnalyzing}
          title={hasEstimations ? 'Regenerando estimación...' : 'Estimando Story Points...'}
          description={
            hasEstimations
              ? 'El Scrum Master IA vuelve a calcular los Story Points de cada historia. Los valores anteriores serán reemplazados.'
              : 'El Scrum Master IA analiza la complejidad técnica de cada historia de usuario del backlog.'
          }
          meta={
            input
              ? `${input.epics.length} épica${input.epics.length !== 1 ? 's' : ''} · ${totalStories} historias`
              : undefined
          }
          entries={entries}
        />
      )}

      {/* ── Section header ─────────────────────────────────────── */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <div>
              <h3 id="estimation-workspace-heading" className="text-base font-bold text-foreground">
                Workspace de Estimación
              </h3>
              <p className="text-xs text-muted">
                {input.epics.length} épica{input.epics.length !== 1 ? 's' : ''} · {totalStories} historias
              </p>
            </div>
          </div>

          {hasEstimations && (
            <div className="flex items-center gap-4 sm:min-w-[220px]">
              <div className="flex-1">
                <div className="mb-1 flex items-center justify-between text-[10px]">
                  <span className="font-medium text-muted">Progreso</span>
                  <span className="font-bold text-foreground">{estimatedCount}/{totalStories}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-border/60">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold leading-none text-foreground">{totalPoints}</p>
                <p className="text-[10px] font-medium text-muted">SP total</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Empty state: sin estimaciones ──────────────────────── */}
      {!hasEstimations && !isAnalyzing && !isApproved && (
        <div className="flex flex-col items-center px-6 py-16 text-center animate-[fadeIn_0.4s_ease-out]">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-3xl bg-primary/10 blur-2xl" aria-hidden="true" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5">
              <AnalyzeIcon className="h-9 w-9 text-primary" />
            </div>
          </div>
          <h4 className="mb-2 text-lg font-bold text-foreground">Listo para estimar</h4>
          <p className="mb-8 max-w-md text-sm leading-relaxed text-muted">
            El Scrum Master IA analizará cada historia de usuario y sugerirá Story Points
            según la escala Fibonacci, con justificación técnica para cada valor.
          </p>
          <button
            onClick={handleAnalyzeWithAgent}
            disabled={isAnalyzing || isApproving}
            className={[
              'inline-flex items-center justify-center gap-2.5 rounded-xl px-8 py-3.5 text-sm font-bold',
              'bg-primary text-white cursor-pointer',
              'shadow-[0_4px_24px_color-mix(in_srgb,var(--primary)_35%,transparent)]',
              'transition-all duration-200 hover:shadow-[0_6px_32px_color-mix(in_srgb,var(--primary)_45%,transparent)] hover:scale-[1.02] active:scale-95',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:scale-100',
            ].join(' ')}
          >
            <AnalyzeIcon className="h-4 w-4" />
            Sugerir Story Points con IA
          </button>
          <p className="mt-4 text-[11px] text-muted/60">
            Escala Fibonacci: {FIBONACCI_SCALE.join(' · ')}
          </p>
        </div>
      )}

      {/* ── Analyzing overlay ──────────────────────────────────── */}
      {isAnalyzing && !showModelReasoning && (
        <div className="flex flex-col items-center px-6 py-20 animate-[fadeIn_0.25s_ease-out]">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl animate-pulse" aria-hidden="true" />
            <div className="relative h-14 w-14 animate-spin rounded-full border-[3px] border-border border-t-primary" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            {hasEstimations ? 'Regenerando estimaciones...' : 'Analizando complejidad del backlog...'}
          </p>
          <p className="mt-1.5 text-xs text-muted">
            Evaluando {totalStories} historia{totalStories !== 1 ? 's' : ''} en {input.epics.length} épica{input.epics.length !== 1 ? 's' : ''}
          </p>
          <div className="mt-6 h-1 w-48 overflow-hidden rounded-full bg-border/60">
            <div className="agent-progress-shimmer h-full w-1/3 rounded-full bg-primary/40" />
          </div>
        </div>
      )}

      {/* ── Epic list ──────────────────────────────────────────── */}
      {(hasEstimations || isApproved) && (
        <div className="flex flex-col gap-5 px-6 py-5">
          {input.epics.map((epic, epicIdx) => {
            const epicStories = epic.userStories || [];
            const epicEstimated = epicStories.filter(
              (s) => (estimations[s.id]?.points ?? 0) > 0
            ).length;
            const epicPoints = epicStories.reduce(
              (sum, s) => sum + (estimations[s.id]?.points ?? 0),
              0
            );
            const epicProgress = epicStories.length > 0
              ? Math.round((epicEstimated / epicStories.length) * 100)
              : 0;

            return (
              <div
                key={epic.id}
                className="animate-[fadeIn_0.3s_ease-out]"
                style={{ animationDelay: `${epicIdx * 80}ms` }}
              >
                {/* Epic header */}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary ring-1 ring-primary/20">
                      {epicIdx + 1}
                    </span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                        Épica {epicIdx + 1}
                      </p>
                      <h4 className="text-sm font-bold text-foreground">{epic.title}</h4>
                    </div>
                  </div>
                  {hasEstimations && epicStories.length > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="hidden items-center gap-2 sm:flex">
                        <div className="h-1 w-16 overflow-hidden rounded-full bg-border/60">
                          <div
                            className="h-full rounded-full bg-primary/70 transition-all duration-300"
                            style={{ width: `${epicProgress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted">
                          {epicEstimated}/{epicStories.length}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-bold text-foreground">
                        {epicPoints}
                        <span className="font-normal text-muted">SP</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Stories */}
                {epicStories.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {epicStories.map((story, storyIdx) => (
                      <StoryRow
                        key={story.id}
                        story={story}
                        epicTitle={epic.title}
                        estimation={estimations[story.id]}
                        isAnalyzing={isAnalyzing}
                        isApproved={isApproved}
                        onPointChange={(pts) => handlePointChange(story.id, pts)}
                        index={epicIdx * 10 + storyIdx}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border px-6 py-8 text-center text-sm text-muted">
                    Esta épica no tiene historias de usuario.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Sticky action bar ──────────────────────────────────── */}
      {hasEstimations && !isApproved && (
        <div className="sticky bottom-4 z-20 mx-4 mb-4 animate-[slideUpFade_0.4s_ease-out]">
          <div className="rounded-2xl border border-border/80 bg-surface/90 backdrop-blur-xl px-5 py-4 shadow-[0_8px_40px_color-mix(in_srgb,var(--foreground)_10%,transparent)]">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-subtle sm:justify-start">
                <span>
                  <span className="font-semibold text-foreground">{estimatedCount}</span>
                  <span className="text-muted">/{totalStories} historias</span>
                </span>
                <span className="hidden h-4 w-px bg-border sm:block" />
                <span>
                  <span className="font-semibold text-foreground">{totalPoints}</span>
                  <span className="text-muted"> SP totales</span>
                </span>
                {!isApprovable && (
                  <>
                    <span className="hidden h-4 w-px bg-border sm:block" />
                    <span className="text-xs text-amber-500">
                      Faltan {totalStories - estimatedCount} por estimar
                    </span>
                  </>
                )}
              </div>

              <div className="flex w-full flex-col-reverse items-stretch gap-2.5 sm:w-auto sm:flex-row sm:items-center">
                <button
                  onClick={handleAnalyzeWithAgent}
                  disabled={isAnalyzing || isApproving}
                  className={[
                    'inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5',
                    'text-sm font-medium text-muted cursor-pointer',
                    'hover:border-border-strong hover:bg-surface-hover hover:text-foreground',
                    'transition-all duration-200',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                  ].join(' ')}
                >
                  <RegenerateIcon className="h-4 w-4" />
                  Regenerar
                </button>

                <ApproveButton
                  onClick={onApprove}
                  disabled={!isApprovable || isApproving || isAnalyzing}
                  label={isApproving ? 'Consolidando...' : 'Consolidar Backlog Estimado'}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
