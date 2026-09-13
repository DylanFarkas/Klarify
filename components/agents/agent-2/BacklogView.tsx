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
import { EpicFormModal, type EpicFormValues } from './EpicFormModal';

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

  const totalStories = epics.reduce((sum, e) => sum + e.userStories.length, 0);
  const manualStories = epics.reduce(
    (sum, e) => sum + e.userStories.filter((s) => s.source === 'manual').length,
    0
  );
  const manualEpics = epics.filter((e) => e.source === 'manual').length;
  const manualCount = manualEpics + manualStories;

  const handleAdd = (values: EpicFormValues) => {
    onAddEpic({ title: values.title, description: values.description });
    setIsAdding(false);
  };

  return (
    <section
      className="flex flex-col rounded-xl bg-surface"
      aria-labelledby="backlog-heading"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 md:px-5">
        <div className="flex min-w-0 items-baseline gap-2">
          <h3
            id="backlog-heading"
            className="text-[15px] font-semibold tracking-tight text-foreground"
          >
            Backlog
          </h3>
          <span className="text-[12px] tabular-nums text-subtle">
            {totalStories}
            {manualCount > 0 ? ` · ${manualCount} manuales` : ''}
          </span>
        </div>

        {!isApproved ? (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
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
            Añadir épica
          </button>
        ) : null}
      </div>

      {epics.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
          <p className="text-sm text-muted">Aún no hay épicas.</p>
          <p className="mt-1 text-[12px] text-subtle">
            Añade una manualmente o vuelve a generar el backlog.
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
        </div>
      )}

      <EpicFormModal
        open={isAdding}
        onClose={() => setIsAdding(false)}
        onSubmit={handleAdd}
      />
    </section>
  );
}
