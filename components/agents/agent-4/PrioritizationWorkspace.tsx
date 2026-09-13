'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAgentActivity } from '@/hooks/useAgentActivity';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/lib/api-client';
import type { Agent4Input } from '@/lib/types/workspace';
import type { UserStory } from '@/lib/types/agent-2';
import type { EstimationMode, StoryEstimation } from '@/lib/types/agent-3';
import type {
  Agent4PrioritizationResponse,
  Agent4Status,
  FrameworkCategory,
  StoryPrioritization,
} from '@/lib/types/agent-4';
import {
  FRAMEWORK_DESCRIPTIONS,
  getFrameworkCategories,
  getFrameworkLabels,
  getFrameworkShortLabels,
} from '@/lib/constants/agent-4';
import { ApproveButton } from '@/components/agents/shared/workflow/ApproveButton';
import { AgentActivityModal } from '@/components/agents/shared/activity-log/AgentActivityModal';
import { DetailModal } from '@/components/agents/shared/DetailModal';
import { UserStoryDetailContent } from '@/components/agents/shared/UserStoryDetailContent';
import { useWorkspaceSettings } from '@/context/WorkspaceSettingsContext';
import { useWorkspace } from '@/hooks/useWorkspace';
import { RegenerationHint } from '@/components/agents/shared/RegenerationHint';
import { formatEffortTotal, formatEstimation, getEffortValue } from '@/lib/utils/estimation';
import { FrameworkSelector } from './FrameworkSelector';
import { EmptyPrioritizationStartState } from './EmptyPrioritizationStartState';
import type { PrioritizationFramework } from '@/lib/types/agent-4';

interface PrioritizationWorkspaceProps {
  input: Agent4Input;
  priorities: Record<string, StoryPrioritization>;
  framework: PrioritizationFramework;
  onPrioritiesChange: (priorities: Record<string, StoryPrioritization>) => void;
  onFrameworkChange: (framework: PrioritizationFramework) => void;
  status: Agent4Status;
  onStatusChange: (status: Agent4Status) => void;
  onApprove: () => void;
  isApprovable: boolean;
  isApproved: boolean;
  isApproving: boolean;
  onError?: (message: string) => void;
}

function formatCategorySummary(
  stories: UserStory[],
  priorities: Record<string, StoryPrioritization>,
  framework: PrioritizationFramework
): string | null {
  const labels = getFrameworkShortLabels(framework);
  const counts: Record<string, number> = {};
  for (const story of stories) {
    const cat = priorities[story.id]?.category;
    if (!cat) continue;
    counts[cat] = (counts[cat] ?? 0) + 1;
  }
  const parts = getFrameworkCategories(framework)
    .filter((cat) => (counts[cat] ?? 0) > 0)
    .map((cat) => `${counts[cat]} ${labels[cat] ?? cat}`);
  return parts.length > 0 ? parts.join(' · ') : null;
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

interface CategoryPickerProps {
  framework: PrioritizationFramework;
  value: FrameworkCategory | '';
  onChange: (category: FrameworkCategory) => void;
  disabled: boolean;
}

function CategoryPicker({ framework, value, onChange, disabled }: CategoryPickerProps) {
  const categories = getFrameworkCategories(framework);
  const shortLabels = getFrameworkShortLabels(framework);
  const labels = getFrameworkLabels(framework);

  return (
    <div className="flex flex-wrap gap-0.5" role="group" aria-label="Seleccionar prioridad">
      {categories.map((cat) => {
        const isSelected = value === cat;
        return (
          <button
            key={cat}
            type="button"
            disabled={disabled}
            onClick={() => onChange(cat as FrameworkCategory)}
            className={[
              'flex h-7 items-center justify-center rounded-md px-2 text-[12px] font-medium transition-colors',
              isSelected
                ? 'bg-foreground text-background'
                : 'text-muted hover:bg-surface-hover hover:text-foreground',
              'cursor-pointer disabled:cursor-not-allowed disabled:opacity-40',
            ].join(' ')}
            aria-pressed={isSelected}
            aria-label={labels[cat] ?? cat}
          >
            {shortLabels[cat] ?? cat}
          </button>
        );
      })}
    </div>
  );
}

interface PrioritizationStoryRowProps {
  story: UserStory;
  epicTitle: string;
  pri: StoryPrioritization | undefined;
  est: StoryEstimation | undefined;
  estimationMode: EstimationMode;
  framework: PrioritizationFramework;
  isAnalyzing: boolean;
  isApproved: boolean;
  onCategoryChange: (category: FrameworkCategory) => void;
  index: number;
}

function PrioritizationStoryRow({
  story,
  epicTitle,
  pri,
  est,
  estimationMode,
  framework,
  isAnalyzing,
  isApproved,
  onCategoryChange,
  index,
}: PrioritizationStoryRowProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const hasCategory = Boolean(pri?.category);
  const shortLabels = getFrameworkShortLabels(framework);
  const categoryLabel = hasCategory && pri ? (shortLabels[pri.category] ?? pri.category) : null;

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
            {pri?.justification ? (
              <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-subtle">
                {pri.justification}
              </p>
            ) : isAnalyzing ? (
              <p className="mt-1 text-[12px] text-subtle">Analizando prioridad…</p>
            ) : null}
            {est || pri?.isModified ? (
              <p className="mt-1 text-[11px] text-subtle">
                {est ? formatEstimation(est, estimationMode) : null}
                {est && pri?.isModified ? ' · ' : null}
                {pri?.isModified ? 'Ajustado' : null}
              </p>
            ) : null}
            <div className="mt-1.5 sm:hidden">{viewButton}</div>
          </div>

          <div className="hidden sm:flex sm:opacity-0 sm:transition-opacity sm:group-hover/story:opacity-100 sm:focus-within:opacity-100">
            {viewButton}
          </div>
        </div>

        <div className="shrink-0 pl-8 lg:pl-0 lg:pt-0.5">
          {categoryLabel ? (
            <p className="mb-1.5 text-[12px] font-medium text-foreground">{categoryLabel}</p>
          ) : null}
          <CategoryPicker
            framework={framework}
            value={pri?.category ?? ''}
            onChange={onCategoryChange}
            disabled={isApproved || isAnalyzing}
          />
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
          estimation={est}
          estimationMode={estimationMode}
          prioritization={pri}
          framework={framework}
        />
      </DetailModal>
    </article>
  );
}

