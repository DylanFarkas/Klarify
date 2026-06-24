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
 * Estado persistido en localStorage para no perder trabajo al refrescar.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Agent2State, Agent2Input, Epic, UserStory } from '@/lib/types/agent-2';
import {
  STORAGE_KEY_AGENT_2_INPUT,
  STORAGE_KEY_AGENT_2,
  STORAGE_KEY_AGENT_3_INPUT,
} from '@/lib/constants/agent-2';
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
 * - Epic-level edits (title/description) are preserved if isEdited === true.
 * - Orphaned stories (epic removed in new gen) are appended to first remaining epic.
 */
function mergeBacklogs(oldEpics: Epic[], newEpics: Epic[]): Epic[] {
  // Step 1: Merge matched epics by index
  const maxLen = Math.max(oldEpics.length, newEpics.length);
  const merged: Epic[] = [];

  for (let i = 0; i < maxLen; i++) {
    const oldEpic = oldEpics[i];
    const newEpic = newEpics[i];

    if (oldEpic && newEpic) {
      // Both exist — merge
      const mergedStories = mergeStories(oldEpic.userStories, newEpic.userStories);
      merged.push({
        id: newEpic.id,
        title: oldEpic.isEdited ? oldEpic.title : newEpic.title,
        description: oldEpic.isEdited ? oldEpic.description : newEpic.description,
        userStories: mergedStories,
        source: newEpic.source,
        isEdited: oldEpic.isEdited,
        createdAt: newEpic.createdAt,
      });
    } else if (oldEpic && !newEpic) {
      // Old epic removed in new generation — collect orphaned stories
      // Handled in Step 2 below
    } else if (!oldEpic && newEpic) {
      // New epic — keep as-is
      merged.push(newEpic);
    }
  }

  // Step 2: Collect orphaned stories from removed epics
  const orphanedStories: UserStory[] = [];
  for (let i = 0; i < oldEpics.length; i++) {
    if (!newEpics[i]) {
      // This epic was removed — all its stories are orphaned
      for (const story of oldEpics[i].userStories) {
        if (story.isEdited || story.source === 'manual') {
          orphanedStories.push(story);
        }
      }
    }
  }

  // Append orphaned stories to first remaining epic
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

    if (oldStory && oldStory.isEdited) {
      // Preserved — don't touch edited stories
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
  const [state, setState] = useState<Agent2State>(INITIAL_STATE);
  const [isHydrated, setIsHydrated] = useState(false);

  // ── Hidratar desde localStorage ───────────────────────────────
  useEffect(() => {
    try {
      // Priority 1: Restore persisted Agent 2 state
      const saved = localStorage.getItem(STORAGE_KEY_AGENT_2);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<Agent2State>;
        if (parsed.epics && parsed.epics.length > 0) {
          setState({
            input: parsed.input ?? null,
            epics: parsed.epics,
            status: parsed.status === 'approved' ? 'approved' : 'review',
            error: parsed.error ?? null,
          });
          setIsHydrated(true);
          return;
        }
      }

      // Priority 2: Load input from Agent 1
      const inputRaw = localStorage.getItem(STORAGE_KEY_AGENT_2_INPUT);
      if (inputRaw) {
        const parsed = JSON.parse(inputRaw) as Agent2Input;
        if (parsed.wishes && parsed.wishes.length > 0) {
          setState((prev) => ({ ...prev, input: parsed }));
        }
      }
    } catch {
      // localStorage corrupto — usar estado inicial
    }
    setIsHydrated(true);
  }, []);

  // ── Persistir en localStorage ─────────────────────────────────
  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(
      STORAGE_KEY_AGENT_2,
      JSON.stringify({
        input: state.input,
        epics: state.epics,
        status: state.status,
        error: state.error,
      })
    );
  }, [state.epics, state.status, state.input, state.error, isHydrated]);

  // ── Handler: Generar backlog ──────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!state.input) return;

    setState((prev) => ({ ...prev, status: 'generating', error: null }));

    try {
      const response = await fetch('/api/agentes/2/generate', {
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
  }, [state.input]);

  // ── Handler: Regenerar backlog (merge) ────────────────────────
  const handleRegenerate = useCallback(async () => {
    if (!state.input) return;

    const confirmed = window.confirm(
      'Se generará un nuevo backlog. Los cambios manuales y las historias que hayas editado se conservarán.'
    );
    if (!confirmed) return;

    setState((prev) => ({ ...prev, status: 'generating', error: null }));

    try {
      const response = await fetch('/api/agentes/2/generate', {
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
  }, [state.input, state.epics]);

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

  // ── Handler: Añadir historia de usuario ───────────────────────
  const handleAddStory = useCallback(
    (epicId: string, story: Omit<UserStory, 'id' | 'source' | 'isEdited' | 'createdAt'>) => {
      setState((prev) => {
        // Find max HU ID across all epics to generate next sequential ID
        const allStories = prev.epics.flatMap((e) => e.userStories);
        let maxNum = 0;
        for (const s of allStories) {
          const match = s.id.match(/^HU-(\d+)$/);
          if (match) {
            maxNum = Math.max(maxNum, parseInt(match[1], 10));
          }
        }
        const newId = `HU-${String(maxNum + 1).padStart(3, '0')}`;

        const newStory: UserStory = {
          ...story,
          id: newId,
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
  const handleApprove = useCallback(() => {
    const sourceWishIds = state.input?.wishes.map((w) => w.id) ?? [];
    localStorage.setItem(
      STORAGE_KEY_AGENT_3_INPUT,
      JSON.stringify({
        epics: state.epics,
        sourceWishIds,
        approvedAt: Date.now(),
      })
    );
    setState((prev) => ({ ...prev, status: 'approved' }));
  }, [state.epics, state.input]);

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
            story.description.trim() !== '' &&
            story.acceptanceCriteria.length > 0
        )
    );

  // ── Evitar flash de contenido antes de hidratar ───────────────
  if (!isHydrated) {
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

              <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
                <button
                  onClick={() => {
                    localStorage.removeItem(STORAGE_KEY_AGENT_2);
                    setState(INITIAL_STATE);
                  }}
                  className="rounded-xl px-4 py-2.5 text-xs font-medium text-muted transition-all hover:bg-surface-hover hover:text-foreground cursor-pointer"
                >
                  Nueva sesión
                </button>
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
