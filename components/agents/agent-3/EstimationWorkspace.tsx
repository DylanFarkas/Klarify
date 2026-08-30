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

interface FibonacciPickerProps {
  value: number;
  onChange: (points: number) => void;
  disabled: boolean;
}

function FibonacciPicker({ value, onChange, disabled }: FibonacciPickerProps) {
  return (
    <div className="flex flex-wrap gap-0.5" role="group" aria-label="Seleccionar Story Points">
      {FIBONACCI_SCALE.map((num) => {
        const isSelected = value === num;
        return (
          <button
            key={num}
            type="button"
            disabled={disabled}
            onClick={() => onChange(num)}
            className={[
              'flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-[12px] font-medium tabular-nums transition-colors',
              isSelected
                ? 'bg-foreground text-background'
                : 'text-muted hover:bg-surface-hover hover:text-foreground',
              'cursor-pointer disabled:cursor-not-allowed disabled:opacity-40',
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

const iconBtnClass =
  'inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground';

function EyeIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

const selectedModeBtn =
  'inline-flex cursor-pointer items-center justify-center rounded-lg bg-elevated px-4 py-2 text-sm font-medium text-foreground';
const secondaryBtn =
  'inline-flex cursor-pointer items-center justify-center rounded-lg bg-surface-muted px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground';

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

  const estimateControl =
    estimationMode === 'time' ? (
      <div className="lg:w-44">
        {hasEstimate ? (
          <p className="mb-1.5 text-[12px] font-medium tabular-nums text-foreground">
            {estimation?.durationLabel ?? formatDuration(estimation?.durationMinutes ?? 0)}
          </p>
        ) : null}
        <TimeDurationInput
          id={`duration-${story.id}`}
          value={estimation?.durationLabel ?? ''}
          disabled={disabled}
          onCommit={onDurationChange}
        />
      </div>
    ) : (
      <div>
        {hasEstimate ? (
          <p className="mb-1.5 text-[12px] font-medium tabular-nums text-foreground">
            {points} SP · {getPointLabel(points)}
          </p>
        ) : null}
        <FibonacciPicker
          value={hasEstimate ? points : 0}
          onChange={onPointChange}
          disabled={disabled}
        />
      </div>
    );

  const viewButton = (
    <button
      type="button"
      onClick={() => setIsDetailOpen(true)}
      className={iconBtnClass}
      title="Ver"
      aria-label="Ver historia"
    >
      <EyeIcon />
    </button>
  );

  return (
    <article className="group/story relative px-3 py-2.5 transition-colors hover:bg-surface-hover/30">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        <div className="grid min-w-0 flex-1 grid-cols-[1.25rem_minmax(0,1fr)_auto] items-start gap-x-2.5">
          <span className="mt-px text-[12px] tabular-nums text-subtle">{index + 1}</span>

          <div className="min-w-0">
            <p className="text-[13px] font-medium leading-snug text-foreground">{story.title}</p>
            {story.description ? (
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{story.description}</p>
            ) : null}
            {estimation?.justification ? (
              <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-subtle">
                {estimation.justification}
              </p>
            ) : isAnalyzing ? (
              <p className="mt-1 text-[12px] text-subtle">Analizando complejidad…</p>
            ) : null}
            {estimation?.isModified ? (
              <p className="mt-1 text-[11px] text-subtle">Ajustado</p>
            ) : null}

            <div className="mt-1.5 sm:hidden">{viewButton}</div>
          </div>

          <div className="hidden sm:flex sm:opacity-0 sm:transition-opacity sm:group-hover/story:opacity-100 sm:focus-within:opacity-100">
            {viewButton}
          </div>
        </div>

        <div className="shrink-0 pl-8 lg:pl-0 lg:pt-0.5">{estimateControl}</div>
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

  const activityModal = showModelReasoning ? (
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
  ) : null;

  const analyzingSpinner = isAnalyzing && !showModelReasoning ? (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-medium text-foreground">
          {hasEstimations
            ? 'Regenerando estimaciones…'
            : activeMode === 'time'
              ? 'Estimando tiempo del backlog…'
              : 'Analizando complejidad del backlog…'}
        </p>
        <p className="text-[13px] text-muted">
          Evaluando {totalStories} historia{totalStories !== 1 ? 's' : ''} en{' '}
          {input.epics.length} épica{input.epics.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-border">
        <div className="h-full w-1/3 rounded-full bg-foreground/70" />
      </div>
    </div>
  ) : null;

  if (!hasEstimations && !isApproved) {
    return (
      <>
        {activityModal}
        {analyzingSpinner}
        {!isAnalyzing ? (
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
                  d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
                />
              </svg>
            </div>

            <h3 className="mt-5 text-[15px] font-semibold tracking-tight text-foreground">
              Elige cómo estimar
            </h3>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">
              Esta elección queda fija para el proyecto. Después no podrás cambiarla en el
              dashboard ni en Klark.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                disabled={modeLocked || isApproving}
                onClick={() => onEstimationModeChange('story_points')}
                aria-pressed={estimationMode === 'story_points'}
                aria-label={`Story Points. Escala Fibonacci ${FIBONACCI_SCALE.join(' · ')}`}
                className={[
                  estimationMode === 'story_points' ? selectedModeBtn : secondaryBtn,
                  modeLocked || isApproving ? 'cursor-not-allowed opacity-40' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                Story Points
              </button>
              <button
                type="button"
                disabled={modeLocked || isApproving}
                onClick={() => onEstimationModeChange('time')}
                aria-pressed={estimationMode === 'time'}
                aria-label={`Tiempo. Duración calendario: ${TIME_DURATION_EXAMPLES}`}
                className={[
                  estimationMode === 'time' ? selectedModeBtn : secondaryBtn,
                  modeLocked || isApproving ? 'cursor-not-allowed opacity-40' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                Tiempo
              </button>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleAnalyzeWithAgent}
                disabled={isAnalyzing || isApproving || !estimationMode}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <AnalyzeIcon className="h-4 w-4" />
                {estimationMode === 'time'
                  ? 'Sugerir tiempos con IA'
                  : 'Sugerir Story Points con IA'}
              </button>
            </div>

            <p className="mt-4 text-[12px] text-subtle">
              <span className="tabular-nums">{input.epics.length}</span>
              {' '}
              {input.epics.length === 1 ? 'épica' : 'épicas'}
              {' · '}
              <span className="tabular-nums">{totalStories}</span>
              {' '}
              {totalStories === 1 ? 'historia' : 'historias'}
              {estimationMode === 'time'
                ? ` · 1d = 24h calendario · ${TIME_DURATION_EXAMPLES}`
                : estimationMode === 'story_points'
                  ? ` · Escala Fibonacci ${FIBONACCI_SCALE.join(' · ')}`
                  : ' · Selecciona un modo para continuar'}
            </p>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      {activityModal}
      {analyzingSpinner}
      <section
        className="flex flex-col rounded-xl bg-surface animate-[fadeIn_0.3s_ease-out]"
        aria-labelledby="estimation-workspace-heading"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 md:px-5">
          <div className="flex min-w-0 items-baseline gap-2">
            <h3
              id="estimation-workspace-heading"
              className="text-[15px] font-semibold tracking-tight text-foreground"
            >
              Estimaciones
            </h3>
            <span className="text-[12px] tabular-nums text-subtle">{totalStories}</span>
          </div>
          {hasEstimations ? (
            <p className="shrink-0 text-[12px] tabular-nums text-muted">
              <span className="text-foreground">{estimatedCount}</span>/{totalStories}
              {' · '}
              <span className="font-medium text-foreground">{totalLabel}</span>
            </p>
          ) : null}
        </div>

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
                <article
                  key={epic.id}
                  className={epicIdx > 0 ? 'border-t border-border/60' : ''}
                >
                  <div className="flex items-start justify-between gap-3 px-4 py-3.5 md:px-5">
                    <div className="min-w-0">
                      <h4 className="text-[15px] font-semibold leading-snug tracking-tight text-foreground">
                        {epic.title}
                      </h4>
                      {epic.description ? (
                        <p className="mt-1 text-[13px] leading-relaxed text-muted">
                          {epic.description}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[12px] text-subtle">
                        {epicEstimated}/{epicStories.length} estimada
                        {epicStories.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {hasEstimations && epicStories.length > 0 ? (
                      <span className="shrink-0 pt-0.5 text-[13px] font-medium tabular-nums text-foreground">
                        {formatEffortTotal(epicEffort, activeMode)}
                      </span>
                    ) : null}
                  </div>

                  {epicStories.length > 0 ? (
                    <div className="mb-3 ml-8 md:ml-11">
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
                    <p className="mb-3 ml-8 px-3 py-2 text-[13px] text-muted md:ml-11">
                      Esta épica no tiene historias de usuario.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {hasEstimations && !isApproved ? (
          <div className="flex flex-col items-stretch justify-between gap-3 border-t border-border/60 px-4 py-3 md:px-5 sm:flex-row sm:items-center">
            {isApprovable ? (
              <p className="text-[13px] text-subtle">
                Revisa las estimaciones antes de continuar a la priorización.
              </p>
            ) : (
              <p className="text-[13px] text-subtle">
                <span className="tabular-nums text-foreground">{estimatedCount}</span>
                /{totalStories} historias ·{' '}
                <span className="tabular-nums text-foreground">{totalLabel}</span>
                {' · '}
                faltan {totalStories - estimatedCount}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
                <button
                  type="button"
                  onClick={handleAnalyzeWithAgent}
                  disabled={
                    isAnalyzing ||
                    isApproving ||
                    !estimationMode ||
                    (hasEstimations && !canRegenerate('agent3'))
                  }
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-surface-muted px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
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
        ) : null}
      </section>
    </>
  );
}
