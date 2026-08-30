'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Agent2State, Agent2Input, Epic, UserStory } from '@/lib/types/agent-2';
import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/hooks/useWorkspace';
import { authFetch } from '@/lib/api-client';
import { useAgentActivity } from '@/hooks/useAgentActivity';
import { generateEpicId, generateUserStoryId } from '@/lib/utils/agent-2-ids';
import { EmptyBacklogState } from '@/components/agents/agent-2/EmptyBacklogState';
import { WishesSummaryPanel } from '@/components/agents/agent-2/WishesSummaryPanel';
import { BacklogView } from '@/components/agents/agent-2/BacklogView';
import { ApproveButton } from '@/components/agents/shared/workflow/ApproveButton';
import { AgentActivityModal } from '@/components/agents/shared/activity-log/AgentActivityModal';
import { LLMThinkingPanel } from '@/components/agents/shared/activity-log/LLMThinkingPanel';
import { AgentErrorBanner } from '@/components/agents/shared/AgentErrorBanner';
import type { Agent2GenerateResponse } from '@/lib/types/agent-2';
import { RegenerationHint } from '@/components/agents/shared/RegenerationHint';
import { useWorkspaceSettings } from '@/context/WorkspaceSettingsContext';
import { useConfirm } from '@/components/agents/shared/ConfirmDialog';
import { errorMessage, notifyError, notifySuccess } from '@/lib/notifications/toast';

const INITIAL_STATE: Agent2State = {
  input: null,
  epics: [],
  status: 'idle',
  error: null,
};

function mergeBacklogs(oldEpics: Epic[], newEpics: Epic[]): Epic[] {
  const maxLen = Math.max(oldEpics.length, newEpics.length);
  const merged: Epic[] = [];

  for (let i = 0; i < maxLen; i++) {
    const oldEpic = oldEpics[i];
    const newEpic = newEpics[i];

    if (oldEpic && newEpic) {
      const keepOldEpicMeta = oldEpic.isEdited || oldEpic.source === 'manual';
      const mergedStories = mergeStories(oldEpic.userStories, newEpic.userStories);
      merged.push({
        id: newEpic.id,
        title: keepOldEpicMeta ? oldEpic.title : newEpic.title,
        description: keepOldEpicMeta ? oldEpic.description : newEpic.description,
        userStories: mergedStories,
        source: oldEpic.source === 'manual' ? 'manual' : newEpic.source,
        isEdited: oldEpic.isEdited,
        createdAt: keepOldEpicMeta ? oldEpic.createdAt : newEpic.createdAt,
      });
    } else if (!oldEpic && newEpic) {
      merged.push(newEpic);
    }
  }

  const orphanedStories: UserStory[] = [];
  const manualEpicsToKeep: Epic[] = [];

  for (let i = 0; i < oldEpics.length; i++) {
    if (!newEpics[i]) {
      const oldEpic = oldEpics[i];
      if (oldEpic.source === 'manual') {
        manualEpicsToKeep.push(oldEpic);
      } else {
        for (const story of oldEpic.userStories) {
          if (story.isEdited || story.source === 'manual') {
            orphanedStories.push(story);
          }
        }
      }
    }
  }

  merged.push(...manualEpicsToKeep);

  if (orphanedStories.length > 0 && merged.length > 0) {
    merged[0] = {
      ...merged[0],
      userStories: [...merged[0].userStories, ...orphanedStories],
    };
  }

  return merged;
}

function mergeStories(oldStories: UserStory[], newStories: UserStory[]): UserStory[] {
  const maxLen = Math.max(oldStories.length, newStories.length);
  const result: UserStory[] = [];

  for (let i = 0; i < maxLen; i++) {
    const oldStory = oldStories[i];
    const newStory = newStories[i];

    if (oldStory && (oldStory.isEdited || oldStory.source === 'manual')) {
      result.push(oldStory);
    } else if (newStory) {
      result.push(newStory);
    } else if (oldStory) {
      result.push(oldStory);
    }
  }

  return result;
}

