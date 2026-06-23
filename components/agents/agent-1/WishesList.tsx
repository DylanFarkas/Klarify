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

  // Contadores para stats
  const autoCount = wishes.filter((w) => w.source === 'auto').length;
  const manualCount = wishes.filter((w) => w.source === 'manual').length;

  return (
    <section
      className="flex flex-col rounded-2xl border border-border bg-surface-muted backdrop-blur-sm animate-[fadeIn_0.5s_ease-out]"
      aria-labelledby="wishes-heading"
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <h3 id="wishes-heading" className="text-lg font-bold text-foreground">
            Deseos del Cliente
          </h3>
          <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
            {wishes.length}
          </span>
        </div>

        {/* Botón añadir (solo si no está aprobado) */}
        {!isApproved && !isAddingWish && (
          <button
            id="add-wish-button"
            onClick={() => setIsAddingWish(true)}
            className={[
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5',
              'text-xs font-bold text-primary',
              'hover:bg-primary/10 transition-colors cursor-pointer',
            ].join(' ')}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Añadir
          </button>
        )}
      </div>

      {/* ── Contenido ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 max-h-[500px]">
        {wishes.length === 0 && !isAddingWish ? (
          // Estado vacío
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-hover">
              <svg
                className="h-7 w-7 text-icon-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                />
              </svg>
            </div>
            <p className="text-sm text-subtle">
              Los deseos del cliente aparecerán aquí tras procesar el archivo.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Lista de deseos */}
            {wishes.map((wish, index) => (
              <WishItem
                key={wish.id}
                wish={wish}
                onEdit={onEdit}
                onDelete={onDelete}
                isApproved={isApproved}
                index={index}
              />
            ))}

            {/* Formulario de nuevo deseo */}
            {isAddingWish && (
              <AddWishForm
                onAdd={(text) => {
                  onAdd(text);
                  setIsAddingWish(false);
                }}
                onCancel={() => setIsAddingWish(false)}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Footer con stats ───────────────────────────────────── */}
      {wishes.length > 0 && (
        <div className="border-t border-border px-6 py-3">
          <div className="flex items-center gap-4 text-xs text-subtle">
            <span>{autoCount} extraídos por IA</span>
            {manualCount > 0 && (
              <>
                <span>•</span>
                <span>{manualCount} añadidos manualmente</span>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
