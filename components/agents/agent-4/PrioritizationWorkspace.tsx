'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAgentActivity } from '@/hooks/useAgentActivity';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/lib/api-client';
import type { Agent4Input } from '@/lib/types/workspace';
import type { UserStory } from '@/lib/types/agent-2';
import type { StoryEstimation } from '@/lib/types/agent-3';
import type {
  Agent4PrioritizationResponse,
  Agent4Status,
  FrameworkCategory,
  StoryPrioritization,
} from '@/lib/types/agent-4';
import {
  FRAMEWORK_DESCRIPTIONS,
  getFrameworkShortLabels,
} from '@/lib/constants/agent-4';
import { ApproveButton } from '@/components/agents/shared/workflow/ApproveButton';
import { AgentActivityModal } from '@/components/agents/shared/activity-log/AgentActivityModal';
import { DetailModal } from '@/components/agents/shared/DetailModal';
import { ViewDetailsButton } from '@/components/agents/shared/ViewDetailsButton';
import { UserStoryDetailContent } from '@/components/agents/shared/UserStoryDetailContent';
import { useWorkspaceSettings } from '@/context/WorkspaceSettingsContext';
import { useWorkspace } from '@/hooks/useWorkspace';
import { RegenerationHint } from '@/components/agents/shared/RegenerationHint';
import { CategorySelect, CategoryBadge } from './CategorySelect';
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

function useCategoryDistribution(
  priorities: Record<string, StoryPrioritization>,
  framework: PrioritizationFramework
) {
  return useMemo(() => {
    const labels = getFrameworkShortLabels(framework);
    const counts: Record<string, number> = {};
    for (const pri of Object.values(priorities)) {
      counts[pri.category] = (counts[pri.category] ?? 0) + 1;
    }
    return Object.entries(counts)
      .filter(([, c]) => c > 0)
      .map(([cat, count]) => ({
        category: cat,
        count,
        label: labels[cat] ?? cat,
      }));
  }, [priorities, framework]);
}

