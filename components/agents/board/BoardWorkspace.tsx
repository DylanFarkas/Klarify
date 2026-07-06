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
import { BoardFilters } from './BoardFilters';
import { BoardEmptyState } from './BoardEmptyState';
import { KanbanBoard } from './KanbanBoard';
import { TeamPanel } from './TeamPanel';
import { StoryExecutionDrawer } from './StoryExecutionDrawer';

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
    search: '',
  });
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const sprintFilterHydrated = useRef(false);

  const hasPipeline = Boolean(workspace?.pipeline.agent6Input);
  const execution = workspace?.execution ?? null;
  const snapshot = workspace?.pipeline.agent6Input ?? null;
  const isExecutionReady = Boolean(execution?.initializedAt);

  useEffect(() => {
    if (!hasPipeline || isExecutionReady || isInitializing) return;
    setIsInitializing(true);
    void initializeExecution()
      .catch(() => undefined)
      .finally(() => setIsInitializing(false));
  }, [hasPipeline, isExecutionReady, isInitializing, initializeExecution]);

  useEffect(() => {
    if (sprintFilterHydrated.current || !isExecutionReady || !execution?.sprintFilter) return;
    sprintFilterHydrated.current = true;
    if (execution.sprintFilter !== 'all') {
      setFilters((prev) => ({ ...prev, sprintFilter: execution.sprintFilter }));
    }
  }, [execution?.sprintFilter, isExecutionReady]);

  useEffect(() => {
    if (!workspace || !isExecutionReady || filters.sprintFilter === 'all') return;
    const allStories = resolveBoardData(workspace, { ...filters, sprintFilter: 'all' }).stories;
    const filteredStories = resolveBoardData(workspace, filters).stories;
    if (allStories.length > 0 && filteredStories.length === 0) {
      setFilters((prev) => ({ ...prev, sprintFilter: 'all' }));
      void updateExecutionSprintFilter('all');
    }
  }, [workspace, isExecutionReady, filters, updateExecutionSprintFilter]);

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
        <p className="text-sm text-muted">Preparando tablero...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/agentes/dashboard"
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Volver al dashboard
          </Link>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-subtle">Ejecución</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">Tablero Kanban</h1>
          <p className="mt-1 text-sm text-muted">
            {boardData.stories.length} historias visibles · {progress}% completadas
          </p>
        </div>
        <div className="h-2 w-full max-w-xs overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <BoardFilters
          filters={filters}
          sprints={snapshot?.plan.sprints ?? []}
          epics={snapshot?.epics ?? []}
          members={boardData.members}
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
