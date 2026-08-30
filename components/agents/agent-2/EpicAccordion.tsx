/**
 * @fileoverview EpicAccordion — Épica colapsable con sus Historias de Usuario.
 */

'use client';

import { useState } from 'react';
import type { Epic, UserStory } from '@/lib/types/agent-2';
import { useConfirm } from '@/components/agents/shared/ConfirmDialog';
import { EpicHeader } from './EpicHeader';
import { UserStoryList } from './UserStoryList';
import { UserStoryFormModal, type UserStoryFormValues } from './UserStoryFormModal';

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formStory, setFormStory] = useState<UserStory | 'new' | null>(null);

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

  const handleFormSubmit = (values: UserStoryFormValues) => {
    if (formStory === 'new') {
      onAddStory(epic.id, {
        type: 'story',
        title: values.title,
        description: values.description,
        acceptanceCriteria: values.acceptanceCriteria,
        sourceWishIds: [],
      });
    } else if (formStory) {
      onEditStory(formStory.id, values);
    }
    setFormStory(null);
  };

  const storyCountLabel = `${epic.userStories.length} historia${epic.userStories.length !== 1 ? 's' : ''}`;
  const sourceHint =
    epic.source === 'manual' || epic.isEdited
      ? [epic.source === 'manual' ? 'Manual' : null, epic.isEdited ? 'Editado' : null]
          .filter(Boolean)
          .join(' · ')
      : null;

  return (
    <article className={index > 0 ? 'border-t border-border/60' : ''}>
      {isEditing ? (
        <div className="px-4 py-3 md:px-5">
          <EpicHeader
            epic={epic}
            onEdit={onEditEpic}
            onClose={() => setIsEditing(false)}
          />
        </div>
      ) : (
        <div className="group grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-start gap-x-2.5 px-4 py-3.5 md:px-5">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-0.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-md text-subtle transition-colors hover:bg-surface-hover hover:text-foreground"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Colapsar épica' : 'Expandir épica'}
          >
            <svg
              className={[
                'h-3.5 w-3.5 transition-transform duration-380 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
                isExpanded && 'rotate-90',
              ]
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

          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-foreground">
              {epic.title}
            </h3>
            {epic.description ? (
              <p className="mt-1 text-[13px] leading-relaxed text-muted">{epic.description}</p>
            ) : null}
            <p className="mt-1 text-[12px] text-subtle">
              {storyCountLabel}
              {sourceHint ? ` · ${sourceHint}` : ''}
            </p>

            {!isApproved ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-0.5 sm:hidden">
                <button
                  type="button"
                  onClick={() => setFormStory('new')}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-muted hover:bg-surface-hover hover:text-foreground"
                >
                  Añadir historia
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                  title="Editar"
                  aria-label="Editar épica"
                >
                  <PencilIcon />
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  className="inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 text-muted transition-colors hover:bg-red-500/10 hover:text-danger"
                  title="Eliminar"
                  aria-label="Eliminar épica"
                >
                  <TrashIcon />
                </button>
              </div>
            ) : null}
          </div>

          <div className="hidden items-center gap-0.5 sm:flex">
            {!isApproved ? (
              <button
                type="button"
                onClick={() => setFormStory('new')}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
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
                Añadir historia
              </button>
            ) : null}
            {!isApproved ? (
              <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                  title="Editar"
                  aria-label="Editar épica"
                >
                  <PencilIcon />
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  className="inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 text-muted transition-colors hover:bg-red-500/10 hover:text-danger"
                  title="Eliminar"
                  aria-label="Eliminar épica"
                >
                  <TrashIcon />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <div
        className={[
          'grid transition-[grid-template-rows] duration-380 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        ].join(' ')}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={[
              'mb-3 ml-8 md:ml-11',
              'transition-opacity duration-200 ease-out motion-reduce:transition-none',
              isExpanded ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
          >
            <UserStoryList
              stories={epic.userStories}
              onRequestEdit={(story) => setFormStory(story)}
              onDelete={onDeleteStory}
              isApproved={isApproved}
            />
          </div>
        </div>
      </div>

      <UserStoryFormModal
        open={formStory !== null}
        onClose={() => setFormStory(null)}
        onSubmit={handleFormSubmit}
        story={formStory === 'new' || formStory === null ? null : formStory}
        epicTitle={epic.title}
      />
    </article>
  );
}

function PencilIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}
