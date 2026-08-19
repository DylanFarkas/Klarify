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
  EstimationMode,
  StoryEstimation,
} from '@/lib/types/agent-3';
import { ApproveButton } from '@/components/agents/shared/workflow/ApproveButton';
import { AgentActivityModal } from '@/components/agents/shared/activity-log/AgentActivityModal';
import { DetailModal } from '@/components/agents/shared/DetailModal';
import { ViewDetailsButton } from '@/components/agents/shared/ViewDetailsButton';
import { UserStoryDetailContent } from '@/components/agents/shared/UserStoryDetailContent';
import { TimeDurationInput } from '@/components/agents/shared/TimeDurationInput';
import { useWorkspaceSettings } from '@/context/WorkspaceSettingsContext';
import { useWorkspace } from '@/hooks/useWorkspace';
import { errorMessage, notifyError, notifySuccess } from '@/lib/notifications/toast';
import { RegenerationHint } from '@/components/agents/shared/RegenerationHint';
import { FIBONACCI_SCALE, TIME_DURATION_EXAMPLES } from '@/lib/constants/agent-3';
import {
  formatDuration,
  formatEffortTotal,
  isEstimationModeLocked,
  isStoryEstimated,
} from '@/lib/utils/estimation';

interface EstimationWorkspaceProps {
  input: Agent3Input;
  estimations: Record<string, StoryEstimation>;
  onEstimationsChange: (estimations: Record<string, StoryEstimation>) => void;
  estimationMode: EstimationMode | null;
  onEstimationModeChange: (mode: EstimationMode) => void;
  status: Agent3Status;
  onStatusChange: (status: Agent3Status) => void;
  onApprove: () => void;
  isApprovable: boolean;
  isApproved: boolean;
  isApproving: boolean;
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
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
      />
    </svg>
  );
}

function RegenerateIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
      />
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
              'flex h-7 min-w-7 items-center justify-center rounded-md border px-1.5 text-[12px] font-medium tabular-nums',
              'transition-colors cursor-pointer',
              isSelected
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-background text-muted hover:border-border-strong hover:bg-surface-hover hover:text-foreground',
              'disabled:cursor-not-allowed disabled:opacity-40',
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

interface ModeOptionCardProps {
  selected: boolean;
  disabled: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}

function ModeOptionCard({ selected, disabled, title, description, onSelect }: ModeOptionCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={selected}
      className={[
        'w-full rounded-xl border px-4 py-3.5 text-left transition-colors',
        selected
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-background text-foreground hover:border-border-strong hover:bg-surface-hover',
        'disabled:cursor-not-allowed disabled:opacity-40',
        disabled ? '' : 'cursor-pointer',
      ].join(' ')}
    >
      <p className="text-[14px] font-medium">{title}</p>
      <p className={['mt-1 text-[12px] leading-relaxed', selected ? 'text-background/75' : 'text-muted'].join(' ')}>
        {description}
      </p>
    </button>
  );
}

interface StoryRowProps {
  story: UserStory;
  epicTitle: string;
  estimation: StoryEstimation | undefined;
  estimationMode: EstimationMode;
  isAnalyzing: boolean;
  isApproved: boolean;
  onPointChange: (points: number) => void;
  onDurationChange: (label: string, minutes: number) => void;
  index: number;
}

