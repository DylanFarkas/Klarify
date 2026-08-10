/**
 * @fileoverview BacklogView — Contenedor principal del backlog generado.
 *
 * Renderiza la lista de Épicas colapsables (EpicAccordion).
 * Cumple CA2 (vista jerárquica) y CA3 (añadir épica manual).
 */

'use client';

import { useState } from 'react';
import type { Epic, UserStory } from '@/lib/types/agent-2';
import { EpicAccordion } from './EpicAccordion';

interface BacklogViewProps {
  epics: Epic[];
  onEditEpic: (id: string, updates: Partial<Epic>) => void;
  onDeleteEpic: (id: string) => void;
  onEditStory: (id: string, updates: Partial<UserStory>) => void;
  onDeleteStory: (id: string) => void;
  onAddStory: (
    epicId: string,
    story: Omit<UserStory, 'id' | 'source' | 'isEdited' | 'createdAt'>
  ) => void;
  onAddEpic: (
    epic: Omit<Epic, 'id' | 'source' | 'isEdited' | 'createdAt' | 'userStories'>
  ) => void;
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
      className="flex flex-col rounded-xl border border-border bg-surface"
      aria-labelledby="backlog-heading"
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3.5 md:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h3
              id="backlog-heading"
              className="text-[15px] font-semibold tracking-tight text-foreground"
            >
              Backlog
            </h3>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-foreground px-1.5 text-[11px] font-semibold tabular-nums text-background">
              {epics.length}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-muted">
            {totalStories} historia{totalStories !== 1 ? 's' : ''} de usuario · revisa y edita antes de aprobar.
          </p>
        </div>

        {!isApproved && !isAdding ? (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Añadir
          </button>
        ) : null}
      </div>

      <div className="max-h-140 flex-1 overflow-y-auto">
        {epics.length === 0 && !isAdding ? (
          <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
            <p className="text-sm text-muted">El backlog aparecerá aquí tras generar.</p>
            <p className="mt-1 text-[12px] text-subtle">
              O añade una épica manualmente para empezar.
            </p>
            {!isApproved ? (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="mt-4 cursor-pointer rounded-lg bg-foreground px-3.5 py-1.5 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
              >
                Añadir épica
              </button>
            ) : null}
          </div>
        ) : (
          <div>
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

            {!isApproved && isAdding ? (
              <div className="border-t border-border px-4 py-4 md:px-5">
                <p className="mb-2.5 text-[12px] font-medium text-muted">Nueva épica</p>
                <div className="flex flex-col gap-2.5">
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Título de la épica…"
                    className="w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm font-medium text-foreground outline-none transition-colors placeholder:text-placeholder focus:border-border-strong"
                  />
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={2}
                    placeholder="Descripción de la épica…"
                    className="w-full resize-none rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-placeholder focus:border-border-strong"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleCancelAdd}
                      className="cursor-pointer rounded-md px-2.5 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAdd}
                      disabled={isAddDisabled}
                      className="cursor-pointer rounded-md bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Añadir
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {epics.length > 0 ? (
        <div className="border-t border-border px-4 py-2.5 md:px-5">
          <p className="text-[12px] text-subtle">
            {autoEpics} épica{autoEpics !== 1 ? 's' : ''} por IA
            {manualEpics > 0
              ? ` · ${manualEpics} manual${manualEpics !== 1 ? 'es' : ''}`
              : ''}
            {' · '}
            {autoStories} HU{autoStories !== 1 ? 's' : ''} por IA
            {manualStories > 0
              ? ` · ${manualStories} HU${manualStories !== 1 ? 's' : ''} manual${manualStories !== 1 ? 'es' : ''}`
              : ''}
          </p>
        </div>
      ) : null}
    </section>
  );
}
