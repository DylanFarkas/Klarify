/**
 * @fileoverview UserStoryItem — Componente individual de Historia de Usuario.
 */

'use client';

import { useState } from 'react';
import type { UserStory } from '@/lib/types/agent-2';
import { DetailModal } from '@/components/agents/shared/DetailModal';
import { UserStoryDetailContent } from '@/components/agents/shared/UserStoryDetailContent';
import { useConfirm } from '@/components/agents/shared/ConfirmDialog';

interface UserStoryItemProps {
  story: UserStory;
  onRequestEdit: (story: UserStory) => void;
  onDelete: (id: string) => void;
  isApproved: boolean;
  index: number;
}

const iconBtnClass =
  'inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground';

export function UserStoryItem({
  story,
  onRequestEdit,
  onDelete,
  isApproved,
  index,
}: UserStoryItemProps) {
  const confirm = useConfirm();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: `¿Eliminar ${story.id}?`,
      description: `"${story.title}" se eliminará del backlog. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
    });
    if (!confirmed) return;

    setIsDeleting(true);
    setTimeout(() => onDelete(story.id), 200);
  };

  const sourceHint =
    story.source === 'manual' || story.isEdited
      ? [story.source === 'manual' ? 'Manual' : null, story.isEdited ? 'Editado' : null]
          .filter(Boolean)
          .join(' · ')
      : null;

  const actionButtons = !isApproved ? (
    <>
      <button
        type="button"
        onClick={() => setIsDetailOpen(true)}
        className={iconBtnClass}
        title="Ver"
        aria-label="Ver historia"
      >
        <EyeIcon />
      </button>
      <button
        type="button"
        onClick={() => onRequestEdit(story)}
        className={iconBtnClass}
        title="Editar"
        aria-label="Editar historia"
      >
        <PencilIcon />
      </button>
      <button
        type="button"
        onClick={() => void handleDelete()}
        className="inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 text-muted transition-colors hover:bg-red-500/10 hover:text-danger"
        title="Eliminar"
        aria-label="Eliminar historia"
      >
        <TrashIcon />
      </button>
    </>
  ) : (
    <button
      type="button"
      onClick={() => setIsDetailOpen(true)}
      className={iconBtnClass}
      title="Ver"
      aria-label="Ver historia"
    >
      <EyeIcon />
    </button>
  );

  return (
    <article
      className={[
        'group/story relative px-3 py-2.5 transition-colors hover:bg-surface-hover/30',
        isDeleting && 'opacity-0',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-start gap-x-2.5">
        <span className="mt-px text-[12px] tabular-nums text-subtle">{index + 1}</span>

        <div className="min-w-0">
          <p className="text-[13px] font-medium leading-snug text-foreground">{story.title}</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{story.description}</p>
          {(sourceHint || story.acceptanceCriteria.length > 0) ? (
            <p className="mt-1 text-[11px] text-subtle">
              {[
                sourceHint,
                story.acceptanceCriteria.length > 0
                  ? `${story.acceptanceCriteria.length} criterio${story.acceptanceCriteria.length !== 1 ? 's' : ''}`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          ) : null}

          <div className="mt-1.5 flex items-center gap-0.5 sm:hidden">{actionButtons}</div>
        </div>

        <div className="hidden items-center gap-0.5 sm:flex sm:opacity-0 sm:transition-opacity sm:group-hover/story:opacity-100 sm:focus-within:opacity-100">
          {actionButtons}
        </div>
      </div>

      <DetailModal
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={story.title}
        subtitle={story.id}
        eyebrow="Historia de usuario"
      >
        <UserStoryDetailContent story={story} />
      </DetailModal>
    </article>
  );
}

function EyeIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
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
