'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Agent2State, Agent2Input, Epic, UserStory } from '@/lib/types/agent-2';
import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/hooks/useWorkspace';
import { authFetch } from '@/lib/api-client';
import { useAgentActivity } from '@/hooks/useAgentActivity';
import { generateEpicId, generateUserStoryId } from '@/lib/services/agent-2-service';
import { EmptyBacklogState } from '@/components/agents/agent-2/EmptyBacklogState';
import { WishesSummaryPanel } from '@/components/agents/agent-2/WishesSummaryPanel';
import { BacklogView } from '@/components/agents/agent-2/BacklogView';
import { ApproveButton } from '@/components/agents/shared/workflow/ApproveButton';
import { AgentActivityModal } from '@/components/agents/shared/activity-log/AgentActivityModal';
import { LLMThinkingPanel } from '@/components/agents/shared/activity-log/LLMThinkingPanel';
import { AgentPageHero, AgentStat } from '@/components/agents/shared/layout/AgentPageHero';
import { AgentErrorBanner } from '@/components/agents/shared/AgentErrorBanner';
import { AgentCelebrationBanner } from '@/components/agents/shared/AgentCelebrationBanner';
import type { Agent2GenerateResponse } from '@/lib/types/agent-2';
import { useWorkspaceSettings } from '@/context/WorkspaceSettingsContext';

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
  const { workspace, isLoading, sessionVersion, saveAgent2, approveAgent2 } = useWorkspace();
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

    const confirmed = window.confirm(
      'Se generará un nuevo backlog. Los cambios manuales y las historias que hayas editado se conservarán.'
    );
    if (!confirmed) return;

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
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: 'review',
        error: error instanceof Error ? error.message : 'Error desconocido al regenerar.',
      }));
    }
  }, [state.input, state.epics, user, reset, consumeStream]);

  const handleEditEpic = useCallback((id: string, updates: Partial<Epic>) => {
    setState((prev) => ({
      ...prev,
      epics: prev.epics.map((epic) =>
        epic.id === id ? { ...epic, ...updates, isEdited: true } : epic
      ),
    }));
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
  }, []);

  const handleDeleteEpic = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      epics: prev.epics.filter((epic) => epic.id !== id),
    }));
  }, []);

  const handleDeleteStory = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      epics: prev.epics.map((epic) => ({
        ...epic,
        userStories: epic.userStories.filter((story) => story.id !== id),
      })),
    }));
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
    },
    []
  );

  const handleAddStory = useCallback(
    (epicId: string, story: Omit<UserStory, 'id' | 'source' | 'isEdited' | 'createdAt'>) => {
      setState((prev) => {
        const allStories = prev.epics.flatMap((e) => e.userStories);
        const newStory: UserStory = {
          ...story,
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
    },
    []
  );

  const handleApprove = useCallback(async () => {
    const sourceWishIds = state.input?.wishes.map((w) => w.id) ?? [];
    await approveAgent2({
      epics: state.epics,
      sourceWishIds,
      approvedAt: Date.now(),
    });
    setState((prev) => ({ ...prev, status: 'approved' }));
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

  // ── Loading state mejorado ───────────────────────────────
  if (isLoading || !isHydrated) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <div className="animate-[fadeIn_0.3s_ease-out]">
          {/* Skeleton step badge */}
          <div className="mb-5 h-7 w-28 rounded-full bg-surface-hover animate-[shimmerPulse_2s_ease-in-out_infinite]" />
          {/* Skeleton title */}
          <div className="mb-4 h-11 w-72 rounded-xl bg-surface-hover animate-[shimmerPulse_2s_ease-in-out_infinite] md:h-12" />
          {/* Skeleton description */}
          <div className="mb-2 h-5 w-96 rounded-lg bg-surface-hover animate-[shimmerPulse_2s_ease-in-out_infinite]" />
          <div className="mb-8 h-5 w-64 rounded-lg bg-surface-hover animate-[shimmerPulse_2s_ease-in-out_infinite]" />
          {/* Skeleton grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
            <div className="h-72 rounded-2xl border border-border bg-surface-muted animate-[shimmerPulse_2.5s_ease-in-out_infinite]" />
            <div className="h-96 rounded-2xl border border-border bg-surface-muted animate-[shimmerPulse_2.5s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    );
  }

  // ── Estados derivados ────────────────────────────────────
  const hasInput = state.input !== null && state.input.wishes.length > 0;
  const showReview = (state.status === 'review' || state.status === 'approved') && state.epics.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
      <AgentPageHero
        step={2}
        variant="structure"
        title="Backlog Inicial"
        description="Transforma los deseos aprobados en épicas e historias de usuario estructuradas para contar con un backlog base."
        statusBadge={
          state.status === 'approved' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-success">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Aprobado
            </span>
          ) : undefined
        }
        stats={
          showReview ? (
            <>
              <AgentStat
                icon={
                  <svg className="h-4 w-4 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                  </svg>
                }
                value={state.epics.length}
                label={`épica${state.epics.length !== 1 ? 's' : ''}`}
              />
              <AgentStat
                icon={
                  <svg className="h-4 w-4 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                  </svg>
                }
                value={totalStories}
                label={`historia${totalStories !== 1 ? 's' : ''} de usuario`}
              />
            </>
          ) : undefined
        }
      />

      {state.error && (
        <AgentErrorBanner
          message={state.error}
          onDismiss={() => setState((prev) => ({ ...prev, error: null }))}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════
          ESTADO: idle — Sin input del Agente 1
         ═══════════════════════════════════════════════════════════ */}
      {state.status === 'idle' && !hasInput && (
        <EmptyBacklogState hasInput={false} />
      )}

      {/* ═══════════════════════════════════════════════════════════
          ESTADO: idle — Con input, backlog no generado aún
         ═══════════════════════════════════════════════════════════ */}
      {state.status === 'idle' && hasInput && state.epics.length === 0 && (
        <EmptyBacklogState
          hasInput={true}
          onGenerate={handleGenerate}
          isGenerating={false}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════
          ESTADO: review / approved
         ═══════════════════════════════════════════════════════════ */}
      {showReview && (
        <>
          {/* Grid: sidebar + backlog */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
            <WishesSummaryPanel wishes={state.input?.wishes ?? []} />
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
          </div>

          {/* ── ACTION BAR — Glass effect (solo en review) ──── */}
          {state.status === 'review' && (
            <div className="sticky bottom-6 z-20 animate-[slideUpFade_0.4s_ease-out]">
              <div className="rounded-2xl border border-border/80 bg-surface-muted/80 backdrop-blur-xl px-6 py-4 shadow-[0_8px_32px_color-mix(in_srgb,var(--foreground)_8%,transparent)]">
                <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                  <div className="hidden sm:block text-sm text-subtle">
                    <span className="font-medium text-foreground">{state.epics.length}</span> épica{state.epics.length !== 1 ? 's' : ''} ·{' '}
                    <span className="font-medium text-foreground">{totalStories}</span> HU{totalStories !== 1 ? 's' : ''}
                  </div>

                  <div className="flex w-full flex-col-reverse items-center gap-3 sm:w-auto sm:flex-row">
                    <button
                      onClick={handleRegenerate}
                      className={[
                        'inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-5 py-3 sm:w-auto',
                        'text-sm font-medium text-muted',
                        'hover:border-border-strong hover:bg-surface-hover hover:text-foreground',
                        'transition-all duration-200 cursor-pointer',
                      ].join(' ')}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                      </svg>
                      Regenerar Backlog
                    </button>

                    <ApproveButton
                      onClick={handleApprove}
                      disabled={!isApprovable}
                      label="Aprobar Backlog y Continuar"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── APROBADO — Estado de celebración ────────────── */}
          {state.status === 'approved' && (
            <AgentCelebrationBanner
              title="Backlog aprobado"
              description={`${state.epics.length} épica${state.epics.length !== 1 ? 's' : ''} · ${totalStories} historia${totalStories !== 1 ? 's' : ''} de usuario listas para el Agente 3.`}
              action={
                <button
                  onClick={() => router.push('/agentes/3')}
                  className={[
                    'inline-flex w-full items-center justify-center gap-2 rounded-xl sm:w-auto',
                    'bg-success px-6 py-3 text-sm font-bold text-black',
                    'shadow-[0_4px_20px_color-mix(in_srgb,var(--success)_35%,transparent)]',
                    'transition-all duration-200 hover:shadow-[0_6px_28px_color-mix(in_srgb,var(--success)_45%,transparent)] hover:opacity-90',
                    'cursor-pointer',
                  ].join(' ')}
                >
                  Continuar al Agente 3
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              }
            />
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════
          PANELES DE ACTIVIDAD (durante generación)
         ═══════════════════════════════════════════════════════════ */}
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
