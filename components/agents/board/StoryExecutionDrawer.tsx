'use client';

import { useCallback, useEffect } from 'react';
import { DetailModal } from '@/components/agents/shared/DetailModal';
import { UserStoryDetailContent } from '@/components/agents/shared/UserStoryDetailContent';
import type { BoardStory } from '@/lib/board/board-utils';
import {
  KANBAN_COLUMNS,
  MEMBER_ROLE_LABELS,
  type KanbanStatus,
  type ProjectMember,
} from '@/lib/types/execution';
import type { ExecutionActivityEntry } from '@/lib/types/execution';
import type { PrioritizationFramework } from '@/lib/types/agent-4';

interface StoryExecutionDrawerProps {
  open: boolean;
  item: BoardStory | null;
  members: ProjectMember[];
  framework: PrioritizationFramework;
  onClose: () => void;
  onStatusChange: (storyId: string, status: KanbanStatus) => void;
  onAssigneeChange: (storyId: string, assigneeId: string | null) => void;
}

function formatActivity(entry: ExecutionActivityEntry, members: ProjectMember[]): string {
  if (entry.type === 'status_change') {
    const from = KANBAN_COLUMNS.find((c) => c.id === entry.from)?.label ?? entry.from;
    const to = KANBAN_COLUMNS.find((c) => c.id === entry.to)?.label ?? entry.to;
    return `Estado: ${from} → ${to}`;
  }
  const from = entry.from
    ? members.find((m) => m.id === entry.from)?.displayName ?? entry.from
    : 'Sin asignar';
  const to = entry.to
    ? members.find((m) => m.id === entry.to)?.displayName ?? entry.to
    : 'Sin asignar';
  return `Responsable: ${from} → ${to}`;
}

export function StoryExecutionDrawer({
  open,
  item,
  members,
  framework,
  onClose,
  onStatusChange,
  onAssigneeChange,
}: StoryExecutionDrawerProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!open || !item || item.sprintLocked) return;
      const idx = Number(event.key) - 1;
      if (idx >= 0 && idx < KANBAN_COLUMNS.length) {
        onStatusChange(item.story.id, KANBAN_COLUMNS[idx].id);
      }
    },
    [open, item, onStatusChange]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!item) return null;

  const activity = [...(item.execution.activity ?? [])].reverse();

  return (
    <DetailModal
      open={open}
      onClose={onClose}
      title={item.story.title}
      subtitle={item.story.id}
      eyebrow={item.epicTitle}
      maxWidth="xl"
    >
      <div className="space-y-6">
        <section className="rounded-xl border border-border bg-surface p-4">
          <h3 className="text-[15px] font-semibold tracking-tight text-foreground">Ejecución</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="story-status" className="text-[11px] font-medium text-subtle">
                Estado
              </label>
              <select
                id="story-status"
                value={item.execution.status}
                onChange={(e) => onStatusChange(item.story.id, e.target.value as KanbanStatus)}
                disabled={item.sprintLocked}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-border-strong focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {KANBAN_COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-subtle">
                {item.sprintLocked ? 'Sprint cerrado: no se puede cambiar.' : 'Atajos: teclas 1–4'}
              </p>
            </div>
            <div>
              <label htmlFor="story-assignee" className="text-[11px] font-medium text-subtle">
                Responsable
              </label>
              <select
                id="story-assignee"
                value={item.execution.assigneeId ?? ''}
                onChange={(e) =>
                  onAssigneeChange(item.story.id, e.target.value ? e.target.value : null)
                }
                disabled={item.sprintLocked}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-border-strong focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Sin asignar</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName} ({MEMBER_ROLE_LABELS[m.role]})
                  </option>
                ))}
              </select>
            </div>
          </div>
          {item.sprintNumber !== null && (
            <p className="mt-3 text-xs text-muted">
              Sprint planificado: <span className="font-medium text-foreground">Sprint {item.sprintNumber}</span>
            </p>
          )}
        </section>

        <UserStoryDetailContent
          story={item.story}
          epicTitle={item.epicTitle}
          estimation={item.points > 0 ? { points: item.points, justification: '', isModified: false } : undefined}
          prioritization={item.priority ?? undefined}
          framework={framework}
        />

        {activity.length > 0 && (
          <section>
            <h3 className="mb-2 text-[15px] font-semibold tracking-tight text-foreground">
              Actividad reciente
            </h3>
            <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
              {activity.map((entry, i) => (
                <li
                  key={`${entry.at}-${i}`}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 text-xs"
                >
                  <span className="text-muted">{formatActivity(entry, members)}</span>
                  <time className="shrink-0 text-[10px] text-subtle">
                    {new Date(entry.at).toLocaleString('es')}
                  </time>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </DetailModal>
  );
}
