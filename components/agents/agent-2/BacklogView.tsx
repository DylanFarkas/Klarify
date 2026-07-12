/**
 * @fileoverview BacklogView — Contenedor principal del backlog generado.
 *
 * Renderiza la lista de Épicas colapsables (EpicAccordion) en un
 * contenedor scrollable. Patrón replicado del container de WishesList.tsx.
 *
 * Cumple CA2 (vista jerárquica colapsable del backlog) y CA3 (añadir épica manual).
 */

'use client';

import { useState } from 'react';
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
  /** Callback para añadir una nueva épica */
  onAddEpic: (epic: Omit<Epic, 'id' | 'source' | 'isEdited' | 'createdAt' | 'userStories'>) => void;
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
  onAddEpic,
  isApproved,
}: BacklogViewProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Stats globales
  const totalStories = epics.reduce((sum, e) => sum + e.userStories.length, 0);
  const autoStories = epics.reduce(
    (sum, e) => sum + e.userStories.filter((s) => s.source === 'auto').length,
    0
  );
  const manualStories = totalStories - autoStories;
  const manualEpics = epics.filter((e) => e.source === 'manual').length;
  const autoEpics = epics.length - manualEpics;

  const handleAdd = () => {
    const trimmedTitle = newTitle.trim();
    const trimmedDesc = newDescription.trim();
    if (!trimmedTitle) return;

    onAddEpic({ title: trimmedTitle, description: trimmedDesc });
    setNewTitle('');
    setNewDescription('');
    setIsAdding(false);
  };

  const handleCancelAdd = () => {
    setNewTitle('');
    setNewDescription('');
    setIsAdding(false);
  };

  const isAddDisabled = !newTitle.trim();

  return (
    <section
      className="flex flex-col rounded-2xl border border-border bg-surface-muted backdrop-blur-sm animate-[fadeIn_0.5s_ease-out]"
      aria-labelledby="backlog-heading"
    >
      {/* ── Header con ícono ─────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
          </div>
          <h3 id="backlog-heading" className="text-lg font-bold text-foreground">
            Backlog
          </h3>
          <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
            {epics.length} épica{epics.length !== 1 ? 's' : ''} · {totalStories} HU{totalStories !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Contenido scrollable ───────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 max-h-[700px]">
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

            {!isApproved && (
              isAdding ? (
                <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 animate-[fadeIn_0.2s_ease-out]">
                  <label className="mb-2 block text-xs font-bold text-muted">
                    Nueva Épica
                  </label>

                  <div className="flex flex-col gap-3">
                    <input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Título de la épica..."
                      className={[
                        'w-full rounded-lg border border-input-border bg-surface px-3 py-2',
                        'text-sm font-semibold text-foreground placeholder:text-placeholder',
                        'outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30',
                        'transition-all duration-200',
                      ].join(' ')}
                    />

                    <textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      rows={2}
                      placeholder="Descripción de la épica..."
                      className={[
                        'w-full resize-none rounded-lg border border-input-border bg-surface px-3 py-2',
                        'text-sm text-foreground placeholder:text-placeholder',
                        'outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30',
                        'transition-all duration-200',
                      ].join(' ')}
                    />

                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={handleCancelAdd}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleAdd}
                        disabled={isAddDisabled}
                        className={[
                          'inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition-all cursor-pointer',
                          !isAddDisabled
                            ? 'bg-primary text-white hover:bg-primary-hover'
                            : 'bg-disabled text-disabled-text cursor-not-allowed',
                        ].join(' ')}
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Añadir
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAdding(true)}
                  className={[
                    'flex items-center gap-1.5 self-start rounded-lg border border-dashed border-border px-3 py-1.5',
                    'text-xs font-medium text-muted transition-all cursor-pointer',
                    'hover:border-primary/40 hover:bg-primary/5 hover:text-primary',
                  ].join(' ')}
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Añadir Épica
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* ── Footer con stats ───────────────────────────────────── */}
      {epics.length > 0 && (
        <div className="border-t border-border px-6 py-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtle">
            <span>{autoEpics} épica{autoEpics !== 1 ? 's' : ''} por IA</span>
            {manualEpics > 0 && (
              <>
                <span>·</span>
                <span>{manualEpics} épica{manualEpics !== 1 ? 's' : ''} manual{manualEpics !== 1 ? 'es' : ''}</span>
              </>
            )}
            <span>·</span>
            <span>{autoStories} HU{autoStories !== 1 ? 's' : ''} por IA</span>
            {manualStories > 0 && (
              <>
                <span>·</span>
                <span>{manualStories} HU{manualStories !== 1 ? 's' : ''} manual{manualStories !== 1 ? 'es' : ''}</span>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
