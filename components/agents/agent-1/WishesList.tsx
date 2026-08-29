/**
 * @fileoverview WishesList — Lista HITL de deseos (foco de la revisión).
 *
 * Cumple CA2 (listado estructurado) y CA3 (HITL: editar/añadir/eliminar).
 */

'use client';

import { useState } from 'react';
import type { Wish } from '@/lib/types/agent-1';
import { WishItem } from './WishItem';
import { AddWishForm } from './AddWishForm';

interface WishesListProps {
  wishes: Wish[];
  onEdit: (id: string, newText: string) => void;
  onDelete: (id: string) => void;
  onAdd: (text: string) => void;
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

  const manualCount = wishes.filter((w) => w.source === 'manual').length;

  return (
    <section
      className="flex flex-col rounded-xl bg-surface"
      aria-labelledby="wishes-heading"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 md:px-5">
        <div className="flex min-w-0 items-baseline gap-2">
          <h3
            id="wishes-heading"
            className="text-[15px] font-semibold tracking-tight text-foreground"
          >
            Deseos del cliente
          </h3>
          <span className="text-[12px] tabular-nums text-subtle">
            {wishes.length}
            {manualCount > 0 ? ` · ${manualCount} manuales` : ''}
          </span>
        </div>

        {!isApproved && !isAddingWish ? (
          <button
            id="add-wish-button"
            type="button"
            onClick={() => setIsAddingWish(true)}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
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

      {wishes.length === 0 && !isAddingWish ? (
        <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
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
            <li className={wishes.length > 0 ? 'border-t border-border/60' : ''}>
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
    </section>
  );
}
