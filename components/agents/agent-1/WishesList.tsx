/**
 * @fileoverview WishesList — Panel de deseos del cliente (lado derecho).
 *
 * Renderiza la lista de deseos extraídos con acciones HITL (editar,
 * eliminar, añadir). Muestra un contador y estado vacío.
 *
 * Cumple CA2 (listado estructurado) y CA3 (HITL: editar/añadir/eliminar).
 */

'use client';

import { useState } from 'react';
import type { Wish } from '@/lib/types/agent-1';
import { WishItem } from './WishItem';
import { AddWishForm } from './AddWishForm';

interface WishesListProps {
  /** Lista actual de deseos */
  wishes: Wish[];
  /** Callback para editar un deseo */
  onEdit: (id: string, newText: string) => void;
  /** Callback para eliminar un deseo */
  onDelete: (id: string) => void;
  /** Callback para añadir un nuevo deseo */
  onAdd: (text: string) => void;
  /** Si la lista ya fue aprobada (deshabilita edición) */
  isApproved: boolean;
}

export function WishesList({
  wishes,
  onEdit,
  onDelete,
  onAdd,
  isApproved,
}: WishesListProps) {
  const [isAddingWish, setIsAddingWish] = useState(false);

  const autoCount = wishes.filter((w) => w.source === 'auto').length;
  const manualCount = wishes.filter((w) => w.source === 'manual').length;

  return (
    <section
      className="flex flex-col rounded-xl border border-border bg-surface"
      aria-labelledby="wishes-heading"
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3.5 md:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h3
              id="wishes-heading"
              className="text-[15px] font-semibold tracking-tight text-foreground"
            >
              Deseos del cliente
            </h3>
            <span className="text-[12px] tabular-nums text-subtle">{wishes.length}</span>
          </div>
          <p className="mt-1 text-[12px] text-muted">
            Revisa, edita o añade lo que debe entrar al backlog.
          </p>
        </div>

        {!isApproved && !isAddingWish ? (
          <button
            id="add-wish-button"
            type="button"
            onClick={() => setIsAddingWish(true)}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-surface-hover"
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
            Añadir
          </button>
        ) : null}
      </div>

      <div className="max-h-140 flex-1 overflow-y-auto">
        {wishes.length === 0 && !isAddingWish ? (
          <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
            <p className="text-sm text-muted">Aún no hay deseos.</p>
            <p className="mt-1 text-[12px] text-subtle">
              Añade uno manualmente o vuelve a procesar el contexto.
            </p>
            {!isApproved ? (
              <button
                type="button"
                onClick={() => setIsAddingWish(true)}
                className="mt-4 cursor-pointer rounded-lg bg-foreground px-3.5 py-1.5 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
              >
                Añadir deseo
              </button>
            ) : null}
          </div>
        ) : (
          <ol>
            {wishes.map((wish, index) => (
              <li key={wish.id}>
                <WishItem
                  wish={wish}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  isApproved={isApproved}
                  index={index}
                />
              </li>
            ))}

            {isAddingWish ? (
              <li className={wishes.length > 0 ? 'border-t border-border' : ''}>
                <AddWishForm
                  onAdd={(text) => {
                    onAdd(text);
                    setIsAddingWish(false);
                  }}
                  onCancel={() => setIsAddingWish(false)}
                />
              </li>
            ) : null}
          </ol>
        )}
      </div>

      {wishes.length > 0 ? (
        <div className="border-t border-border px-4 py-2.5 md:px-5">
          <p className="text-[12px] text-subtle">
            {autoCount} por IA
            {manualCount > 0 ? ` · ${manualCount} manuales` : ''}
            {' · '}
            {wishes.length} en total
          </p>
        </div>
      ) : null}
    </section>
  );
}