function StoryRow({
  story,
  epicTitle,
  estimation,
  estimationMode,
  isAnalyzing,
  isApproved,
  onPointChange,
  onDurationChange,
  index,
}: StoryRowProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const points = estimation?.points ?? 0;
  const hasEstimate = isStoryEstimated(estimation, estimationMode);
  const disabled = !estimation || isApproved || isAnalyzing;
  const displayNumber = String(index + 1).padStart(2, '0');

  return (
    <article
      className={[
        'px-4 py-3.5 transition-colors md:px-5',
        index > 0 ? 'border-t border-border' : '',
        estimation?.isModified ? 'bg-surface-hover/30' : 'hover:bg-surface-hover/40',
      ].join(' ')}
    >
      <div className="flex flex-col gap-3.5 lg:flex-row lg:items-start lg:gap-6">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium tabular-nums text-subtle">
              {displayNumber}
            </span>
            <span className="font-mono text-[11px] text-subtle">{story.id}</span>
            {estimation?.isModified ? (
              <span className="text-[11px] text-subtle">· Ajustado</span>
            ) : null}
            <div className="ml-auto">
              <ViewDetailsButton onClick={() => setIsDetailOpen(true)} />
            </div>
          </div>
          <h5 className="text-[15px] font-medium leading-snug text-foreground">{story.title}</h5>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">
            {story.description}
          </p>
        </div>

        <div className="lg:w-65 shrink-0">
          <p className="mb-1.5 text-[11px] font-medium text-subtle">Razonamiento IA</p>
          <div className="min-h-12 rounded-lg border border-border bg-background px-3 py-2">
            {estimation?.justification ? (
              <p className="text-[12px] leading-relaxed text-muted">
                {estimation.justification}
              </p>
            ) : (
              <p className="text-[12px] text-subtle">
                {isAnalyzing ? 'Analizando complejidad…' : 'Pendiente de análisis'}
              </p>
            )}
          </div>
        </div>

        <div className="lg:w-50 shrink-0">
          {estimationMode === 'time' ? (
            <>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-subtle">Tiempo</p>
                {hasEstimate ? (
                  <span className="text-[12px] tabular-nums text-foreground">
                    {estimation?.durationLabel ?? formatDuration(estimation?.durationMinutes ?? 0)}
                  </span>
                ) : null}
              </div>
              <TimeDurationInput
                id={`duration-${story.id}`}
                value={estimation?.durationLabel ?? ''}
                disabled={disabled}
                onCommit={onDurationChange}
              />
            </>
          ) : (
            <>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-subtle">Story Points</p>
                {hasEstimate ? (
                  <span className="text-[12px] tabular-nums text-foreground">
                    {points} SP · {getPointLabel(points)}
                  </span>
                ) : null}
              </div>
              <FibonacciPicker
                value={hasEstimate ? points : 0}
                onChange={onPointChange}
                disabled={disabled}
              />
            </>
          )}
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
          estimationMode={estimationMode}
        />
      </DetailModal>
    </article>
  );
}

