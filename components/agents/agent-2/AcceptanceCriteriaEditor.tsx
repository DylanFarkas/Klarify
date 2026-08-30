/**
 * @fileoverview AcceptanceCriteriaEditor — Editor de criterios de aceptación.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { MAX_ACCEPTANCE_CRITERIA } from '@/lib/constants/agent-2';

interface AcceptanceCriteriaEditorProps {
  criteria: string[];
  onChange: (updated: string[]) => void;
  disabled: boolean;
  /** Contador / encabezado, p. ej. "criterios" o "pasos" */
  itemLabel?: string;
  addButtonLabel?: string;
  /** Oculta el contador interno cuando el padre ya lo muestra. */
  hideCount?: boolean;
}

export function AcceptanceCriteriaEditor({
  criteria,
  onChange,
  disabled,
  itemLabel = 'criterios',
  addButtonLabel = 'Añadir criterio',
  hideCount = false,
}: AcceptanceCriteriaEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [isAdding]);

  useEffect(() => {
    if (editingIndex !== null && editInputRef.current) {
      editInputRef.current.focus();
      const len = editInputRef.current.value.length;
      editInputRef.current.setSelectionRange(len, len);
    }
  }, [editingIndex]);

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
  const showList = criteria.length > 0 || isAdding;

  return (
    <div className="flex flex-col">
      {!hideCount ? (
        <span className="mb-1 text-[11px] tabular-nums text-subtle">
          {criteria.length}/{MAX_ACCEPTANCE_CRITERIA} {itemLabel}
        </span>
      ) : null}

      {showList ? (
        <ul>
          {criteria.map((criterion, index) => (
            <li
              key={index}
              className={[
                'group/criterion flex items-start gap-2.5 py-2.5',
                index > 0 ? 'border-t border-border/50' : '',
              ].join(' ')}
            >
              <span className="mt-px shrink-0 text-[11px] font-medium tabular-nums text-subtle">
                {String(index + 1).padStart(2, '0')}
              </span>

              {editingIndex === index ? (
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    ref={editInputRef}
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    disabled={disabled}
                    className="min-w-0 flex-1 rounded-lg border border-border/80 bg-input px-2.5 py-1.5 text-sm leading-relaxed text-foreground outline-none placeholder:text-placeholder focus:border-border-strong"
                  />
                  <div className="flex shrink-0 items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="cursor-pointer rounded-md px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={!editingText.trim()}
                      className="cursor-pointer rounded-md bg-foreground px-2.5 py-1 text-[12px] font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">
                    {criterion}
                  </p>
                  {!disabled ? (
                    <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover/criterion:opacity-100">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(index)}
                        className="cursor-pointer rounded-md p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                        aria-label="Editar criterio"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.75}
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(index)}
                        className="cursor-pointer rounded-md p-1.5 text-muted transition-colors hover:bg-red-500/10 hover:text-danger"
                        aria-label="Eliminar criterio"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.75}
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </li>
          ))}

          {!disabled && isAdding ? (
            <li
              className={[
                'flex items-start gap-2.5 py-2.5',
                criteria.length > 0 ? 'border-t border-border/50' : '',
              ].join(' ')}
            >
              <span className="mt-px shrink-0 text-[11px] font-medium tabular-nums text-subtle">
                {String(criteria.length + 1).padStart(2, '0')}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  ref={addInputRef}
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  onKeyDown={handleAddKeyDown}
                  placeholder="Escribe el criterio…"
                  className="min-w-0 flex-1 rounded-lg border border-border/80 bg-input px-2.5 py-1.5 text-sm leading-relaxed text-foreground outline-none placeholder:text-placeholder focus:border-border-strong"
                />
                <div className="flex shrink-0 items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setNewText('');
                    }}
                    className="cursor-pointer rounded-md px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={!newText.trim()}
                    className="cursor-pointer rounded-md bg-foreground px-2.5 py-1 text-[12px] font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Añadir
                  </button>
                </div>
              </div>
            </li>
          ) : null}
        </ul>
      ) : null}

      {!disabled && canAdd && !isAdding ? (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className={[
            'inline-flex cursor-pointer items-center gap-1 self-start rounded-lg px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground',
            showList ? 'mt-1' : '',
          ].join(' ')}
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
          {addButtonLabel}
        </button>
      ) : null}
    </div>
  );
}
