'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';
import {
  resolveBoardData,
  computeExecutionProgress,
  type BoardFilters as BoardFiltersState,
} from '@/lib/board/board-utils';
import type { KanbanStatus } from '@/lib/types/execution';
import { findActiveSprint } from '@/lib/utils/sprint-plan-mutations';
import { BoardFilters } from './BoardFilters';
import { BoardEmptyState } from './BoardEmptyState';
import { KanbanBoard } from './KanbanBoard';
import { TeamPanel } from './TeamPanel';
import { StoryExecutionDrawer } from './StoryExecutionDrawer';
import { ActiveSprintHeader } from './ActiveSprintHeader';

export function BoardWorkspace() {
  const {
    workspace,
    plan,
    initializeExecution,
    upsertMember,
    deleteMember,
    updateStoryExecution,
    bulkReorderExecutions,
    updateExecutionSprintFilter,
  } = useWorkspace();

  const [filters, setFilters] = useState<BoardFiltersState>({
    sprintFilter: 'all',
    epicId: 'all',
    assigneeId: 'all',
    typeFilter: 'all',
    search: '',
  });
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const sprintFilterHydrated = useRef(false);

  const hasPipeline = Boolean(workspace?.pipeline.agent6Input);
  const execution = workspace?.execution ?? null;
  const snapshot = workspace?.pipeline.agent6Input ?? null;
  const isExecutionReady = Boolean(execution?.initializedAt);
  const activeSprint = snapshot?.plan ? findActiveSprint(snapshot.plan) : null;

  useEffect(() => {
    if (!hasPipeline || isExecutionReady || isInitializing) return;
    setIsInitializing(true);
    void initializeExecution()
      .catch(() => undefined)
      .finally(() => setIsInitializing(false));
  }, [hasPipeline, isExecutionReady, isInitializing, initializeExecution]);

  useEffect(() => {
    if (sprintFilterHydrated.current || !isExecutionReady) return;
    sprintFilterHydrated.current = true;

    const saved = execution?.sprintFilter ?? 'all';
    const nextFilter =
      activeSprint && (saved === 'all' || saved === activeSprint.id)
        ? activeSprint.id
        : saved;

    setFilters((prev) => ({ ...prev, sprintFilter: nextFilter }));
    // Solo persiste si realmente hay que corregir el valor guardado.
    if (nextFilter !== saved) {
      void updateExecutionSprintFilter(nextFilter);
    }
  }, [activeSprint, execution?.sprintFilter, isExecutionReady, updateExecutionSprintFilter]);

  useEffect(() => {
    if (!workspace || !isExecutionReady || filters.sprintFilter === 'all') return;
    const allStories = resolveBoardData(workspace, { ...filters, sprintFilter: 'all' }).stories;
    const filteredStories = resolveBoardData(workspace, filters).stories;
    if (allStories.length > 0 && filteredStories.length === 0) {
      const fallback = activeSprint?.id ?? 'all';
      if (filters.sprintFilter === fallback) return;
      setFilters((prev) => ({ ...prev, sprintFilter: fallback }));
      void updateExecutionSprintFilter(fallback);
    }
  }, [workspace, isExecutionReady, filters, updateExecutionSprintFilter, activeSprint?.id]);

  const boardData = useMemo(() => {
    if (!workspace) {
      return { stories: [], members: [], plan: null, framework: 'moscow' as const, dependencies: [] };
    }
    return resolveBoardData(workspace, filters);
  }, [workspace, filters]);

  const storyMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of boardData.stories) {
      map[item.story.id] = item.story.title;
    }
    return map;
  }, [boardData.stories]);

  const selectedItem = selectedStoryId
    ? boardData.stories.find((s) => s.story.id === selectedStoryId) ?? null
    : null;

  const progress = computeExecutionProgress(boardData.stories);
  const maxMembers = plan?.limits.maxTeamMembers ?? 0;
  const viewingActiveSprint =
    Boolean(activeSprint) && filters.sprintFilter === activeSprint?.id;

  const handleFilterChange = useCallback(
    (patch: Partial<BoardFiltersState>) => {
      setFilters((prev) => ({ ...prev, ...patch }));
      if (patch.sprintFilter !== undefined) {
        void updateExecutionSprintFilter(patch.sprintFilter);
      }
    },
    [updateExecutionSprintFilter]
  );

  const handleStatusChange = useCallback(
    async (storyId: string, status: KanbanStatus) => {
      await updateStoryExecution(storyId, { status });
    },
    [updateStoryExecution]
  );

  const handleAssigneeChange = useCallback(
    async (storyId: string, assigneeId: string | null) => {
      await updateStoryExecution(storyId, { assigneeId });
    },
    [updateStoryExecution]
  );

  if (!hasPipeline) {
    return <BoardEmptyState reason="pipeline" />;
  }

  if (!isExecutionReady || isInitializing) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted">Preparando tablero…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/agentes/dashboard"
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Volver al dashboard
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tablero Kanban</h1>
          <p className="mt-1 text-sm text-muted">
            {boardData.stories.length} historias visibles · {progress}% completadas
          </p>
        </div>
        <div className="w-full max-w-xs">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[11px] text-subtle">Progreso</span>
            <span className="text-[11px] tabular-nums text-subtle">{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-foreground/70 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {viewingActiveSprint && activeSprint ? (
        <ActiveSprintHeader
          sprint={activeSprint}
          stories={boardData.stories}
          capacitySp={snapshot?.plan.config.sprintCapacitySp}
        />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <BoardFilters
          filters={filters}
          sprints={snapshot?.plan.sprints ?? []}
          epics={snapshot?.epics ?? []}
          members={boardData.members}
          activeSprintId={activeSprint?.id ?? null}
          onChange={handleFilterChange}
        />
        <TeamPanel
          members={boardData.members}
          maxMembers={maxMembers}
          onUpsert={async (member) => {
            await upsertMember(member);
          }}
          onDelete={async (memberId) => {
            await deleteMember(memberId);
          }}
        />
      </div>

      {boardData.stories.length === 0 ? (
        <BoardEmptyState reason="stories" />
      ) : (
        <KanbanBoard
          key={filters.sprintFilter}
          stories={boardData.stories}
          members={boardData.members}
          framework={boardData.framework}
          dependencies={boardData.dependencies}
          storyMap={storyMap}
          onBulkReorder={(updates) => {
            void bulkReorderExecutions(updates);
          }}
          onOpenStory={setSelectedStoryId}
        />
      )}

      <StoryExecutionDrawer
        open={Boolean(selectedStoryId)}
        item={selectedItem}
        members={boardData.members}
        framework={boardData.framework}
        onClose={() => setSelectedStoryId(null)}
        onStatusChange={handleStatusChange}
        onAssigneeChange={handleAssigneeChange}
      />
    </div>
  );
}
