/**
 * @fileoverview WishItem — Componente individual de un deseo del cliente.
 *
 * Muestra un deseo con metadatos (origen, estado de edición) y acciones HITL.
 * La edición abre WishFormModal desde WishesList; no hay formulario inline.
 *
 * Cumple CA3 (HITL): Edición y eliminación manual de deseos.
 */

'use client';

import { useState } from 'react';
import type { Wish } from '@/lib/types/agent-1';
import { useConfirm } from '@/components/agents/shared/ConfirmDialog';

interface WishItemProps {
  /** El deseo a renderizar */
  wish: Wish;
  /** Callback para abrir el modal de edición */
  onRequestEdit: (wish: Wish) => void;
  /** Callback para eliminar el deseo */
  onDelete: (id: string) => void;
  /** Si la lista ya fue aprobada (deshabilita edición) */
  isApproved: boolean;
  /** Índice para el número de fila */
  index: number;
}

const iconBtnClass =
  'inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground';

export function WishItem({ wish, onRequestEdit, onDelete, isApproved, index }: WishItemProps) {
  const confirm = useConfirm();
  const [isDeleting, setIsDeleting] = useState(false);

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

  const sourceHint =
    wish.source === 'manual' || wish.isEdited
      ? [wish.source === 'manual' ? 'Manual' : null, wish.isEdited ? 'Editado' : null]
          .filter(Boolean)
          .join(' · ')
      : null;

  const actionButtons = !isApproved ? (
    <>
      <button
        type="button"
        onClick={() => onRequestEdit(wish)}
        className={iconBtnClass}
        title="Editar"
        aria-label="Editar deseo"
      >
        <PencilIcon />
      </button>
      <button
        type="button"
        onClick={() => void handleDelete()}
        className="inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 text-muted transition-colors hover:bg-red-500/10 hover:text-danger"
        title="Eliminar"
        aria-label="Eliminar deseo"
      >
        <TrashIcon />
      </button>
    </>
  ) : null;

  return (
    <article
      className={[
        'group relative px-4 py-3 transition-colors hover:bg-surface-hover/30 md:px-5',
        isDeleting && 'opacity-0',
      ]
        .filter(Boolean)
        .join(' ')}
    >
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

          {actionButtons ? (
            <div className="mt-1.5 flex items-center gap-0.5 sm:hidden">{actionButtons}</div>
          ) : null}
        </div>

        {actionButtons ? (
          <div className="hidden items-center gap-0.5 sm:flex sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-within:opacity-100">
            {actionButtons}
          </div>
        ) : null}
      </div>
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
