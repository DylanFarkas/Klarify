/**
 * @fileoverview UserStoryList — Lista de Historias de Usuario dentro de una Épica.
 */

'use client';

import { useState } from 'react';
import type { UserStory } from '@/lib/types/agent-2';
import { UserStoryItem } from './UserStoryItem';

interface UserStoryListProps {
  stories: UserStory[];
  onEdit: (id: string, updates: Partial<UserStory>) => void;
  onDelete: (id: string) => void;
  onAdd: (story: Omit<UserStory, 'id' | 'source' | 'isEdited' | 'createdAt'>) => void;
  isApproved: boolean;
}

export function UserStoryList({
  stories,
  onEdit,
  onDelete,
  onAdd,
  isApproved,
}: UserStoryListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCriteria, setNewCriteria] = useState('');

  const handleAdd = () => {
    const trimmedTitle = newTitle.trim();
    const trimmedDesc = newDescription.trim();
    if (!trimmedTitle || !trimmedDesc) return;

    const criteria = newCriteria
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    onAdd({
      title: trimmedTitle,
      description: trimmedDesc,
      acceptanceCriteria: criteria,
      sourceWishIds: [],
    });

    setNewTitle('');
    setNewDescription('');
    setNewCriteria('');
    setIsAdding(false);
  };

  const handleCancelAdd = () => {
    setNewTitle('');
    setNewDescription('');
    setNewCriteria('');
    setIsAdding(false);
  };

  const isAddDisabled = !newTitle.trim() || !newDescription.trim();

  return (
    <div className="flex flex-col gap-2.5">
      {stories.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          {stories.map((story, index) => (
            <UserStoryItem
              key={story.id}
              story={story}
              onEdit={onEdit}
              onDelete={onDelete}
              isApproved={isApproved}
              index={index}
            />
          ))}
        </div>
      ) : null}

      {!isApproved ? (
        isAdding ? (
          <div className="rounded-lg border border-border bg-surface px-3.5 py-3.5">
            <p className="mb-2.5 text-[12px] font-medium text-muted">Nueva historia de usuario</p>
            <div className="flex flex-col gap-2.5">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Título de la HU…"
                className="w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm font-medium text-foreground outline-none transition-colors placeholder:text-placeholder focus:border-border-strong"
              />
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
                placeholder="Como [rol], quiero [acción] para [beneficio]…"
                className="w-full resize-none rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-placeholder focus:border-border-strong"
              />
              <input
                value={newCriteria}
                onChange={(e) => setNewCriteria(e.target.value)}
                placeholder="Criterios (separados por coma)…"
                className="w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-placeholder focus:border-border-strong"
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
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex cursor-pointer items-center gap-1 self-start rounded-md px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
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
            Añadir HU
          </button>
        )
      ) : null}
    </div>
  );
}