export function PrioritizationWorkspace({
  input,
  priorities,
  framework,
  onPrioritiesChange,
  onFrameworkChange,
  status,
  onStatusChange,
  onApprove,
  isApprovable,
  isApproved,
  isApproving,
  onError,
}: PrioritizationWorkspaceProps) {
  const { user } = useAuth();
  const { canRegenerate } = useWorkspace();
  const { entries, reset, consumeStream } = useAgentActivity();
  const { showModelReasoning } = useWorkspaceSettings();

  const isAnalyzing = status === 'prioritizing';
  const activityModalOpen = isAnalyzing && showModelReasoning;

  const allStories = useMemo(
    () => input.epics.flatMap((e) => e.userStories),
    [input.epics]
  );
  const totalStories = allStories.length;
  const prioritizedCount = useMemo(
    () => allStories.filter((s) => priorities[s.id]?.category).length,
    [allStories, priorities]
  );
  const estimationMode = input.estimationMode ?? 'story_points';
  const totalEffort = useMemo(
    () =>
      allStories.reduce(
        (sum, s) => sum + getEffortValue(input.estimations[s.id], estimationMode),
        0
      ),
    [allStories, input.estimations, estimationMode]
  );
  const effortLabel = formatEffortTotal(totalEffort, estimationMode);
  const hasPriorities = Object.keys(priorities).length > 0;
  const frameworkLabel = FRAMEWORK_DESCRIPTIONS[framework].label;
  const categorySummary = formatCategorySummary(allStories, priorities, framework);

  const handlePrioritizeWithAgent = useCallback(async () => {
    if (!input || !user) return;

    onStatusChange('prioritizing');
    reset();

    try {
      const response = await authFetch('/api/agentes/4/prioritize', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epics: input.epics,
          estimations: input.estimations,
          estimationMode: input.estimationMode ?? 'story_points',
          framework,
          ...(hasPriorities ? { isRegeneration: true } : {}),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || 'Error al obtener las priorizaciones del Product Owner'
        );
      }

      const data = await consumeStream<Agent4PrioritizationResponse>(response);

      const aiResult: Record<string, StoryPrioritization> = {};
      data.suggestions.forEach((sug) => {
        aiResult[sug.storyId] = {
          category: sug.suggestedCategory,
          justification: sug.justification,
          isModified: false,
        };
      });

      onPrioritiesChange(aiResult);
      onStatusChange('review');
    } catch (error) {
      console.error('Error en la conexión con el Agente 4:', error);
      onStatusChange('idle');
      const message =
        error instanceof Error ? error.message : 'Error al procesar la priorización.';
      onError?.(message);
    }
  }, [
    input,
    user,
    framework,
    hasPriorities,
    consumeStream,
    reset,
    onPrioritiesChange,
    onStatusChange,
    onError,
  ]);

  const handleCategoryChange = (storyId: string, category: FrameworkCategory) => {
    onPrioritiesChange({
      ...priorities,
      [storyId]: {
        ...priorities[storyId],
        category,
        isModified: true,
      },
    });
  };

  if (input.epics.length === 0) return null;

  const activityModal = showModelReasoning ? (
    <AgentActivityModal
      open={activityModalOpen}
      isActive={isAnalyzing}
      title={
        hasPriorities
          ? `Regenerando priorización ${frameworkLabel}...`
          : `Priorizando backlog (${frameworkLabel})...`
      }
      description={
        hasPriorities
          ? `El Product Owner IA vuelve a clasificar las historias en categorías ${frameworkLabel}. Los valores anteriores serán reemplazados.`
          : `El Product Owner IA analiza y clasifica el backlog usando la metodología ${frameworkLabel}.`
      }
      meta={`${input.epics.length} épica${input.epics.length !== 1 ? 's' : ''} · ${totalStories} historias`}
      entries={entries}
    />
  ) : null;

  const analyzingSpinner =
    isAnalyzing && !showModelReasoning ? (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-medium text-foreground">
            {hasPriorities ? 'Regenerando priorizaciones…' : 'Clasificando backlog…'}
          </p>
          <p className="text-[13px] text-muted">
            Evaluando {totalStories} historia{totalStories !== 1 ? 's' : ''} con {frameworkLabel}
          </p>
        </div>
        <div className="h-1 w-40 overflow-hidden rounded-full bg-border">
          <div className="h-full w-1/3 rounded-full bg-foreground/70" />
        </div>
      </div>
    ) : null;

  if (!hasPriorities && !isApproved) {
    return (
      <>
        {activityModal}
        {analyzingSpinner}
        {!isAnalyzing ? (
          <EmptyPrioritizationStartState
            framework={framework}
            onFrameworkChange={onFrameworkChange}
            onPrioritize={handlePrioritizeWithAgent}
            isPrioritizing={isAnalyzing}
            epicCount={input.epics.length}
            storyCount={totalStories}
            effortLabel={effortLabel}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      {activityModal}
      <section
        className="flex flex-col rounded-xl bg-surface animate-[fadeIn_0.3s_ease-out]"
        aria-labelledby="prioritization-workspace-heading"
      >
        <div className="flex flex-col gap-2.5 border-b border-border/60 px-4 py-3 md:px-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-baseline gap-2">
            <h3
              id="prioritization-workspace-heading"
              className="text-[15px] font-semibold tracking-tight text-foreground"
            >
              Prioridades
            </h3>
            <span className="text-[12px] tabular-nums text-subtle">{totalStories}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {hasPriorities && !isApproved ? (
              <FrameworkSelector
                value={framework}
                onChange={onFrameworkChange}
                disabled={isAnalyzing || isApproving}
                hideLabel
                size="compact"
              />
            ) : null}
            {hasPriorities ? (
              <p className="shrink-0 text-[12px] tabular-nums text-muted">
                <span className="text-foreground">{prioritizedCount}</span>/{totalStories}
                {categorySummary ? (
                  <>
                    {' · '}
                    <span className="font-medium text-foreground">{categorySummary}</span>
                  </>
                ) : (
                  <>
                    {' · '}
                    <span className="font-medium text-foreground">{frameworkLabel}</span>
                  </>
                )}
              </p>
            ) : null}
          </div>
        </div>

        {analyzingSpinner}

        {(hasPriorities || isApproved) && !isAnalyzing ? (
          <div>
            {input.epics.map((epic, epicIdx) => {
              const epicStories = epic.userStories || [];
              const epicPrioritized = epicStories.filter(
                (s) => priorities[s.id]?.category
              ).length;
              const epicSummary = formatCategorySummary(
                epicStories,
                priorities,
                framework
              );

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
                        {epicPrioritized}/{epicStories.length} priorizada
                        {epicStories.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {epicSummary ? (
                      <span className="shrink-0 pt-0.5 text-[13px] font-medium text-foreground">
                        {epicSummary}
                      </span>
                    ) : null}
                  </div>

                  {epicStories.length > 0 ? (
                    <div className="mb-3 ml-8 md:ml-11">
                      {epicStories.map((story, storyIdx) => (
                        <PrioritizationStoryRow
                          key={story.id}
                          story={story}
                          epicTitle={epic.title}
                          pri={priorities[story.id]}
                          est={input.estimations[story.id]}
                          estimationMode={estimationMode}
                          framework={framework}
                          isAnalyzing={isAnalyzing}
                          isApproved={isApproved}
                          onCategoryChange={(cat) => handleCategoryChange(story.id, cat)}
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
        ) : null}

        {hasPriorities && !isApproved ? (
          <div className="flex flex-col items-stretch justify-between gap-3 border-t border-border/60 px-4 py-3 md:px-5 sm:flex-row sm:items-center">
            {isApprovable ? (
              <p className="text-[13px] text-subtle">
                Revisa las prioridades antes de consolidar el backlog.
              </p>
            ) : (
              <p className="text-[13px] text-subtle">
                <span className="tabular-nums text-foreground">{prioritizedCount}</span>
                /{totalStories} historias · {frameworkLabel}
                {' · '}
                faltan {totalStories - prioritizedCount}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
                <button
                  type="button"
                  onClick={handlePrioritizeWithAgent}
                  disabled={
                    isAnalyzing ||
                    isApproving ||
                    (hasPriorities && !canRegenerate('agent4'))
                  }
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-surface-muted px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Regenerar
                </button>
                {hasPriorities ? (
                  <RegenerationHint agent="agent4" className="text-center sm:text-right" />
                ) : null}
              </div>

              <ApproveButton
                onClick={onApprove}
                disabled={!isApprovable || isApproving || isAnalyzing}
                label={isApproving ? 'Consolidando…' : 'Consolidar backlog priorizado'}
              />
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