export default function Agent2Page() {
  const router = useRouter();
  const { user } = useAuth();
  const confirm = useConfirm();
  const { workspace, isLoading, sessionVersion, saveAgent2, approveAgent2, canRegenerate } = useWorkspace();
  const [state, setState] = useState<Agent2State>(INITIAL_STATE);
  const { entries, reset, consumeStream } = useAgentActivity();
  const [isHydrated, setIsHydrated] = useState(false);

  const { showModelReasoning } = useWorkspaceSettings();
  const isAgentWorking = state.status === 'generating';
  const activityModalOpen = isAgentWorking && showModelReasoning;

  useEffect(() => {
    if (isLoading || !workspace) return;

    const a2 = workspace.agent2;
    const pipelineInput = workspace.pipeline.agent2Input;
    const agent1Input: Agent2Input | null =
      workspace.agent1.status === 'approved' && workspace.agent1.wishes.length > 0
        ? {
            transcription: workspace.agent1.transcription,
            wishes: workspace.agent1.wishes,
          }
        : null;

    if (a2.epics && a2.epics.length > 0) {
      setState({
        input: a2.input ?? pipelineInput ?? agent1Input ?? null,
        epics: a2.epics,
        status: a2.status === 'approved' ? 'approved' : 'review',
        error: null,
      });
      setIsHydrated(true);
      return;
    }

    const resolvedInput = pipelineInput ?? agent1Input;
    if (resolvedInput && resolvedInput.wishes.length > 0) {
      setState((prev) => ({ ...prev, input: resolvedInput }));
    } else if (a2.input) {
      setState((prev) => ({ ...prev, input: a2.input }));
    }

    setIsHydrated(true);
  }, [isLoading, workspace, sessionVersion]);

  useEffect(() => {
    if (!isHydrated) return;
    saveAgent2({
      input: state.input,
      epics: state.epics,
      status: state.status,
      error: state.error,
    });
  }, [state.epics, state.status, state.input, state.error, isHydrated, saveAgent2]);

  const handleGenerate = useCallback(async () => {
    if (!state.input || !user) return;

    setState((prev) => ({ ...prev, status: 'generating', error: null }));
    reset();

    try {
      const response = await authFetch('/api/agentes/2/generate', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar el backlog');
      }

      const data = await consumeStream<Agent2GenerateResponse>(response);
      const clonedEpics = JSON.parse(JSON.stringify(data.epics)) as Epic[];

      setState((prev) => ({
        ...prev,
        epics: clonedEpics,
        status: 'review',
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: 'idle',
        error: error instanceof Error ? error.message : 'Error desconocido al generar el backlog.',
      }));
    }
  }, [state.input, user, reset, consumeStream]);

  const handleRegenerate = useCallback(async () => {
    if (!state.input || !user) return;

    const confirmed = await confirm({
      title: '¿Regenerar el backlog?',
      description:
        'Se generará un nuevo backlog. Los cambios manuales y las historias que hayas editado se conservarán.',
      confirmLabel: 'Regenerar',
      variant: 'primary',
    });
    if (!confirmed) return;

    setState((prev) => ({ ...prev, status: 'generating', error: null }));
    reset();

    try {
      const response = await authFetch('/api/agentes/2/generate', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...state.input, isRegeneration: true }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al regenerar el backlog');
      }

      const data = await consumeStream<Agent2GenerateResponse>(response);
      const newEpics = JSON.parse(JSON.stringify(data.epics)) as Epic[];
      const mergedEpics = mergeBacklogs(state.epics, newEpics);

      setState((prev) => ({
        ...prev,
        epics: mergedEpics,
        status: 'review',
      }));
      notifySuccess('Backlog regenerado');
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: 'review',
        error: error instanceof Error ? error.message : 'Error desconocido al regenerar.',
      }));
    }
  }, [state.input, state.epics, user, reset, consumeStream, confirm]);

  const handleEditEpic = useCallback((id: string, updates: Partial<Epic>) => {
    setState((prev) => ({
      ...prev,
      epics: prev.epics.map((epic) =>
        epic.id === id ? { ...epic, ...updates, isEdited: true } : epic
      ),
    }));
    notifySuccess('Épica actualizada');
  }, []);

  const handleEditStory = useCallback((id: string, updates: Partial<UserStory>) => {
    setState((prev) => ({
      ...prev,
      epics: prev.epics.map((epic) => ({
        ...epic,
        userStories: epic.userStories.map((story) =>
          story.id === id ? { ...story, ...updates, isEdited: true } : story
        ),
      })),
    }));
    const onlyCriteria =
      Object.keys(updates).length === 1 && updates.acceptanceCriteria !== undefined;
    notifySuccess(onlyCriteria ? 'Criterios de aceptación actualizados' : 'HU actualizada');
  }, []);

  const handleDeleteEpic = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      epics: prev.epics.filter((epic) => epic.id !== id),
    }));
    notifySuccess('Épica eliminada');
  }, []);

  const handleDeleteStory = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      epics: prev.epics.map((epic) => ({
        ...epic,
        userStories: epic.userStories.filter((story) => story.id !== id),
      })),
    }));
    notifySuccess(`${id} eliminada`);
  }, []);

  const handleAddEpic = useCallback(
    (epic: Omit<Epic, 'id' | 'source' | 'isEdited' | 'createdAt' | 'userStories'>) => {
      setState((prev) => {
        const newEpic: Epic = {
          ...epic,
          id: generateEpicId(prev.epics),
          userStories: [],
          source: 'manual',
          isEdited: false,
          createdAt: Date.now(),
        };
        return { ...prev, epics: [...prev.epics, newEpic] };
      });
      notifySuccess('Épica creada');
    },
    []
  );

  const handleAddStory = useCallback(
    (epicId: string, story: Omit<UserStory, 'id' | 'source' | 'isEdited' | 'createdAt'>) => {
      setState((prev) => {
        const allStories = prev.epics.flatMap((e) => e.userStories);
        const newStory: UserStory = {
          ...story,
          type: 'story',
          id: generateUserStoryId(allStories),
          source: 'manual',
          isEdited: false,
          createdAt: Date.now(),
        };

        return {
          ...prev,
          epics: prev.epics.map((epic) =>
            epic.id === epicId
              ? { ...epic, userStories: [...epic.userStories, newStory] }
              : epic
          ),
        };
      });
      notifySuccess('HU creada');
    },
    []
  );

  const handleApprove = useCallback(async () => {
    const sourceWishIds = state.input?.wishes.map((w) => w.id) ?? [];
    try {
      await approveAgent2({
        epics: state.epics,
        sourceWishIds,
        approvedAt: Date.now(),
      });
      setState((prev) => ({ ...prev, status: 'approved' }));
      notifySuccess({
        title: 'Backlog aprobado',
        description: 'Listo para estimar en el Agente 3.',
      });
    } catch (err) {
      notifyError(errorMessage(err, 'No se pudo aprobar el backlog'));
    }
  }, [state.epics, state.input, approveAgent2]);

  const isApprovable =
    state.epics.length > 0 &&
    state.epics.every(
      (epic) =>
        epic.title.trim() !== '' &&
        epic.userStories.length > 0 &&
        epic.userStories.every(
          (story) =>
            story.title.trim() !== '' &&
            story.description.trim() !== ''
        )
    );

  // ── Datos derivados ──────────────────────────────────────
  const totalStories = state.epics.reduce((s, e) => s + e.userStories.length, 0);

  if (isLoading || !isHydrated) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  const hasInput = state.input !== null && state.input.wishes.length > 0;
  const showReview = (state.status === 'review' || state.status === 'approved') && state.epics.length > 0;
  const headerSubtitle =
    state.status === 'generating' || showReview
      ? null
      : 'Transforma los deseos aprobados en épicas e historias de usuario.';

  return (
    <div
      className={[
        'mx-auto flex w-full animate-[fadeIn_0.3s_ease-out] flex-col px-6 pt-3 pb-5',
        showReview ? 'max-w-5xl gap-5' : 'max-w-3xl gap-5',
      ].join(' ')}
    >
      <header className="shrink-0 pb-3">
        <h1 className="text-[50px] font-semibold tracking-tight text-foreground">
          Backlog Inicial
        </h1>
        <p className="mt-1 text-[12px] text-muted">
          Paso 2/6 · Estructura
          {headerSubtitle ? <> · {headerSubtitle}</> : null}
        </p>
        {showReview ? (
          <p className="mt-1 text-[12px] text-muted">
            <span className="tabular-nums text-foreground">{state.epics.length}</span>
            {' '}
            {state.epics.length === 1 ? 'épica' : 'épicas'}
            {' · '}
            <span className="tabular-nums text-foreground">{totalStories}</span>
            {' '}
            {totalStories === 1 ? 'historia de usuario' : 'historias de usuario'}
            {state.status === 'approved' ? (
              <>
                {' · '}
                <span className="text-success">Aprobado</span>
              </>
            ) : null}
          </p>
        ) : null}
      </header>

      {state.error && (
        <AgentErrorBanner
          message={state.error}
          onDismiss={() => setState((prev) => ({ ...prev, error: null }))}
        />
      )}

      {state.status === 'idle' && !hasInput && (
        <EmptyBacklogState hasInput={false} />
      )}

      {state.status === 'idle' && hasInput && state.epics.length === 0 && (
        <EmptyBacklogState
          hasInput={true}
          onGenerate={handleGenerate}
          isGenerating={false}
        />
      )}

      {showReview && (
        <>
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
            <BacklogView
              epics={state.epics}
              onEditEpic={handleEditEpic}
              onDeleteEpic={handleDeleteEpic}
              onEditStory={handleEditStory}
              onDeleteStory={handleDeleteStory}
              onAddStory={handleAddStory}
              onAddEpic={handleAddEpic}
              isApproved={state.status === 'approved'}
            />
            <WishesSummaryPanel wishes={state.input?.wishes ?? []} />
          </div>

          {state.status === 'review' && (
            <div className="flex flex-col items-stretch justify-between gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center">
              <p className="text-[13px] text-subtle">
                Revisa el backlog antes de continuar a la estimación.
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={!canRegenerate('agent2')}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-surface-muted px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Regenerar
                  </button>
                  <RegenerationHint agent="agent2" className="text-center sm:text-right" />
                </div>
                <ApproveButton
                  onClick={handleApprove}
                  disabled={!isApprovable}
                  label="Aprobar backlog y continuar"
                />
              </div>
            </div>
          )}

          {state.status === 'approved' && (
            <div className="flex flex-col items-stretch justify-between gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center">
              <p className="text-[13px] text-subtle">
                Backlog aprobado. Listo para estimar en el Agente 3.
              </p>
              <button
                type="button"
                onClick={() => router.push('/agentes/3')}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Continuar al Agente 3
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}

      {isAgentWorking && !showModelReasoning && (
        <LLMThinkingPanel
          title={state.epics.length > 0 ? 'Regenerando tu backlog...' : 'Creando tu backlog...'}
          description={
            state.epics.length > 0
              ? 'Estamos generando una nueva versión del backlog. Tus ediciones manuales se conservarán al finalizar.'
              : 'Estamos transformando tus deseos aprobados en épicas e historias de usuario estructuradas.'
          }
          meta={
            state.input
              ? `${state.input.wishes.length} deseo${state.input.wishes.length !== 1 ? 's' : ''}${
                  state.epics.length > 0
                    ? ` · ${state.epics.length} épica${state.epics.length !== 1 ? 's' : ''} previas`
                    : ''
                }`
              : undefined
          }
        />
      )}

      {showModelReasoning && (
        <AgentActivityModal
          open={activityModalOpen}
          isActive={isAgentWorking}
          title={state.epics.length > 0 ? 'Regenerando tu backlog...' : 'Creando tu backlog...'}
          description={
            state.epics.length > 0
              ? 'Estamos generando una nueva versión del backlog. Tus ediciones manuales se conservarán al finalizar.'
              : 'Estamos transformando tus deseos aprobados en épicas e historias de usuario estructuradas.'
          }
          meta={
            state.input
              ? `${state.input.wishes.length} deseo${state.input.wishes.length !== 1 ? 's' : ''}${
                  state.epics.length > 0
                    ? ` · ${state.epics.length} épica${state.epics.length !== 1 ? 's' : ''} previas`
                    : ''
                }`
              : undefined
          }
          entries={entries}
        />
      )}
    </div>
  );
}
