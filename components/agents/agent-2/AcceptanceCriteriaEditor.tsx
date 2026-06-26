/**
 * @fileoverview AcceptanceCriteriaEditor — Editor de criterios de aceptación.
 *
 * Renderiza una lista editable de strings (cada uno es un criterio).
 * Permite añadir, editar y eliminar criterios inline.
 *
 * Cumple CA1 (cada HU tiene criterios) y CA3 (HITL: edición manual).
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { MAX_ACCEPTANCE_CRITERIA } from '@/lib/constants/agent-2';

interface AcceptanceCriteriaEditorProps {
  /** Lista actual de criterios de aceptación */
  criteria: string[];
  /** Callback cuando la lista cambia (add/edit/delete) */
  onChange: (updated: string[]) => void;
  /** Deshabilita todas las interacciones (ej: cuando status es approved) */
  disabled: boolean;
}

export function AcceptanceCriteriaEditor({ criteria, onChange, disabled }: AcceptanceCriteriaEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Autofocar input de añadir
  useEffect(() => {
    if (isAdding && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [isAdding]);

  // Autofocar input solo al entrar en modo edición (no en cada tecla)
  useEffect(() => {
    if (editingIndex !== null && editInputRef.current) {
      editInputRef.current.focus();
      const len = editInputRef.current.value.length;
      editInputRef.current.setSelectionRange(len, len);
    }
  }, [editingIndex]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleAdd = () => {
    const trimmed = newText.trim();
    if (!trimmed || criteria.length >= MAX_ACCEPTANCE_CRITERIA) return;
    onChange([...criteria, trimmed]);
    setNewText('');
    setIsAdding(false);
  };

  const handleDelete = (index: number) => {
    onChange(criteria.filter((_, i) => i !== index));
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingText(criteria[index]);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    const trimmed = editingText.trim();
    if (trimmed && trimmed !== criteria[editingIndex]) {
      const updated = [...criteria];
      updated[editingIndex] = trimmed;
      onChange(updated);
    }
    setEditingIndex(null);
    setEditingText('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingText('');
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
    if (e.key === 'Escape') {
      setIsAdding(false);
      setNewText('');
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const canAdd = criteria.length < MAX_ACCEPTANCE_CRITERIA;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
        Criterios de aceptación ({criteria.length}/{MAX_ACCEPTANCE_CRITERIA})
      </span>

      {/* ── Lista de criterios ──────────────────────────────────── */}
      {criteria.map((criterion, index) => (
        <div
          key={index}
          className={[
            'flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5',
            'transition-all duration-200',
            editingIndex === index && 'border-primary/40 bg-primary/5',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {editingIndex === index ? (
            <>
              <input
                ref={editInputRef}
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onKeyDown={handleEditKeyDown}
                disabled={disabled}
                className={[
                  'min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none',
                  'placeholder:text-placeholder',
                ].join(' ')}
              />
              <button
                onClick={handleSaveEdit}
                disabled={!editingText.trim()}
                className={[
                  'shrink-0 rounded px-2 py-0.5 text-[10px] font-bold transition-all cursor-pointer',
                  editingText.trim()
                    ? 'bg-primary text-white hover:bg-primary-hover'
                    : 'bg-disabled text-disabled-text cursor-not-allowed',
                ].join(' ')}
              >
                OK
              </button>
              <button
                onClick={handleCancelEdit}
                className="shrink-0 rounded px-2 py-0.5 text-[10px] font-medium text-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <span className="min-w-0 flex-1 text-sm text-body">
                {criterion}
              </span>
              {!disabled && (
                <div className="flex shrink-0 items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleStartEdit(index)}
                    className="rounded p-1 text-muted hover:text-foreground hover:bg-surface-hover transition-all cursor-pointer"
                    aria-label="Editar criterio"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(index)}
                    className="rounded p-1 text-muted transition-all cursor-pointer hover:text-red-400 hover:bg-red-500/10"
                    aria-label="Eliminar criterio"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ))}

      {/* ── Fila de añadir ─────────────────────────────────────── */}
      {!disabled && canAdd && (
        isAdding ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-1.5 animate-[fadeIn_0.2s_ease-out]">
            <input
              ref={addInputRef}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={handleAddKeyDown}
              placeholder="Escribe el criterio..."
              className={[
                'min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none',
                'placeholder:text-placeholder',
              ].join(' ')}
            />
            <button
              onClick={handleAdd}
              disabled={!newText.trim()}
              className={[
                'shrink-0 rounded px-2 py-0.5 text-[10px] font-bold transition-all cursor-pointer',
                newText.trim()
                  ? 'bg-primary text-white hover:bg-primary-hover'
                  : 'bg-disabled text-disabled-text cursor-not-allowed',
              ].join(' ')}
            >
              Añadir
            </button>
            <button
              onClick={() => { setIsAdding(false); setNewText(''); }}
              className="shrink-0 rounded px-2 py-0.5 text-[10px] font-medium text-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className={[
              'flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5',
              'text-xs font-medium text-muted transition-all cursor-pointer',
              'hover:border-primary/40 hover:bg-primary/5 hover:text-primary',
            ].join(' ')}
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Añadir criterio
          </button>
        )
      )}
    </div>
  );
}
