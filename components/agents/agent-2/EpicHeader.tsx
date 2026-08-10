/**
 * @fileoverview EpicHeader — Título y descripción editables de una Épica.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import type { Epic } from '@/lib/types/agent-2';

interface EpicHeaderProps {
  epic: Epic;
  onEdit: (id: string, updates: Partial<Epic>) => void;
  isApproved: boolean;
}

export function EpicHeader({ epic, onEdit, isApproved }: EpicHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(epic.title);
  const [editDescription, setEditDescription] = useState(epic.description);
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
    if (!trimmedTitle) return;

    const hasChanges =
      trimmedTitle !== epic.title || trimmedDesc !== epic.description;

    if (hasChanges) {
      onEdit(epic.id, {
        title: trimmedTitle,
        description: trimmedDesc,
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(epic.title);
    setEditDescription(epic.description);
    setIsEditing(false);
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

  return (
    <div className="flex flex-col gap-2">
      {isEditing ? (
        <div className="flex flex-col gap-2.5">
          <input
            ref={titleRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Título de la épica…"
            className="w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm font-medium text-foreground outline-none transition-colors placeholder:text-placeholder focus:border-border-strong"
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Descripción de la épica…"
            className="w-full resize-none rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-placeholder focus:border-border-strong"
          />
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
              disabled={!editTitle.trim()}
              className="cursor-pointer rounded-md bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Guardar
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-muted">{epic.description}</p>
          {!isApproved ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex cursor-pointer items-center self-start rounded-md px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            >
              Editar épica
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
