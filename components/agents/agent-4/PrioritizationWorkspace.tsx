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
  getFrameworkColors,
} from '@/lib/constants/agent-4';
import { ApproveButton } from '@/components/agents/shared/workflow/ApproveButton';
import { AgentActivityModal } from '@/components/agents/shared/activity-log/AgentActivityModal';
import { DetailModal } from '@/components/agents/shared/DetailModal';
import { ViewDetailsButton } from '@/components/agents/shared/ViewDetailsButton';
import { UserStoryDetailContent } from '@/components/agents/shared/UserStoryDetailContent';
import { useWorkspaceSettings } from '@/context/WorkspaceSettingsContext';
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
    const colors = getFrameworkColors(framework);
    const counts: Record<string, number> = {};
    for (const pri of Object.values(priorities)) {
      counts[pri.category] = (counts[pri.category] ?? 0) + 1;
    }
    const entries = Object.entries(counts)
      .filter(([, c]) => c > 0)
      .map(([cat, count]) => ({
        category: cat,
        count,
        label: labels[cat] ?? cat,
        color: colors[cat] ?? '',
      }));
    return entries;
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
}: PrioritizationStoryRowProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const hasCategory = pri?.category;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[1fr_200px_200px]">
        {/* Story info */}
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-md border border-border bg-surface-muted px-2 py-0.5 font-mono text-[10px] font-medium text-muted">
              {story.id}
            </span>
            <h5 className="truncate text-sm font-semibold text-foreground">
              {story.title}
            </h5>
            {pri?.isModified && (
              <span className="shrink-0 rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600">
                HITL
              </span>
            )}
            <ViewDetailsButton
              onClick={() => setIsDetailOpen(true)}
              className="ml-auto shrink-0"
            />
          </div>
          <p className="line-clamp-2 text-xs leading-relaxed text-muted">
            {story.description}
          </p>
          {est && (
            <p className="text-[10px] text-muted">
              Story Points: <span className="font-semibold text-foreground">{est.points}</span>
            </p>
          )}
        </div>

        {/* Justification */}
        <div className="rounded-lg border border-border/50 bg-surface-muted/40 p-3 min-h-[52px]">
          {pri?.justification ? (
            <p className="text-[11px] italic leading-relaxed text-muted">
              &ldquo;{pri.justification}&rdquo;
            </p>
          ) : (
            <p className="text-[11px] italic text-muted/50">
              {isAnalyzing ? 'Analizando...' : 'Esperando clasificación del agente...'}
            </p>
          )}
        </div>

        {/* Category selector */}
        <div className="flex flex-row items-center justify-between gap-3 lg:flex-col lg:items-end lg:justify-center">
          <div className="flex flex-wrap items-center gap-2">
            {hasCategory && (
              <CategoryBadge framework={framework} category={pri.category} />
            )}
            <CategorySelect
              framework={framework}
              value={pri?.category ?? ''}
              onChange={onCategoryChange}
              disabled={isApproved || isAnalyzing}
            />
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
          estimation={est}
          prioritization={pri}
          framework={framework}
        />
      </DetailModal>
    </>
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
      allStories.reduce(
        (sum, s) => sum + (input.estimations[s.id]?.points ?? 0),
        0
      ),
    [allStories, input.estimations]
  );
  const hasPriorities = Object.keys(priorities).length > 0;
  const showIdleStart = !hasPriorities && !isAnalyzing && !isApproved;
  const frameworkLabel = FRAMEWORK_DESCRIPTIONS[framework].label;
  const categoryDistribution = useCategoryDistribution(priorities, framework);

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
  }, [input, user, framework, consumeStream, reset, onPrioritiesChange, onStatusChange, onError]);

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

  const prioritizeButtonLabel = hasPriorities
    ? 'Regenerar Priorización'
    : `Sugerir Priorización ${frameworkLabel}`;

  if (input.epics.length === 0) return null;

  return (
    <div className="flex flex-col gap-8 animate-[fadeIn_0.3s_ease-out]">
      {showModelReasoning && (
        <AgentActivityModal
          open={activityModalOpen}
          isActive={isAnalyzing}
          title={hasPriorities ? `Regenerando priorización ${frameworkLabel}...` : `Priorizando backlog (${frameworkLabel})...`}
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

      {/* ════════════════════════════════════════════════
          ESTADO INICIAL — como Agente 2 / 3
         ════════════════════════════════════════════════ */}
      {showIdleStart && (
        <EmptyPrioritizationStartState
          framework={framework}
          onFrameworkChange={onFrameworkChange}
          onPrioritize={handlePrioritizeWithAgent}
          isPrioritizing={isAnalyzing}
          epicCount={input.epics.length}
          storyCount={totalStories}
          totalPoints={totalPoints}
        />
      )}

      {/* ════════════════════════════════════════════════
          DISTRIBUCIÓN POR CATEGORÍA
         ════════════════════════════════════════════════ */}
      {hasPriorities && categoryDistribution.length > 0 && (
        <div className="flex flex-wrap gap-2 animate-[fadeIn_0.4s_ease-out]">
          {categoryDistribution.map(({ category, count, label, color }) => (
            <span
              key={category}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${color}`}
            >
              {label}
              <span className="ml-0.5 rounded-full border border-current/20 bg-current/10 px-1.5 py-0 text-[10px] font-bold tabular-nums">
                {count}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          BARRA DE REVISIÓN (solo con prioridades)
         ════════════════════════════════════════════════ */}
      {hasPriorities && !isApproved && (
        <div className="relative overflow-hidden rounded-xl border border-border/80 bg-surface-muted/80 px-6 py-4">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-primary/5 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative z-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">
                {hasPriorities ? 'Revisión de prioridades' : 'Priorización pendiente'}
              </h3>
              <p className="mt-0.5 text-xs text-muted">
                {hasPriorities
                  ? `Revisa y ajusta las categorías ${frameworkLabel} sugeridas. Las historias modificadas se marcan como HITL.`
                  : 'Selecciona la metodología y presiona el botón para que el Product Owner IA clasifique el backlog.'}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <FrameworkSelector
                value={framework}
                onChange={onFrameworkChange}
                disabled={isAnalyzing || isApproving}
              />
              <button
                onClick={handlePrioritizeWithAgent}
                disabled={isAnalyzing || isApproving}
                className={[
                  'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold',
                  'transition-all duration-200 cursor-pointer',
                  isAnalyzing
                    ? 'bg-surface-hover text-muted-foreground border border-border'
                    : 'bg-primary text-white shadow-[0_2px_12px_color-mix(in_srgb,var(--primary)_30%,transparent)] hover:shadow-[0_4px_20px_color-mix(in_srgb,var(--primary)_40%,transparent)] hover:scale-[1.02] active:scale-95',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:scale-100',
                ].join(' ')}
              >
                {isAnalyzing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {hasPriorities ? `Regenerando ${frameworkLabel}...` : `Clasificando ${frameworkLabel}...`}
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      {hasPriorities ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                      )}
                    </svg>
                    {prioritizeButtonLabel}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          ANÁLISIS EN CURSO — OVERLAY SIMPLE
         ════════════════════════════════════════════════ */}
      {isAnalyzing && !showModelReasoning && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface-muted/60 px-6 py-14 animate-[fadeIn_0.25s_ease-out]">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-[3px] border-border border-t-primary" />
          <p className="text-sm font-semibold text-foreground">
            {hasPriorities ? 'Regenerando priorizaciones...' : 'Clasificando backlog...'}
          </p>
          <p className="mt-1.5 text-xs text-muted">
            El Product Owner IA está evaluando {totalStories} historia{totalStories !== 1 ? 's' : ''} con metodología {frameworkLabel}.
          </p>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          LISTA DE ÉPICAS CON PRIORIDADES
         ════════════════════════════════════════════════ */}
      {(hasPriorities || isApproved) && !isAnalyzing && (
      <div className="flex flex-col gap-6">
        {input.epics.map((epic, epicIdx) => {
          const epicStories = epic.userStories || [];
          const epicPrioritized = epicStories.filter(
            (s) => priorities[s.id]?.category
          ).length;

          return (
            <div
              key={epic.id}
              className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-md animate-[fadeIn_0.3s_ease-out]"
              style={{ animationDelay: `${epicIdx * 60}ms` }}
            >
              {/* Epic header */}
              <div className="border-b border-border bg-surface-muted/40 px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-[11px] font-bold text-muted">
                      {epicIdx + 1}
                    </span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                        Épica {epicIdx + 1}
                      </p>
                      <h4 className="mt-0.5 text-sm font-bold text-foreground">{epic.title}</h4>
                    </div>
                  </div>
                  {hasPriorities && (
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-[11px] text-muted">
                        {epicPrioritized}/{epicStories.length} historias
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stories */}
              {epicStories.length > 0 && (
                <div className="divide-y divide-border">
                  {epicStories.map((story) => (
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
                    />
                  ))}
                </div>
              )}

              {epicStories.length === 0 && (
                <div className="px-6 py-8 text-center text-sm text-muted">
                  Esta épica no tiene historias de usuario.
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {/* ════════════════════════════════════════════════
          STICKY ACTION BAR
         ════════════════════════════════════════════════ */}
      {hasPriorities && !isApproved && (
        <div className="sticky bottom-6 z-20 animate-[slideUpFade_0.4s_ease-out]">
          <div className="rounded-2xl border border-border/80 bg-surface-muted/80 backdrop-blur-xl px-6 py-4 shadow-[0_8px_32px_color-mix(in_srgb,var(--foreground)_8%,transparent)]">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="hidden sm:flex items-center gap-4 text-sm text-subtle">
                <span>
                  <span className="font-medium text-foreground">{prioritizedCount}</span>/{totalStories} historias
                </span>
                <span className="h-4 w-px bg-border" />
                <span className="text-muted">{input.epics.length} épicas</span>
                <span className="h-4 w-px bg-border" />
                <span className="text-muted">{frameworkLabel}</span>
              </div>

              <div className="flex w-full flex-col-reverse items-center gap-3 sm:w-auto sm:flex-row">
                <button
                  onClick={handlePrioritizeWithAgent}
                  disabled={isAnalyzing || isApproving}
                  className={[
                    'inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-5 py-3 sm:w-auto',
                    'text-sm font-medium text-muted',
                    'hover:border-border-strong hover:bg-surface-hover hover:text-foreground',
                    'transition-all duration-200 cursor-pointer',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                  ].join(' ')}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                  Regenerar
                </button>

                <ApproveButton
                  onClick={onApprove}
                  disabled={!isApprovable || isApproving || isAnalyzing}
                  label={isApproving ? 'Consolidando...' : 'Consolidar Backlog Priorizado'}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
