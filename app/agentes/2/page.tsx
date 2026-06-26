/**
 * @fileoverview Página principal del Agente 2 — Backlog Inicial.
 *
 * Orquesta el flujo completo del agente:
 *   1. Hidratar input desde Agente 1 (agent_2_input) + estado persistido
 *   2. Generación de backlog vía API (bajo demanda, no automática)
 *   3. Review HITL: editar épicos, HUs y criterios de aceptación
 *   4. Regenerar con merge (preserva ediciones manuales)
 *   5. Aprobar y continuar al Agente 3
 *
 * Estado persistido en Firestore (workspace del usuario) para no perder trabajo.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Agent2State, Agent2Input, Epic, UserStory } from '@/lib/types/agent-2';
import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/hooks/useWorkspace';
import { authFetch } from '@/lib/api-client';
import { generateEpicId, generateUserStoryId } from '@/lib/services/agent-2-service';
import { EmptyBacklogState } from '@/components/agents/agent-2/EmptyBacklogState';
import { WishesSummaryPanel } from '@/components/agents/agent-2/WishesSummaryPanel';
import { BacklogView } from '@/components/agents/agent-2/BacklogView';
import { ApproveButton } from '@/components/agents/shared/ApproveButton';

// ---------------------------------------------------------------------------
// Estado inicial
// ---------------------------------------------------------------------------

const INITIAL_STATE: Agent2State = {
  input: null,
  epics: [],
  status: 'idle',
  error: null,
};

// ---------------------------------------------------------------------------
// Pure function: mergeBacklogs (position-based merge algorithm)
// ---------------------------------------------------------------------------

/**
 * Merges old epics (with potential edits) with freshly generated epics.
 *
 * Rules:
 * - Epics matched by array index.
 * - Edited stories (isEdited === true) are preserved as-is.
 * - Unedited stories are replaced by the new story at the same position.
 * - If new epic has more stories, excess are appended.
 * - If new epic has fewer stories, edited stories beyond count are appended.
 * - Epic-level edits (title/description) are preserved if isEdited or source === 'manual'.
 * - Manual epics removed by new generation are re-appended in full.
 * - Orphaned stories (auto epic removed in new gen) are appended to first remaining epic.
 */