export function EstimationWorkspace({
  input,
  estimations,
  onEstimationsChange,
  estimationMode,
  onEstimationModeChange,
  status,
  onStatusChange,
  onApprove,
  isApprovable,
  isApproved,
  isApproving,
}: EstimationWorkspaceProps) {
  const { user } = useAuth();
  const { canRegenerate } = useWorkspace();
  const { entries, reset, consumeStream } = useAgentActivity();
  const { showModelReasoning } = useWorkspaceSettings();

  const isAnalyzing = status === 'estimating';
  const activityModalOpen = isAnalyzing && showModelReasoning;
  const modeLocked = isEstimationModeLocked({ estimations, status });
  const activeMode: EstimationMode = estimationMode ?? 'story_points';

  const allStories = useMemo(
    () => input.epics.flatMap((e) => e.userStories),
    [input.epics]
  );
  const totalStories = allStories.length;
  const totalEffort = useMemo(
    () =>
      allStories.reduce((sum, s) => {
        const est = estimations[s.id];
        if (activeMode === 'time') return sum + (est?.durationMinutes ?? 0);
        return sum + (est?.points ?? 0);
      }, 0),
    [allStories, estimations, activeMode]
  );
  const estimatedCount = useMemo(
    () => allStories.filter((s) => isStoryEstimated(estimations[s.id], activeMode)).length,
    [allStories, estimations, activeMode]
  );
  const hasEstimations = Object.keys(estimations).length > 0;
  const progressPct =
    totalStories > 0 ? Math.round((estimatedCount / totalStories) * 100) : 0;

  const handleAnalyzeWithAgent = useCallback(async () => {
    if (!input || !user || !estimationMode) return;

    onStatusChange('estimating');
    reset();

    try {
      const response = await authFetch('/api/agentes/3/estimate', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epics: input.epics,
          estimationMode,
          ...(hasEstimations ? { isRegeneration: true } : {}),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al obtener las estimaciones del Scrum Master');
      }

      const data = await consumeStream<Agent3EstimationResponse>(response);

      const aiResult: Record<string, StoryEstimation> = {};
      data.suggestions.forEach((sug) => {
        if (estimationMode === 'time') {
          aiResult[sug.storyId] = {
            points: 0,
            durationMinutes: sug.durationMinutes ?? 0,
            durationLabel: sug.suggestedDuration,
            justification: sug.justification,
            isModified: false,
          };
        } else {
          aiResult[sug.storyId] = {
            points: sug.suggestedPoints ?? 0,
            justification: sug.justification,
            isModified: false,
          };
        }
      });

      onEstimationsChange(aiResult);
      onStatusChange('review');
      notifySuccess(hasEstimations ? 'Estimaciones regeneradas' : 'Estimaciones listas');
    } catch (error) {
      console.error('Error en la conexión con el Agente 3:', error);
      onStatusChange('idle');
      notifyError(errorMessage(error, 'Error al procesar la estimación.'));
    }
  }, [
    input,
    user,
    estimationMode,
    consumeStream,
    reset,
    onEstimationsChange,
    onStatusChange,
    hasEstimations,
  ]);

  const handlePointChange = (storyId: string, newPoints: number) => {
    onEstimationsChange({
      ...estimations,
      [storyId]: {
        ...estimations[storyId],
        points: newPoints,
        durationMinutes: undefined,
        durationLabel: undefined,
        isModified: true,
      },
    });
  };

  const handleDurationChange = (storyId: string, label: string, minutes: number) => {
    onEstimationsChange({
      ...estimations,
      [storyId]: {
        ...estimations[storyId],
        points: 0,
        durationMinutes: minutes,
        durationLabel: label,
        isModified: true,
      },
    });
  };

  if (input.epics.length === 0) return null;

  const totalLabel = formatEffortTotal(totalEffort, activeMode);
  const analyzingTitle =
    estimationMode === 'time'
      ? hasEstimations
        ? 'Regenerando estimación...'
        : 'Estimando tiempo...'
      : hasEstimations
        ? 'Regenerando estimación...'
        : 'Estimando Story Points...';

  return (
    <section
      className="flex flex-col rounded-xl border border-border bg-surface animate-[fadeIn_0.3s_ease-out]"
      aria-labelledby="estimation-workspace-heading"
    >
      {showModelReasoning && (
        <AgentActivityModal
          open={activityModalOpen}
          isActive={isAnalyzing}
          title={analyzingTitle}
          description={
            hasEstimations
              ? estimationMode === 'time'
                ? 'El Scrum Master IA vuelve a calcular el tiempo de cada historia. Los valores anteriores serán reemplazados.'
                : 'El Scrum Master IA vuelve a calcular los Story Points de cada historia. Los valores anteriores serán reemplazados.'
              : estimationMode === 'time'
                ? 'El Scrum Master IA estima el tiempo calendario de cada historia de usuario del backlog.'
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

      <div className="flex flex-col gap-3 border-b border-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between md:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h3
              id="estimation-workspace-heading"
              className="text-[15px] font-semibold tracking-tight text-foreground"
            >
              Workspace de estimación
            </h3>
            <span className="text-[12px] tabular-nums text-subtle">{totalStories}</span>
          </div>
          <p className="mt-1 text-[12px] text-muted">
            {input.epics.length} épica{input.epics.length !== 1 ? 's' : ''} · {totalStories}{' '}
            historia{totalStories !== 1 ? 's' : ''}
            {estimationMode ? (
              <>
                {' '}
                · {estimationMode === 'time' ? 'Tiempo' : 'Story Points'}
              </>
            ) : null}
          </p>
        </div>

        {hasEstimations ? (
          <div className="flex items-center gap-4 sm:min-w-50">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="text-subtle">Progreso</span>
                <span className="tabular-nums text-foreground">
                  {estimatedCount}/{totalStories}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-foreground/70 transition-all duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums leading-none text-foreground">
                {totalLabel}
              </p>
              <p className="mt-0.5 text-[11px] text-subtle">
                {activeMode === 'time' ? 'Total' : 'SP total'}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {!hasEstimations && !isAnalyzing && !isApproved ? (
        <div className="flex flex-col items-center px-5 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-muted">
            <AnalyzeIcon className="h-6 w-6 text-muted" />
          </div>
          <h4 className="mt-5 text-[15px] font-semibold tracking-tight text-foreground">
            Elige cómo estimar
          </h4>
          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">
            Esta elección queda fija para el proyecto. Después no podrás cambiarla en el
            dashboard ni en Klark.
          </p>

          <div className="mt-6 grid w-full max-w-lg gap-2.5 sm:grid-cols-2">
            <ModeOptionCard
              selected={estimationMode === 'story_points'}
              disabled={modeLocked || isApproving}
              title="Story Points"
              description={`Escala Fibonacci ${FIBONACCI_SCALE.join(' · ')}`}
              onSelect={() => onEstimationModeChange('story_points')}
            />
            <ModeOptionCard
              selected={estimationMode === 'time'}
              disabled={modeLocked || isApproving}
              title="Tiempo"
              description={`Duración calendario: ${TIME_DURATION_EXAMPLES}`}
              onSelect={() => onEstimationModeChange('time')}
            />
          </div>

          <button
            type="button"
            onClick={handleAnalyzeWithAgent}
            disabled={isAnalyzing || isApproving || !estimationMode}
            className="mt-6 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <AnalyzeIcon className="h-4 w-4" />
            {estimationMode === 'time'
              ? 'Sugerir tiempos con IA'
              : 'Sugerir Story Points con IA'}
          </button>
          <p className="mt-3 text-[12px] text-subtle">
            {estimationMode === 'time'
              ? `1d = 24h calendario · ${TIME_DURATION_EXAMPLES}`
              : estimationMode === 'story_points'
                ? `Escala Fibonacci: ${FIBONACCI_SCALE.join(' · ')}`
                : 'Selecciona un modo para continuar'}
          </p>
        </div>
      ) : null}

      {isAnalyzing && !showModelReasoning ? (
        <div className="flex flex-col items-center px-5 py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-foreground" />
          <p className="mt-5 text-sm font-medium text-foreground">
            {hasEstimations
              ? 'Regenerando estimaciones…'
              : activeMode === 'time'
                ? 'Estimando tiempo del backlog…'
                : 'Analizando complejidad del backlog…'}
          </p>
          <p className="mt-1 text-[12px] text-muted">
            Evaluando {totalStories} historia{totalStories !== 1 ? 's' : ''} en{' '}
            {input.epics.length} épica{input.epics.length !== 1 ? 's' : ''}
          </p>
          <div className="mt-5 h-1 w-40 overflow-hidden rounded-full bg-border">
            <div className="h-full w-1/3 rounded-full bg-foreground/70" />
          </div>
        </div>
      ) : null}

      {(hasEstimations || isApproved) && (
        <div>
          {input.epics.map((epic, epicIdx) => {
            const epicStories = epic.userStories || [];
            const epicEstimated = epicStories.filter((s) =>
              isStoryEstimated(estimations[s.id], activeMode)
            ).length;
            const epicEffort = epicStories.reduce((sum, s) => {
              const est = estimations[s.id];
              if (activeMode === 'time') return sum + (est?.durationMinutes ?? 0);
              return sum + (est?.points ?? 0);
            }, 0);

            return (
              <div
                key={epic.id}
                className={epicIdx > 0 ? 'border-t border-border' : ''}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-medium tabular-nums text-subtle">
                        {String(epicIdx + 1).padStart(2, '0')}
                      </span>
                      <span className="font-mono text-[11px] text-subtle">{epic.id}</span>
                      <h4 className="text-[15px] font-medium tracking-tight text-foreground">
                        {epic.title}
                      </h4>
                    </div>
                    <p className="mt-0.5 text-[12px] text-muted">
                      {epicEstimated}/{epicStories.length} estimadas
                    </p>
                  </div>
                  {hasEstimations && epicStories.length > 0 ? (
                    <span className="text-[13px] tabular-nums text-foreground">
                      {formatEffortTotal(epicEffort, activeMode)}
                    </span>
                  ) : null}
                </div>

                {epicStories.length > 0 ? (
                  <div className="border-t border-border/70 bg-surface-muted/25">
                    {epicStories.map((story, storyIdx) => (
                      <StoryRow
                        key={story.id}
                        story={story}
                        epicTitle={epic.title}
                        estimation={estimations[story.id]}
                        estimationMode={activeMode}
                        isAnalyzing={isAnalyzing}
                        isApproved={isApproved}
                        onPointChange={(pts) => handlePointChange(story.id, pts)}
                        onDurationChange={(label, minutes) =>
                          handleDurationChange(story.id, label, minutes)
                        }
                        index={storyIdx}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="border-t border-border px-4 py-8 text-center text-sm text-muted md:px-5">
                    Esta épica no tiene historias de usuario.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {hasEstimations && !isApproved ? (
        <div className="border-t border-border px-4 py-3 md:px-5">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="hidden text-sm text-subtle sm:block">
              <span className="font-medium text-foreground">{estimatedCount}</span>/{totalStories}{' '}
              historias ·{' '}
              <span className="font-medium text-foreground">{totalLabel}</span>
              {!isApprovable ? (
                <span className="text-muted">
                  {' '}
                  · faltan {totalStories - estimatedCount}
                </span>
              ) : null}
            </p>

            <div className="flex w-full flex-col-reverse items-center gap-2.5 sm:w-auto sm:flex-row">
              <div className="flex w-full flex-col items-center gap-1.5 sm:w-auto sm:items-end">
                <button
                  type="button"
                  onClick={handleAnalyzeWithAgent}
                  disabled={
                    isAnalyzing ||
                    isApproving ||
                    !estimationMode ||
                    (hasEstimations && !canRegenerate('agent3'))
                  }
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  <RegenerateIcon className="h-4 w-4" />
                  Regenerar
                </button>
                {hasEstimations ? (
                  <RegenerationHint agent="agent3" className="text-center sm:text-right" />
                ) : null}
              </div>

              <ApproveButton
                onClick={onApprove}
                disabled={!isApprovable || isApproving || isAnalyzing}
                label={isApproving ? 'Consolidando…' : 'Consolidar backlog estimado'}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
