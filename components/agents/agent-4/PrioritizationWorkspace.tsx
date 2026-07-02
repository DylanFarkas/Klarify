/**
 * @fileoverview Componente principal del espacio de trabajo del Agente 4.
 * Gestiona la consulta a la IA y la revisión HITL de categorías MoSCoW.
 */

'use client';

import { useCallback } from 'react';
import { useAgentActivity } from '@/hooks/useAgentActivity';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/lib/api-client';
import type { Agent4Input } from '@/lib/types/workspace';
import type {
  Agent4PrioritizationResponse,
  Agent4Status,
  FrameworkCategory,
  StoryPrioritization,
} from '@/lib/types/agent-4';
import { FRAMEWORK_DESCRIPTIONS } from '@/lib/constants/agent-4';
import { ApproveButton } from '@/components/agents/shared/workflow/ApproveButton';
import { AgentActivityModal } from '@/components/agents/shared/activity-log/AgentActivityModal';
import { useWorkspaceSettings } from '@/context/WorkspaceSettingsContext';
import { CategorySelect, CategoryBadge } from './CategorySelect';
import { FrameworkSelector } from './FrameworkSelector';
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
}: PrioritizationWorkspaceProps) {
  const { user } = useAuth();
  const { entries, reset, consumeStream } = useAgentActivity();
  const { showModelReasoning } = useWorkspaceSettings();

  const isAnalyzing = status === 'prioritizing';
  const activityModalOpen = isAnalyzing && showModelReasoning;

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
      alert(
        error instanceof Error ? error.message : 'Error al procesar la priorización.'
      );
    }
  }, [input, user, framework, consumeStream, reset, onPrioritiesChange, onStatusChange]);

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

  const hasPriorities = Object.keys(priorities).length > 0;
  const frameworkLabel = FRAMEWORK_DESCRIPTIONS[framework].label;
  const prioritizeButtonLabel = hasPriorities
    ? 'Regenerar Priorización'
    : `Sugerir Priorización ${frameworkLabel}`;

  return (
    <div className="flex flex-col gap-6">
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
              ? `${input.epics.length} épica${input.epics.length !== 1 ? 's' : ''} · ${input.epics.reduce((n, e) => n + e.userStories.length, 0)} historias`
              : undefined
          }
          entries={entries}
        />
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border/50 bg-muted/30 px-6 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            Acciones del Product Owner IA
          </h3>
          <p className="text-xs text-muted-foreground">
            {hasPriorities
              ? `Revisa las categorías ${frameworkLabel} sugeridas o regenera la priorización completa.`
              : 'Presiona el botón para que el agente clasifique el backlog priorizado.'}
          </p>
        </div>

        <div className="flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-end sm:justify-between">
          <FrameworkSelector
            value={framework}
            onChange={onFrameworkChange}
            disabled={isAnalyzing || isApproving}
          />

          <button
            onClick={handlePrioritizeWithAgent}
            disabled={isAnalyzing || isApproving}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2.5 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-600/25 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
          >
            {isAnalyzing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {hasPriorities ? `Regenerando ${frameworkLabel}...` : `Clasificando ${frameworkLabel}...`}
              </>
            ) : (
              <>
                {hasPriorities ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                )}
                {prioritizeButtonLabel}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {input.epics.map((epic) => (
          <div
            key={epic.id}
            className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm"
          >
            <div className="border-b border-border bg-muted/40 px-6 py-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Épica
              </span>
              <h4 className="mt-0.5 text-base font-bold text-foreground">{epic.title}</h4>
            </div>

            <div className="divide-y divide-border">
              {(epic.userStories || []).map((story) => {
                const pri = priorities[story.id];
                const est = input.estimations[story.id];
                return (
                  <div
                    key={story.id}
                    className="grid grid-cols-1 items-start gap-4 p-6 md:grid-cols-4"
                  >
                    <div className="space-y-1 md:col-span-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-white">
                          {story.id}
                        </span>
                        <h5 className="text-sm font-semibold text-foreground">
                          {story.title}
                        </h5>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {story.description}
                      </p>
                      {est && (
                        <p className="text-[10px] text-muted-foreground/70">
                          Story Points: <span className="font-bold text-foreground">{est.points}</span>
                        </p>
                      )}
                    </div>

                    <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs">
                      {pri ? (
                        <>
                          {pri.isModified && (
                            <span className="mb-1 inline-block rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-600">
                              Modificado (HITL)
                            </span>
                          )}
                          <p className="italic leading-relaxed text-muted-foreground">
                            {pri.justification}
                          </p>
                        </>
                      ) : (
                        <p className="italic text-muted-foreground/60">
                          Esperando clasificación del Agente 4...
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 justify-self-end">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {pri?.isModified ? 'Modificado (HITL)' : `Categoría ${frameworkLabel}`}
                      </label>
                      {pri ? (
                        <CategoryBadge framework={framework} category={pri.category} />
                      ) : null}
                      <CategorySelect
                        framework={framework}
                        value={pri?.category ?? ''}
                        onChange={(cat) => handleCategoryChange(story.id, cat)}
                        disabled={isApproved}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {!isApproved && (
        <div className="mt-2 flex justify-end">
          <ApproveButton
            onClick={onApprove}
            disabled={!isApprovable || isApproving || isAnalyzing || !hasPriorities}
            label={isApproving ? 'Consolidando...' : 'Consolidar Backlog Priorizado'}
          />
        </div>
      )}
    </div>
  );
}
