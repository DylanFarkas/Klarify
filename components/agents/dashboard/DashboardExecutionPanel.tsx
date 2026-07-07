'use client';

import Link from 'next/link';
import { resolveBoardData, computeExecutionProgress, type BoardFilters } from '@/lib/board/board-utils';
import type { UserWorkspace } from '@/lib/types/workspace';

interface DashboardExecutionPanelProps {
  workspace: UserWorkspace;
  executionBoardEnabled: boolean;
}

export function DashboardExecutionPanel({
  workspace,
  executionBoardEnabled,
}: DashboardExecutionPanelProps) {
  if (!workspace.pipeline.agent6Input) return null;

  const filters: BoardFilters = {
    sprintFilter: workspace.execution?.sprintFilter ?? 'all',
    epicId: 'all',
    assigneeId: 'all',
    search: '',
  };

  const { stories } = resolveBoardData(workspace, filters);
  const progress = computeExecutionProgress(stories);
  const doneCount = stories.filter((s) => s.execution.status === 'done').length;
  const memberCount = workspace.execution?.members.length ?? 0;

  return (
    <div className="rounded-2xl border border-border bg-surface/80 p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-subtle">Ejecución</p>
          <h2 className="mt-2 text-xl font-bold text-foreground">Tablero Kanban</h2>
          <p className="mt-2 text-sm text-muted">
            {doneCount} de {stories.length} historias completadas · {memberCount} miembros en el equipo
          </p>
        </div>

        {executionBoardEnabled ? (
          <Link
            href="/agentes/board"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            Ir al tablero
          </Link>
        ) : (
          <Link
            href="/#pricing"
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-surface-hover"
          >
            Disponible en Starter
          </Link>
        )}
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs text-muted">
          <span>Progreso de ejecución</span>
          <span className="font-bold text-foreground">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
