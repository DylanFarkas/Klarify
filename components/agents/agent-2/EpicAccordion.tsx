/**
 * @fileoverview EpicAccordion — Épica colapsable con sus Historias de Usuario.
 *
 * Componente central de CA2: renderiza una épica con header colapsable
 * y lista de HUs expandible. Controla expand/collapse via estado local.
 *
 * Patrón de hover-reveal replicado de WishItem.tsx (group + opacity).
 * Confirmación de eliminación via window.confirm (patrón simple, sin modal).
 *
 * Cumple CA2 (vista jerárquica colapsable) y CA3 (HITL: editar/eliminar épicas).
 */

'use client';

import { useState } from 'react';
import type { Epic } from '@/lib/types/agent-2';
import { EpicHeader } from './EpicHeader';
import { UserStoryList } from './UserStoryList';

interface EpicAccordionProps {
  /** La épica a renderizar */
  epic: Epic;
  /** Callback para editar campos de la épica */
  onEditEpic: (id: string, updates: Partial<Epic>) => void;
  /** Callback para eliminar la épica */
  onDeleteEpic: (id: string) => void;
  /** Callback para editar campos de una HU */
  onEditStory: (id: string, updates: Partial<import('@/lib/types/agent-2').UserStory>) => void;
  /** Callback para eliminar una HU */
  onDeleteStory: (id: string) => void;
  /** Callback para añadir una nueva HU a esta épica */
  onAddStory: (epicId: string, story: Omit<import('@/lib/types/agent-2').UserStory, 'id' | 'source' | 'isEdited' | 'createdAt'>) => void;
  /** Si la lista ya fue aprobada (deshabilita edición) */
  isApproved: boolean;
  /** Índice para animación escalonada */
  index: number;
}

export function EpicAccordion({
  epic,
  onEditEpic,
  onDeleteEpic,
  onEditStory,
  onDeleteStory,
  onAddStory,
  isApproved,
  index,
}: EpicAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleDelete = () => {
    const confirmed = window.confirm(
      `¿Eliminar la épica "${epic.title}" y todas sus historias? Esta acción no se puede deshacer.`
    );
    if (confirmed) {
      onDeleteEpic(epic.id);
    }
  };

  const handleAddStory = (story: Omit<import('@/lib/types/agent-2').UserStory, 'id' | 'source' | 'isEdited' | 'createdAt'>) => {
    onAddStory(epic.id, story);
  };

  return (
    <article
      className={[
        'group rounded-2xl border border-border bg-surface-muted',
        'transition-all duration-300',
        'animate-[fadeIn_0.3s_ease-out]',
      ].join(' ')}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* ── Header colapsable ──────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        {/* Chevron de expand/collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="shrink-0 rounded p-1 text-muted hover:text-foreground hover:bg-surface-hover transition-all cursor-pointer"
          aria-label={isExpanded ? 'Colapsar épica' : 'Expandir épica'}
        >
          <svg
            className={[
              'h-4 w-4 transition-transform duration-200',
              isExpanded && 'rotate-90',
            ].join(' ')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>

        {/* Título + badge de contador */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono text-muted">
              {epic.id}
            </span>
            <h3 className="truncate text-base font-bold text-foreground">
              {epic.title}
            </h3>
            {epic.isEdited && (
              <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-400">
                Editado
              </span>
            )}
          </div>
          {!isExpanded && (
            <p className="mt-0.5 text-xs text-muted">
              {epic.userStories.length} historia{epic.userStories.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Acciones (hover-reveal) */}
        {!isApproved && (
          <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
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
      </div>

      {/* ── Contenido expandible ──────────────────────────────── */}
      {isExpanded && (
        <div className="px-6 py-4 animate-[fadeIn_0.2s_ease-out]">
          <EpicHeader
            epic={epic}
            onEdit={onEditEpic}
            isApproved={isApproved}
          />

          <div className="mt-4">
            <UserStoryList
              stories={epic.userStories}
              onEdit={onEditStory}
              onDelete={onDeleteStory}
              onAdd={handleAddStory}
              isApproved={isApproved}
            />
          </div>
        </div>
      )}
    </article>
  );
}