function mergeBacklogs(oldEpics: Epic[], newEpics: Epic[]): Epic[] {
  // Step 1: Merge matched epics by index
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
    } else if (oldEpic && !newEpic) {
      // Old epic removed in new generation — handled in Step 2
    } else if (!oldEpic && newEpic) {
      merged.push(newEpic);
    }
  }

  // Step 2: Preserve manual epics removed by regeneration; collect orphaned stories
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
      // Replace with new
      result.push(newStory);
    } else if (oldStory) {
      // Old story beyond new count but not edited — still keep it
      result.push(oldStory);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function Agent2Page() {
  const router = useRouter();
  const { user } = useAuth();
  const { workspace, isLoading, sessionVersion, saveAgent2, approveAgent2 } = useWorkspace();
  const [state, setState] = useState<Agent2State>(INITIAL_STATE);
  const [isHydrated, setIsHydrated] = useState(false);

  // ── Hidratar desde el workspace (Firestore) ───────────────────
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

    // Prioridad 1: estado persistido del Agente 2 (con backlog generado)
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

    // Prioridad 2: input aprobado por el Agente 1 (pipeline o fallback agent1)
    const resolvedInput = pipelineInput ?? agent1Input;
    if (resolvedInput && resolvedInput.wishes.length > 0) {
      setState((prev) => ({ ...prev, input: resolvedInput }));
    } else if (a2.input) {
      setState((prev) => ({ ...prev, input: a2.input }));
    }

    setIsHydrated(true);
  }, [isLoading, workspace, sessionVersion]);

  // ── Persistir en Firestore (debounced) ────────────────────────
  useEffect(() => {
    if (!isHydrated) return;
    saveAgent2({
      input: state.input,
      epics: state.epics,
      status: state.status,
      error: state.error,
    });
  }, [state.epics, state.status, state.input, state.error, isHydrated, saveAgent2]);

  // ── Handler: Generar backlog ──────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!state.input || !user) return;

    setState((prev) => ({ ...prev, status: 'generating', error: null }));

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

      const data = await response.json();
      // Deep-clone to avoid mutating any module-level references
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
  }, [state.input, user]);

  // ── Handler: Regenerar backlog (merge) ────────────────────────
  const handleRegenerate = useCallback(async () => {
    if (!state.input || !user) return;

    const confirmed = window.confirm(
      'Se generará un nuevo backlog. Los cambios manuales y las historias que hayas editado se conservarán.'
    );
    if (!confirmed) return;

    setState((prev) => ({ ...prev, status: 'generating', error: null }));

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

      const data = await response.json();
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
        status: 'review', // Stay in review, don't lose current state
        error: error instanceof Error ? error.message : 'Error desconocido al regenerar.',
      }));
    }
  }, [state.input, state.epics, user]);

  // ── Handler: Editar épica ─────────────────────────────────────
  const handleEditEpic = useCallback((id: string, updates: Partial<Epic>) => {
    setState((prev) => ({
      ...prev,
      epics: prev.epics.map((epic) =>
        epic.id === id ? { ...epic, ...updates, isEdited: true } : epic
      ),
    }));
  }, []);

  // ── Handler: Editar historia de usuario ───────────────────────
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

  // ── Handler: Eliminar épica ───────────────────────────────────
  const handleDeleteEpic = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      epics: prev.epics.filter((epic) => epic.id !== id),
    }));
  }, []);

  // ── Handler: Eliminar historia de usuario ─────────────────────
  const handleDeleteStory = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      epics: prev.epics.map((epic) => ({
        ...epic,
        userStories: epic.userStories.filter((story) => story.id !== id),
      })),
    }));
  }, []);

  // ── Handler: Añadir épica ─────────────────────────────────────
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

  // ── Handler: Añadir historia de usuario ───────────────────────
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

  // ── Handler: Aprobar backlog ──────────────────────────────────
  const handleApprove = useCallback(async () => {
    const sourceWishIds = state.input?.wishes.map((w) => w.id) ?? [];
    // Escribe el pipeline en Firestore para que el Agente 3 lo consuma
    await approveAgent2({
      epics: state.epics,
      sourceWishIds,
      approvedAt: Date.now(),
    });
    setState((prev) => ({ ...prev, status: 'approved' }));
  }, [state.epics, state.input, approveAgent2]);

  // ── Validación de aprobación ──────────────────────────────────
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

  // ── Evitar flash de contenido antes de hidratar ───────────────
  if (isLoading || !isHydrated) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────
  const hasInput = state.input !== null && state.input.wishes.length > 0;
  const showReview = (state.status === 'review' || state.status === 'approved') && state.epics.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
      {/* ── Hero Header ───────────────────────────────────────── */}
      <div className="mb-2">
        <div className="mb-3 flex items-center gap-3 text-primary">
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest">
            Paso 02 / 06
          </span>
        </div>
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Backlog Inicial
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted">
          Transforma los deseos aprobados en épicas e historias de usuario
          estructuradas para contar con un backlog base.
        </p>
      </div>

      {/* ── Error ──────────────────────────────────────────────── */}
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 animate-[fadeIn_0.3s_ease-out]">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-danger">{state.error}</p>
        </div>
      )}

      {/* ── Estado: idle sin input ─────────────────────────────── */}
      {state.status === 'idle' && !hasInput && (
        <EmptyBacklogState hasInput={false} />
      )}

      {/* ── Estado: idle con input, sin epics ──────────────────── */}
      {state.status === 'idle' && hasInput && state.epics.length === 0 && (
        <EmptyBacklogState
          hasInput={true}
          onGenerate={handleGenerate}
          isGenerating={false}
        />
      )}

      {/* ── Estado: generating ─────────────────────────────────── */}
      {state.status === 'generating' && (
        <div className="flex flex-col items-center justify-center py-20 animate-[fadeIn_0.3s_ease-out]">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-sm font-medium text-muted">
            {state.epics.length > 0 ? 'Regenerando backlog...' : 'Generando backlog...'}
          </p>
        </div>
      )}

      {/* ── Estado: review / approved ──────────────────────────── */}
      {showReview && (
        <>
          {/* Grid: deseos + backlog */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
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

          {/* ── Barra de acciones (solo en review) ────────────── */}
          {state.status === 'review' && (
            <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-surface-muted px-6 py-5 sm:flex-row">
              <button
                onClick={handleRegenerate}
                className={[
                  'inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3',
                  'text-sm font-medium text-muted',
                  'hover:border-border-strong hover:bg-surface-hover hover:text-foreground',
                  'transition-all cursor-pointer',
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
          )}

          {/* ── Mensaje de aprobación ─────────────────────────── */}
          {state.status === 'approved' && (
            <div className="flex flex-col gap-4 rounded-2xl border border-success/30 bg-success/10 px-6 py-5 animate-[fadeIn_0.3s_ease-out] sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-success/30 bg-success/20">
                  <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-success">
                    ¡Backlog aprobado exitosamente!
                  </p>
                  <p className="text-xs text-success/75">
                    {state.epics.length} épicas · {state.epics.reduce((s, e) => s + e.userStories.length, 0)} historias de usuario listas.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center sm:ml-auto">
                <button
                  onClick={() => router.push('/agentes/3')}
                  className="rounded-xl bg-success px-5 py-2.5 text-sm font-bold text-black shadow-[0_4px_16px_color-mix(in_srgb,var(--success)_35%,transparent)] transition-all hover:opacity-90 cursor-pointer"
                >
                  Continuar al Agente 3 →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
