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
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(wish.text);
  const [isDeleting, setIsDeleting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Autofocar textarea al entrar en modo edición
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(editText.length, editText.length);
    }
  }, [isEditing, editText.length]);

  // ── Handlers ──────────────────────────────────────────────────
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

  const handleDelete = () => {
    setIsDeleting(true);
    // Delay para animación de salida
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

  return (
    <article
      className={[
        'group rounded-xl border border-border bg-surface-muted p-4',
        'transition-all duration-300',
        'hover:border-border-strong hover:bg-surface-hover',
        isDeleting && 'scale-95 opacity-0',
        isEditing && 'border-primary/40 bg-primary/5',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* ── Header: ID + badges ────────────────────────────────── */}
      <div className="mb-2 flex items-center gap-2">
        {/* ID del deseo */}
        <span className="text-xs font-bold font-mono text-muted">
          {wish.id}
        </span>

        {/* Badge de origen */}
        <span
          className={[
            'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]',
            wish.source === 'auto'
              ? 'bg-primary/20 text-primary'
              : 'bg-purple-500/20 text-purple-400',
          ].join(' ')}
        >
          {wish.source === 'auto' ? 'IA' : 'Manual'}
        </span>

        {/* Badge de editado */}
        {wish.isEdited && (
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-amber-400">
            Editado
          </span>
        )}
      </div>

      {/* ── Contenido ──────────────────────────────────────────── */}
      {isEditing ? (
        // Modo edición
        <div className="flex flex-col gap-3">
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            className={[
              'w-full resize-none rounded-lg border border-input-border bg-surface px-3 py-2',
              'text-sm text-foreground placeholder:text-placeholder',
              'outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30',
              'transition-all duration-200',
            ].join(' ')}
            placeholder="Escribe el deseo del cliente..."
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
              disabled={!editText.trim()}
              className={[
                'rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer',
                editText.trim()
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
          <p className="text-sm leading-relaxed text-body">
            {wish.text}
          </p>

          {/* Acciones (visibles en hover o en mobile) */}
          {!isApproved && (
            <div className="mt-3 flex items-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover transition-all cursor-pointer"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                Editar
              </button>
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-muted hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Eliminar
              </button>
            </div>
          )}
        </>
      )}
    </article>
  );
}