interface PrioritizationStoryRowProps {
  story: UserStory;
  epicTitle: string;
  pri: StoryPrioritization | undefined;
  est: StoryEstimation | undefined;
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
  framework,
  isAnalyzing,
  isApproved,
  onCategoryChange,
  index,
}: PrioritizationStoryRowProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const hasCategory = Boolean(pri?.category);
  const displayNumber = String(index + 1).padStart(2, '0');

  return (
    <article
      className={[
        'px-4 py-3.5 transition-colors md:px-5',
        index > 0 ? 'border-t border-border' : '',
        pri?.isModified ? 'bg-surface-hover/30' : 'hover:bg-surface-hover/40',
      ].join(' ')}
    >
      <div className="flex flex-col gap-3.5 lg:flex-row lg:items-start lg:gap-6">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium tabular-nums text-subtle">
              {displayNumber}
            </span>
            <span className="font-mono text-[11px] text-subtle">{story.id}</span>
            {pri?.isModified ? (
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
          {est ? (
            <p className="mt-1.5 text-[12px] tabular-nums text-subtle">{est.points} SP</p>
          ) : null}
        </div>

        <div className="lg:w-60 shrink-0">
          <p className="mb-1.5 text-[11px] font-medium text-subtle">Razonamiento IA</p>
          <div className="min-h-12 rounded-lg border border-border bg-background px-3 py-2">
            {pri?.justification ? (
              <p className="text-[12px] leading-relaxed text-muted">{pri.justification}</p>
            ) : (
              <p className="text-[12px] text-subtle">
                {isAnalyzing ? 'Analizando…' : 'Pendiente de clasificación'}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:w-50 lg:justify-end">
          {hasCategory && pri ? (
            <CategoryBadge framework={framework} category={pri.category} />
          ) : null}
          <CategorySelect
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
  const totalPoints = useMemo(
    () =>
      allStories.reduce((sum, s) => sum + (input.estimations[s.id]?.points ?? 0), 0),
    [allStories, input.estimations]
  );
  const hasPriorities = Object.keys(priorities).length > 0;
  const showIdleStart = !hasPriorities && !isAnalyzing && !isApproved;
  const frameworkLabel = FRAMEWORK_DESCRIPTIONS[framework].label;
  const categoryDistribution = useCategoryDistribution(priorities, framework);
  const progressPct =
    totalStories > 0 ? Math.round((prioritizedCount / totalStories) * 100) : 0;

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

  if (showIdleStart) {
    return (
      <>
        {showModelReasoning && (
          <AgentActivityModal
            open={activityModalOpen}
            isActive={isAnalyzing}
            title={`Priorizando backlog (${frameworkLabel})...`}
            description={`El Product Owner IA analiza y clasifica el backlog usando la metodología ${frameworkLabel}.`}
            meta={`${input.epics.length} épica${input.epics.length !== 1 ? 's' : ''} · ${totalStories} historias`}
            entries={entries}
          />
        )}
        <EmptyPrioritizationStartState
          framework={framework}
          onFrameworkChange={onFrameworkChange}
          onPrioritize={handlePrioritizeWithAgent}
          isPrioritizing={isAnalyzing}
          epicCount={input.epics.length}
          storyCount={totalStories}
          totalPoints={totalPoints}
        />
      </>
    );
  }

  return (
    <section
      className="flex flex-col rounded-xl border border-border bg-surface animate-[fadeIn_0.3s_ease-out]"
      aria-labelledby="prioritization-workspace-heading"
    >
      {showModelReasoning && (
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
              id="prioritization-workspace-heading"
              className="text-[15px] font-semibold tracking-tight text-foreground"
            >
              Workspace de priorización
            </h3>
            <span className="text-[12px] tabular-nums text-subtle">{totalStories}</span>
          </div>
          <p className="mt-1 text-[12px] text-muted">
            {frameworkLabel} · {input.epics.length} épica
            {input.epics.length !== 1 ? 's' : ''} · {totalStories} historia
            {totalStories !== 1 ? 's' : ''}
          </p>
        </div>

        {hasPriorities ? (
          <div className="flex items-center gap-4 sm:min-w-50">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="text-subtle">Progreso</span>
                <span className="tabular-nums text-foreground">
                  {prioritizedCount}/{totalStories}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-foreground/70 transition-all duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {hasPriorities && categoryDistribution.length > 0 ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1 border-b border-border px-4 py-2.5 md:px-5">
          {categoryDistribution.map(({ category, count, label }) => (
            <span key={category} className="text-[12px] text-subtle">
              <span className="font-medium text-foreground">{count}</span> {label}
            </span>
          ))}
        </div>
      ) : null}

      {hasPriorities && !isApproved ? (
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3.5 sm:flex-row sm:items-end sm:justify-between md:px-5">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-foreground">Revisión de prioridades</p>
            <p className="mt-0.5 text-[12px] text-muted">
              Ajusta las categorías {frameworkLabel} sugeridas cuando haga falta.
            </p>
          </div>
          <FrameworkSelector
            value={framework}
            onChange={onFrameworkChange}
            disabled={isAnalyzing || isApproving}
          />
        </div>
      ) : null}

      {isAnalyzing && !showModelReasoning ? (
        <div className="flex flex-col items-center px-5 py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-foreground" />
          <p className="mt-5 text-sm font-medium text-foreground">
            {hasPriorities ? 'Regenerando priorizaciones…' : 'Clasificando backlog…'}
          </p>
          <p className="mt-1 text-[12px] text-muted">
            Evaluando {totalStories} historia{totalStories !== 1 ? 's' : ''} con {frameworkLabel}
          </p>
        </div>
      ) : null}

      {(hasPriorities || isApproved) && !isAnalyzing ? (
        <div>
          {input.epics.map((epic, epicIdx) => {
            const epicStories = epic.userStories || [];
            const epicPrioritized = epicStories.filter(
              (s) => priorities[s.id]?.category
            ).length;

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
                      {epicPrioritized}/{epicStories.length} priorizadas
                    </p>
                  </div>
                </div>

                {epicStories.length > 0 ? (
                  <div className="border-t border-border/70 bg-surface-muted/25">
                    {epicStories.map((story, storyIdx) => (
                      <PrioritizationStoryRow
                        key={story.id}
                        story={story}
                        epicTitle={epic.title}
                        pri={priorities[story.id]}
                        est={input.estimations[story.id]}
                        framework={framework}
                        isAnalyzing={isAnalyzing}
                        isApproved={isApproved}
                        onCategoryChange={(cat) => handleCategoryChange(story.id, cat)}
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
      ) : null}

      {hasPriorities && !isApproved ? (
        <div className="border-t border-border px-4 py-3 md:px-5">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="hidden text-sm text-subtle sm:block">
              <span className="font-medium text-foreground">{prioritizedCount}</span>/
              {totalStories} historias · {frameworkLabel}
            </p>

            <div className="flex w-full flex-col-reverse items-center gap-2.5 sm:w-auto sm:flex-row">
              <div className="flex w-full flex-col items-center gap-1.5 sm:w-auto sm:items-end">
                <button
                  type="button"
                  onClick={handlePrioritizeWithAgent}
                  disabled={
                    isAnalyzing ||
                    isApproving ||
                    (hasPriorities && !canRegenerate('agent4'))
                  }
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  <svg
                    className="h-4 w-4"
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
        </div>
      ) : null}
    </section>
  );
}
