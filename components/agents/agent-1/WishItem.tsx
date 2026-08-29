/**
 * @fileoverview WishItem — Componente individual de un deseo del cliente.
 *
 * Muestra un deseo con sus metadatos (ID, origen, estado de edición)
 * y permite editar o eliminar el texto inline.
 *
 * Cumple CA3 (HITL): Edición y eliminación manual de deseos.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import type { Wish } from '@/lib/types/agent-1';
import { useConfirm } from '@/components/agents/shared/ConfirmDialog';

interface WishItemProps {
  /** El deseo a renderizar */
  wish: Wish;
  /** Callback para editar el texto del deseo */
  onEdit: (id: string, newText: string) => void;
  /** Callback para eliminar el deseo */
  onDelete: (id: string) => void;
  /** Si la lista ya fue aprobada (deshabilita edición) */
  isApproved: boolean;
  /** Índice para animación escalonada */
  index: number;
}

export function WishItem({ wish, onEdit, onDelete, isApproved, index }: WishItemProps) {
  const confirm = useConfirm();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(wish.text);
  const [isDeleting, setIsDeleting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) {
      setEditText(wish.text);
    }
  }, [wish.text, isEditing]);

  const handleSave = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== wish.text) {
      onEdit(wish.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(wish.text);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: `¿Eliminar ${wish.id}?`,
      description: 'Se eliminará este deseo de la lista. Puedes volver a añadirlo manualmente si lo necesitas.',
      confirmLabel: 'Eliminar',
      variant: 'danger',
    });
    if (!confirmed) return;

    setIsDeleting(true);
    setTimeout(() => onDelete(wish.id), 200);
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

  const sourceHint =
    wish.source === 'manual' || wish.isEdited
      ? [wish.source === 'manual' ? 'Manual' : null, wish.isEdited ? 'Editado' : null]
          .filter(Boolean)
          .join(' · ')
      : null;

  return (
    <article
      className={[
        'group relative px-4 py-3 transition-colors md:px-5',
        index > 0 ? '' : '',
        isEditing ? 'bg-surface-hover/50' : 'hover:bg-surface-hover/30',
        isDeleting && 'opacity-0',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {isEditing ? (
        <div className="flex flex-col gap-2.5">
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            className="w-full resize-none rounded-lg border border-input-border bg-input px-3 py-2.5 text-[15px] leading-relaxed text-foreground outline-none transition-colors placeholder:text-placeholder focus:border-border-strong"
            placeholder="Escribe el deseo del cliente…"
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
              disabled={!editText.trim()}
              className="cursor-pointer rounded-md bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Guardar
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-start gap-x-2.5">
          <span className="mt-px text-[12px] tabular-nums text-subtle">
            {index + 1}
          </span>

          <div className="min-w-0">
            <p className="text-[15px] font-medium leading-snug text-foreground">
              {wish.text}
            </p>
            {sourceHint ? (
              <p className="mt-1 text-[11px] text-subtle">{sourceHint}</p>
            ) : null}

            {!isApproved ? (
              <div className="mt-1.5 flex items-center gap-1 sm:hidden">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex cursor-pointer items-center rounded-md px-2 py-1 text-[12px] font-medium text-muted hover:bg-surface-hover hover:text-foreground"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  className="inline-flex cursor-pointer items-center rounded-md px-2 py-1 text-[12px] font-medium text-muted hover:bg-red-500/10 hover:text-red-500"
                >
                  Eliminar
                </button>
              </div>
            ) : null}
          </div>

          {!isApproved ? (
            <div className="hidden items-center gap-0.5 sm:flex sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-within:opacity-100">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="cursor-pointer rounded-md px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                className="cursor-pointer rounded-md px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
              >
                Eliminar
              </button>
            </div>
          ) : null}
        </div>
      )}
    </article>
  );
}
