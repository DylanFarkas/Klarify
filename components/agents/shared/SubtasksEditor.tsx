'use client';

import { useEffect, useRef, useState } from 'react';
import { useConfirm } from '@/components/agents/shared/ConfirmDialog';
import { MAX_SUBTASKS_PER_STORY } from '@/lib/constants/agent-2';
import type { StorySubtask } from '@/lib/types/agent-2';
import { generateSubtaskId } from '@/lib/utils/agent-2-ids';

interface SubtasksEditorProps {
  subtasks: StorySubtask[];
  onChange: (updated: StorySubtask[]) => void;
  disabled?: boolean;
  hideCount?: boolean;
}

export function SubtasksEditor({
  subtasks,
  onChange,
  disabled = false,
  hideCount = false,
}: SubtasksEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const confirm = useConfirm();

  useEffect(() => {
    if (isAdding && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [isAdding]);

  useEffect(() => {
    if (editingId !== null && editInputRef.current) {
      editInputRef.current.focus();
      const len = editInputRef.current.value.length;
      editInputRef.current.setSelectionRange(len, len);
    }
  }, [editingId]);

  const handleAdd = () => {
    const trimmed = newText.trim();
    if (!trimmed || subtasks.length >= MAX_SUBTASKS_PER_STORY) return;
    onChange([
      ...subtasks,
      { id: generateSubtaskId(subtasks), title: trimmed, done: false },
    ]);
    setNewText('');
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    const subtask = subtasks.find((item) => item.id === id);
    const confirmed = await confirm({
      title: `¿Eliminar ${subtask?.id ?? 'esta subtarea'}?`,
      description: subtask
        ? `"${subtask.title}" se eliminará de la historia. Esta acción no se puede deshacer.`
        : 'Esta subtarea se eliminará de la historia. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      variant: 'danger',
    });
    if (!confirmed) return;
    onChange(subtasks.filter((item) => item.id !== id));
  };

  const handleToggleDone = (id: string) => {
    onChange(
      subtasks.map((subtask) =>
        subtask.id === id ? { ...subtask, done: !subtask.done } : subtask
      )
    );
  };

  const handleStartEdit = (subtask: StorySubtask) => {
    setEditingId(subtask.id);
    setEditingText(subtask.title);
  };

  const handleSaveEdit = () => {
    if (editingId === null) return;
    const trimmed = editingText.trim();
    if (trimmed) {
      onChange(
        subtasks.map((subtask) =>
          subtask.id === editingId ? { ...subtask, title: trimmed } : subtask
        )
      );
    }
    setEditingId(null);
    setEditingText('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const handleAddKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAdd();
    }
    if (event.key === 'Escape') {
      setIsAdding(false);
      setNewText('');
    }
  };

  const handleEditKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSaveEdit();
    }
    if (event.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const canAdd = subtasks.length < MAX_SUBTASKS_PER_STORY;
  const showList = subtasks.length > 0 || isAdding;

  return (
    <div className="flex flex-col">
      {!hideCount ? (
        <span className="mb-1 text-[11px] tabular-nums text-subtle">
          {subtasks.length}/{MAX_SUBTASKS_PER_STORY} subtareas
        </span>
      ) : null}

      {showList ? (
        <ul>
          {subtasks.map((subtask, index) => (
            <li
              key={subtask.id}
              className={[
                'group/subtask flex items-center gap-2.5 py-2.5',
                index > 0 ? 'border-t border-border/50' : '',
              ].join(' ')}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={subtask.done}
                disabled={disabled}
                onClick={() => handleToggleDone(subtask.id)}
                className={[
                  'flex size-3.5 shrink-0 cursor-pointer items-center justify-center rounded-[3px] border transition-colors disabled:cursor-not-allowed',
                  subtask.done
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-transparent hover:border-border-strong',
                ].join(' ')}
                aria-label={
                  subtask.done
                    ? `Marcar ${subtask.id} como pendiente`
                    : `Marcar ${subtask.id} como hecha`
                }
              >
                {subtask.done ? (
                  <svg
                    className="size-2.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                ) : null}
              </button>

              <span className="shrink-0 text-[11px] font-medium leading-none tabular-nums text-subtle">
                {subtask.id}
              </span>

              {editingId === subtask.id ? (
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    ref={editInputRef}
                    value={editingText}
                    onChange={(event) => setEditingText(event.target.value)}
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
                  <p
                    className={[
                      'min-w-0 flex-1 text-sm leading-relaxed text-foreground',
                      subtask.done ? 'text-muted line-through' : '',
                    ].join(' ')}
                  >
                    {subtask.title}
                  </p>
                  {!disabled ? (
                    <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover/subtask:opacity-100">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(subtask)}
                        className="cursor-pointer rounded-md p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                        aria-label={`Editar ${subtask.id}`}
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
                        onClick={() => handleDelete(subtask.id)}
                        className="cursor-pointer rounded-md p-1.5 text-muted transition-colors hover:bg-red-500/10 hover:text-danger"
                        aria-label={`Eliminar ${subtask.id}`}
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
                'flex items-center gap-2.5 py-2.5',
                subtasks.length > 0 ? 'border-t border-border/50' : '',
              ].join(' ')}
            >
              <span
                className="size-3.5 shrink-0 rounded-[3px] border border-border/60"
                aria-hidden="true"
              />
              <span className="shrink-0 text-[11px] font-medium leading-none tabular-nums text-subtle">
                {generateSubtaskId(subtasks)}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  ref={addInputRef}
                  value={newText}
                  onChange={(event) => setNewText(event.target.value)}
                  onKeyDown={handleAddKeyDown}
                  placeholder="Escribe la subtarea…"
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
      ) : (
        <p className="py-3 text-sm text-muted">Sin subtareas.</p>
      )}

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
          Añadir subtarea
        </button>
      ) : null}
    </div>
  );
}
