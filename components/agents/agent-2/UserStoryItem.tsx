/**
 * @fileoverview UserStoryItem — Componente individual de Historia de Usuario.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import type { UserStory } from '@/lib/types/agent-2';
import { AcceptanceCriteriaEditor } from './AcceptanceCriteriaEditor';
import { DetailModal } from '@/components/agents/shared/DetailModal';
import { ViewDetailsButton } from '@/components/agents/shared/ViewDetailsButton';
import { UserStoryDetailContent } from '@/components/agents/shared/UserStoryDetailContent';
import { useConfirm } from '@/components/agents/shared/ConfirmDialog';

interface UserStoryItemProps {
  story: UserStory;
  onEdit: (id: string, updates: Partial<UserStory>) => void;
  onDelete: (id: string) => void;
  isApproved: boolean;
  index: number;
}

export function UserStoryItem({ story, onEdit, onDelete, isApproved, index }: UserStoryItemProps) {
  const confirm = useConfirm();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(story.title);
  const [editDescription, setEditDescription] = useState(story.description);
  const [editCriteria, setEditCriteria] = useState<string[]>(story.acceptanceCriteria);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && titleRef.current) {
      titleRef.current.focus();
      const len = titleRef.current.value.length;
      titleRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmedTitle = editTitle.trim();
    const trimmedDesc = editDescription.trim();
    if (!trimmedTitle || !trimmedDesc) return;

    const hasChanges =
      trimmedTitle !== story.title ||
      trimmedDesc !== story.description ||
      JSON.stringify(editCriteria) !== JSON.stringify(story.acceptanceCriteria);

    if (hasChanges) {
      onEdit(story.id, {
        title: trimmedTitle,
        description: trimmedDesc,
        acceptanceCriteria: editCriteria,
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(story.title);
    setEditDescription(story.description);
    setEditCriteria(story.acceptanceCriteria);
    setIsEditing(false);
  };

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const isSaveDisabled = !editTitle.trim() || !editDescription.trim();
  const displayNumber = String(index + 1).padStart(2, '0');

  return (
    <article
      className={[
        'group/story px-3.5 py-3.5 transition-colors',
        index > 0 ? 'border-t border-border' : '',
        isEditing ? 'bg-surface-hover/50' : 'hover:bg-surface-hover/40',
        isDeleting && 'opacity-0',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[11px] font-medium tabular-nums text-subtle">
          {displayNumber}
        </span>
        <span className="font-mono text-[11px] text-subtle">{story.id}</span>
        <span className="text-[11px] text-subtle">
          · {story.source === 'auto' ? 'IA' : 'Manual'}
          {story.isEdited ? ' · Editado' : ''}
        </span>
        <div className="ml-auto">
          <ViewDetailsButton onClick={() => setIsDetailOpen(true)} />
        </div>
      </div>

      {isEditing ? (
        <div className="flex flex-col gap-2.5">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-subtle">Título</label>
            <input
              ref={titleRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Título de la Historia de Usuario…"
              className="w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm font-medium text-foreground outline-none transition-colors placeholder:text-placeholder focus:border-border-strong"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-subtle">Descripción</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder="Como [rol], quiero [acción] para [beneficio]…"
              className="w-full resize-none rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-placeholder focus:border-border-strong"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-subtle">
              Criterios de aceptación
            </label>
            <AcceptanceCriteriaEditor
              criteria={editCriteria}
              onChange={setEditCriteria}
              disabled={false}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="cursor-pointer rounded-md px-2.5 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaveDisabled}
              className="cursor-pointer rounded-md bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Guardar
            </button>
          </div>
        </div>
      ) : (
        <>
          <h4 className="text-[15px] font-medium leading-snug text-foreground">{story.title}</h4>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">
            {story.description}
          </p>

          {story.acceptanceCriteria.length > 0 ? (
            <p className="mt-1.5 text-[12px] text-subtle">
              {story.acceptanceCriteria.length} criterio
              {story.acceptanceCriteria.length !== 1 ? 's' : ''}
            </p>
          ) : null}

          {!isApproved ? (
            <div className="mt-2.5 flex items-center gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover/story:opacity-100 sm:focus-within:opacity-100">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
              >
                Eliminar
              </button>
            </div>
          ) : null}
        </>
      )}

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
