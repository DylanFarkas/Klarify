/**
 * @fileoverview BacklogView — Contenedor principal del backlog generado.
 *
 * Renderiza la lista de Épicas colapsables (EpicAccordion) en un
 * contenedor scrollable. Patrón replicado del container de WishesList.tsx.
 *
 * Cumple CA2 (vista jerárquica colapsable del backlog).
 */

'use client';

import type { Epic, UserStory } from '@/lib/types/agent-2';
import { EpicAccordion } from './EpicAccordion';

interface BacklogViewProps {
  /** Lista de épicas del backlog */
  epics: Epic[];
  /** Callback para editar campos de una épica */
  onEditEpic: (id: string, updates: Partial<Epic>) => void;
  /** Callback para eliminar una épica */
  onDeleteEpic: (id: string) => void;
  /** Callback para editar campos de una HU */
  onEditStory: (id: string, updates: Partial<UserStory>) => void;
  /** Callback para eliminar una HU */
  onDeleteStory: (id: string) => void;
  /** Callback para añadir una nueva HU a una épica */
  onAddStory: (epicId: string, story: Omit<UserStory, 'id' | 'source' | 'isEdited' | 'createdAt'>) => void;
  /** Si el backlog ya fue aprobado (deshabilita edición) */
  isApproved: boolean;
}

export function BacklogView({
  epics,
  onEditEpic,
  onDeleteEpic,
  onEditStory,
  onDeleteStory,
  onAddStory,
  isApproved,
}: BacklogViewProps) {
  // Stats globales
  const totalStories = epics.reduce((sum, e) => sum + e.userStories.length, 0);
  const autoStories = epics.reduce(
    (sum, e) => sum + e.userStories.filter((s) => s.source === 'auto').length,
    0
  );
  const manualStories = totalStories - autoStories;

  return (
    <section
      className="flex flex-col rounded-2xl border border-border bg-surface-muted backdrop-blur-sm animate-[fadeIn_0.5s_ease-out]"
      aria-labelledby="backlog-heading"
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <h3 id="backlog-heading" className="text-lg font-bold text-foreground">
            Backlog
          </h3>
          <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
            {epics.length} épica{epics.length !== 1 ? 's' : ''} · {totalStories} HU{totalStories !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Contenido scrollable ───────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 max-h-[600px]">
        {epics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-hover">
              <svg
                className="h-7 w-7 text-icon-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
                />
              </svg>
            </div>
            <p className="text-sm text-subtle">
              El backlog aparecerá aquí tras generar épicas e historias de usuario.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {epics.map((epic, index) => (
              <EpicAccordion
                key={epic.id}
                epic={epic}
                onEditEpic={onEditEpic}
                onDeleteEpic={onDeleteEpic}
                onEditStory={onEditStory}
                onDeleteStory={onDeleteStory}
                onAddStory={onAddStory}
                isApproved={isApproved}
                index={index}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer con stats ───────────────────────────────────── */}
      {epics.length > 0 && (
        <div className="border-t border-border px-6 py-3">
          <div className="flex items-center gap-4 text-xs text-subtle">
            <span>{autoStories} generadas por IA</span>
            {manualStories > 0 && (
              <>
                <span>·</span>
                <span>{manualStories} añadidas manualmente</span>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
