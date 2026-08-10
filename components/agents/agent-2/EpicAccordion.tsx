/**
 * @fileoverview EpicAccordion — Épica colapsable con sus Historias de Usuario.
 */

'use client';

import { useState } from 'react';
import type { Epic, UserStory } from '@/lib/types/agent-2';
import { useConfirm } from '@/components/agents/shared/ConfirmDialog';
import { EpicHeader } from './EpicHeader';
import { UserStoryList } from './UserStoryList';

interface EpicAccordionProps {
  epic: Epic;
  onEditEpic: (id: string, updates: Partial<Epic>) => void;
  onDeleteEpic: (id: string) => void;
  onEditStory: (id: string, updates: Partial<UserStory>) => void;
  onDeleteStory: (id: string) => void;
  onAddStory: (
    epicId: string,
    story: Omit<UserStory, 'id' | 'source' | 'isEdited' | 'createdAt'>
  ) => void;
  isApproved: boolean;
  index: number;
}

export function EpicAccordion({
  epic,
  onEditEpic,
  onDeleteEpic,
  onEditStory,
  onDeleteStory,
  onAddStory,
  isApproved,
  index,
}: EpicAccordionProps) {
  const confirm = useConfirm();
  const [isExpanded, setIsExpanded] = useState(true);

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: `¿Eliminar la épica "${epic.title}"?`,
      description: 'Se eliminarán también todas sus historias. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      variant: 'danger',
    });
    if (confirmed) {
      onDeleteEpic(epic.id);
    }
  };

  const handleAddStory = (
    story: Omit<UserStory, 'id' | 'source' | 'isEdited' | 'createdAt'>
  ) => {
    onAddStory(epic.id, story);
  };

  const displayNumber = String(index + 1).padStart(2, '0');

  return (
    <article
      className={[
        'group',
        index > 0 ? 'border-t border-border' : '',
      ].join(' ')}
    >
      <div className="flex items-start gap-2.5 px-4 py-3.5 transition-colors hover:bg-surface-hover/40 md:px-5">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-0.5 shrink-0 cursor-pointer rounded-md p-1 text-subtle transition-colors hover:bg-surface-hover hover:text-foreground"
          aria-label={isExpanded ? 'Colapsar épica' : 'Expandir épica'}
        >
          <svg
            className={['h-4 w-4 transition-transform duration-200', isExpanded && 'rotate-90']
              .filter(Boolean)
              .join(' ')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium tabular-nums text-subtle">
              {displayNumber}
            </span>
            <span className="font-mono text-[11px] text-subtle">{epic.id}</span>
            <h3 className="text-[15px] font-medium tracking-tight text-foreground">
              {epic.title}
            </h3>
            {epic.isEdited ? (
              <span className="text-[11px] text-subtle">· Editado</span>
            ) : null}
          </div>
          {!isExpanded ? (
            <p className="mt-0.5 text-[12px] text-muted">
              {epic.userStories.length} historia{epic.userStories.length !== 1 ? 's' : ''}
            </p>
          ) : null}
        </div>

        {!isApproved ? (
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="inline-flex shrink-0 cursor-pointer items-center rounded-md px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-red-500/10 hover:text-red-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
          >
            Eliminar
          </button>
        ) : null}
      </div>

      {isExpanded ? (
        <div className="border-t border-border/70 bg-surface-muted/25 px-4 py-3.5 md:px-5 md:pl-11">
          <EpicHeader epic={epic} onEdit={onEditEpic} isApproved={isApproved} />
          <div className="mt-3">
            <UserStoryList
              stories={epic.userStories}
              onEdit={onEditStory}
              onDelete={onDeleteStory}
              onAdd={handleAddStory}
              isApproved={isApproved}
            />
          </div>
        </div>
      ) : null}
    </article>
  );
}
