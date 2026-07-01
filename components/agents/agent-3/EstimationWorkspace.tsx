/**
 * @fileoverview Componente principal del espacio de trabajo del Agente 3.
 * Gestiona la consulta a la IA y la revisión HITL de Story Points.
 */

'use client';

import { useCallback } from 'react';
import { useAgentActivity } from '@/hooks/useAgentActivity';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/lib/api-client';
import type { Agent3Input } from '@/lib/types/workspace';
import type {
  Agent3EstimationResponse,
  Agent3Status,
  StoryEstimation,
} from '@/lib/types/agent-3';
import { ApproveButton } from '@/components/agents/shared/workflow/ApproveButton';
import { AgentActivityModal } from '@/components/agents/shared/activity-log/AgentActivityModal';
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

  const hasEstimations = Object.keys(estimations).length > 0;
  const estimateButtonLabel = hasEstimations ? 'Regenerar Estimación' : 'Sugerir Story Points';

  return (
    <div className="flex flex-col gap-6">
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
              ? `${input.epics.length} épica${input.epics.length !== 1 ? 's' : ''} · ${input.epics.reduce((n, e) => n + e.userStories.length, 0)} historias`
              : undefined
          }
          entries={entries}
        />
      )}

      <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-6 py-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Acciones del Scrum Master IA</h3>
          <p className="text-xs text-muted-foreground">
            {hasEstimations
              ? 'Revisa los Story Points sugeridos o regenera la estimación completa.'
              : 'Presiona el botón para que el agente calcule el esfuerzo inicial.'}
          </p>
        </div>
        <button
          onClick={handleAnalyzeWithAgent}
          disabled={isAnalyzing || isApproving}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-medium text-white shadow transition-colors hover:bg-emerald-500 disabled:opacity-50"
        >
          {isAnalyzing ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {hasEstimations ? 'Regenerando...' : 'Analizando complejidad...'}
            </>
          ) : (
            <>
              {hasEstimations && (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
              )}
              {estimateButtonLabel}
            </>
          )}
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {input.epics.map((epic) => (
          <div key={epic.id} className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            <div className="border-b border-border bg-muted/40 px-6 py-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Épica</span>
              <h4 className="mt-0.5 text-base font-bold text-foreground">{epic.title}</h4>
            </div>

            <div className="divide-y divide-border">
              {(epic.userStories || []).map((story) => {
                const est = estimations[story.id];
                return (
                  <div key={story.id} className="grid grid-cols-1 items-start gap-4 p-6 md:grid-cols-4">
                    <div className="space-y-1 md:col-span-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-white">
                          {story.id}
                        </span>
                        <h5 className="text-sm font-semibold text-foreground">{story.title}</h5>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{story.description}</p>
                    </div>

                    <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs">
                      {est ? (
                        <p className="italic leading-relaxed text-muted-foreground">{est.justification}</p>
                      ) : (
                        <p className="italic text-muted-foreground/60">Esperando análisis del Agente 3...</p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 justify-self-end">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {est?.isModified ? 'Modificado (HITL)' : 'Story Points'}
                      </label>
                      <select
                        disabled={!est || isApproved}
                        value={est ? est.points : ''}
                        onChange={(e) => handlePointChange(story.id, Number(e.target.value))}
                        className="h-9 w-28 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-40"
                      >
                        {!est && <option value="">---</option>}
                        {FIBONACCI_SCALE.map((num) => (
                          <option key={num} value={num}>
                            {num} SP
                          </option>
                        ))}
                      </select>
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
            disabled={!isApprovable || isApproving || isAnalyzing || !hasEstimations}
            label={isApproving ? 'Consolidando...' : 'Consolidar Backlog Estimado'}
          />
        </div>
      )}
    </div>
  );
}
