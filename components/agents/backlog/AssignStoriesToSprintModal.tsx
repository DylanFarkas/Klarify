'use client';

import { useState } from 'react';
import type { DashboardSprintStoryRow } from '@/components/agents/dashboard/dashboardMetrics';

interface AssignStoriesToSprintModalProps {
  open: boolean;
  sprintLabel: string;
  backlogRows: DashboardSprintStoryRow[];
  busy?: boolean;
  onClose: () => void;
  onConfirm: (storyIds: string[]) => void;
}

export function AssignStoriesToSprintModal({
  open,
  sprintLabel,
  backlogRows,
  busy = false,
  onClose,
  onConfirm,
}: AssignStoriesToSprintModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (!open) return null;

  const toggle = (storyId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(storyId)) next.delete(storyId);
      else next.add(storyId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === backlogRows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(backlogRows.map((r) => r.story.id)));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-stories-title"
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-surface shadow-xl"
      >
        <div className="border-b border-border/60 px-5 py-4">
          <h3 id="assign-stories-title" className="text-[20px] font-semibold text-foreground">
            Asignar historias a {sprintLabel}
          </h3>
          <p className="mt-1 text-sm text-muted">
            Selecciona las HUs del backlog que quieres incluir en este sprint.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {backlogRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No hay historias en el backlog.</p>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleAll}
                className="mb-2 cursor-pointer text-[12px] font-medium text-muted transition-colors hover:text-foreground"
              >
                {selected.size === backlogRows.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
              </button>
              <ul className="space-y-1">
                {backlogRows.map((row) => (
                  <li key={row.story.id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-hover">
                      <input
                        type="checkbox"
                        checked={selected.has(row.story.id)}
                        onChange={() => toggle(row.story.id)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-foreground"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {row.story.title}
                        </span>
                        <span className="block font-mono text-[11px] text-subtle">{row.story.id}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-4">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy || selected.size === 0}
            onClick={() => onConfirm(Array.from(selected))}
            className="cursor-pointer rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Asignar {selected.size > 0 ? `(${selected.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
