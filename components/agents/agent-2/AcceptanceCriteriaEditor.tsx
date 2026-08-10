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
}

export function AcceptanceCriteriaEditor({
  criteria,
  onChange,
  disabled,
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

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] text-subtle">
        {criteria.length}/{MAX_ACCEPTANCE_CRITERIA} criterios
      </span>

      {criteria.map((criterion, index) => (
        <div
          key={index}
          className={[
            'group/criterion flex items-center gap-2 rounded-md border border-border/80 px-3 py-1.5',
            editingIndex === index ? 'border-border-strong bg-surface' : 'bg-surface/60',
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
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-placeholder"
              />
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={!editingText.trim()}
                className="shrink-0 cursor-pointer rounded-md bg-foreground px-2 py-0.5 text-[11px] font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                OK
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="shrink-0 cursor-pointer rounded-md px-2 py-0.5 text-[11px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <span className="min-w-0 flex-1 text-sm text-foreground">{criterion}</span>
              {!disabled ? (
                <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover/criterion:opacity-100">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(index)}
                    className="cursor-pointer rounded p-1 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                    aria-label="Editar criterio"
                  >
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
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
                    className="cursor-pointer rounded p-1 text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
                    aria-label="Eliminar criterio"
                  >
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
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
        </div>
      ))}

      {!disabled && canAdd ? (
        isAdding ? (
          <div className="flex items-center gap-2 rounded-md border border-border/80 bg-surface px-3 py-1.5">
            <input
              ref={addInputRef}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={handleAddKeyDown}
              placeholder="Escribe el criterio…"
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-placeholder"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newText.trim()}
              className="shrink-0 cursor-pointer rounded-md bg-foreground px-2 py-0.5 text-[11px] font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Añadir
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewText('');
              }}
              className="shrink-0 cursor-pointer rounded-md px-2 py-0.5 text-[11px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex cursor-pointer items-center gap-1 self-start rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Añadir criterio
          </button>
        )
      ) : null}
    </div>
  );
}
