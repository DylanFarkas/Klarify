/**
 * @fileoverview EpicHeader — Título y descripción editables de una Épica.
 *
 * Muestra el título (bold) y descripción (muted) de una épica,
 * con opción de editar ambos campos inline.
 *
 * Patrón replicado de WishItem.tsx (edición inline de campos).
 *
 * Cumple CA3 (HITL: edición manual de épicas).
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import type { Epic } from '@/lib/types/agent-2';

interface EpicHeaderProps {
  /** La épica a renderizar */
  epic: Epic;
  /** Callback para editar campos de la épica */
  onEdit: (id: string, updates: Partial<Epic>) => void;
  /** Si la lista ya fue aprobada (deshabilita edición) */
  isApproved: boolean;
}

export function EpicHeader({ epic, onEdit, isApproved }: EpicHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(epic.title);
  const [editDescription, setEditDescription] = useState(epic.description);
  const titleRef = useRef<HTMLInputElement>(null);

  // Autofocar título al entrar en modo edición
  useEffect(() => {
    if (isEditing && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.setSelectionRange(editTitle.length, editTitle.length);
    }
  }, [isEditing, editTitle.length]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleSave = () => {
    const trimmedTitle = editTitle.trim();
    const trimmedDesc = editDescription.trim();
    if (!trimmedTitle) return;

    const hasChanges =
      trimmedTitle !== epic.title ||
      trimmedDesc !== epic.description;

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
        // Modo edición
        <div className="flex flex-col gap-2">
          <input
            ref={titleRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Título de la épica..."
            className={[
              'w-full rounded-lg border border-input-border bg-surface px-3 py-2',
              'text-sm font-bold text-foreground placeholder:text-placeholder',
              'outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30',
              'transition-all duration-200',
            ].join(' ')}
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            onKeyDown={handleKeyDown}
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
              onClick={handleCancel}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!editTitle.trim()}
              className={[
                'rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer',
                editTitle.trim()
                  ? 'bg-primary text-white hover:bg-primary-hover'
                  : 'bg-disabled text-disabled-text cursor-not-allowed',
              ].join(' ')}
            >
              Guardar
            </button>
          </div>
        </div>
      ) : (
        // Modo lectura
        <>
          <p className="text-sm leading-relaxed text-muted">
            {epic.description}
          </p>
          {!isApproved && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1 self-start rounded-lg px-2.5 py-1 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover transition-all cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              Editar épica
            </button>
          )}
        </>
      )}
    </div>
  );
}
