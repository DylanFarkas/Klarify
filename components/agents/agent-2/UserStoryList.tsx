/**
 * @fileoverview UserStoryList — Lista de Historias de Usuario dentro de una Épica.
 *
 * Renderiza UserStoryItem para cada HU, con formulario inline para añadir.
 * Patrón replicado de WishesList.tsx (Agente 1): header, scroll, stats footer.
 *
 * Diferencia clave con WishesList: el formulario de añadir requiere título,
 * descripción y criterios (no solo texto libre).
 *
 * Cumple CA2 (listado jerárquico) y CA3 (HITL: añadir HU manual).
 */

'use client';

import { useState } from 'react';
import type { UserStory } from '@/lib/types/agent-2';
import { UserStoryItem } from './UserStoryItem';

interface UserStoryListProps {
  /** Lista de Historias de Usuario de la épica */
  stories: UserStory[];
  /** Callback para editar campos de una HU */
  onEdit: (id: string, updates: Partial<UserStory>) => void;
  /** Callback para eliminar una HU */
  onDelete: (id: string) => void;
  /** Callback para añadir una nueva HU */
  onAdd: (story: Omit<UserStory, 'id' | 'source' | 'isEdited' | 'createdAt'>) => void;
  /** Si la lista ya fue aprobada (deshabilita edición) */
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

  // Contadores para stats
  const autoCount = stories.filter((s) => s.source === 'auto').length;
  const manualCount = stories.filter((s) => s.source === 'manual').length;

  // ── Handlers ──────────────────────────────────────────────────
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
    <div className="flex flex-col gap-3">
      {/* ── Lista de HUs ─────────────────────────────────────── */}
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

      {/* ── Formulario de nueva HU ───────────────────────────── */}
      {!isApproved && (
        isAdding ? (
          <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 animate-[fadeIn_0.2s_ease-out]">
            <label className="mb-2 block text-xs font-bold text-muted">
              Nueva Historia de Usuario
            </label>

            <div className="flex flex-col gap-3">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Título de la HU..."
                className={[
                  'w-full rounded-lg border border-input-border bg-surface px-3 py-2',
                  'text-sm font-semibold text-foreground placeholder:text-placeholder',
                  'outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30',
                  'transition-all duration-200',
                ].join(' ')}
              />

              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
                placeholder="Como [rol], quiero [acción] para [beneficio]..."
                className={[
                  'w-full resize-none rounded-lg border border-input-border bg-surface px-3 py-2',
                  'text-sm text-foreground placeholder:text-placeholder',
                  'outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30',
                  'transition-all duration-200',
                ].join(' ')}
              />

              <input
                value={newCriteria}
                onChange={(e) => setNewCriteria(e.target.value)}
                placeholder="Criterios (separados por coma)..."
                className={[
                  'w-full rounded-lg border border-input-border bg-surface px-3 py-2',
                  'text-sm text-foreground placeholder:text-placeholder',
                  'outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30',
                  'transition-all duration-200',
                ].join(' ')}
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={handleCancelAdd}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAdd}
                  disabled={isAddDisabled}
                  className={[
                    'inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition-all cursor-pointer',
                    !isAddDisabled
                      ? 'bg-primary text-white hover:bg-primary-hover'
                      : 'bg-disabled text-disabled-text cursor-not-allowed',
                  ].join(' ')}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Añadir
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className={[
              'flex items-center gap-1.5 self-start rounded-lg border border-dashed border-border px-3 py-1.5',
              'text-xs font-medium text-muted transition-all cursor-pointer',
              'hover:border-primary/40 hover:bg-primary/5 hover:text-primary',
            ].join(' ')}
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Añadir Historia de Usuario
          </button>
        )
      )}
    </div>
  );
}
