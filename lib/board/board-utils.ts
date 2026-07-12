/**
 * @fileoverview Utilidades para construir datos del tablero Kanban.
 */

import type { UserStory, Epic } from '@/lib/types/agent-2';
import type { StoryEstimation } from '@/lib/types/agent-3';
import type { StoryPrioritization, PrioritizationFramework } from '@/lib/types/agent-4';
import type { SprintPlan, StoryDependency } from '@/lib/types/agent-5';
import type {
  ExecutionState,
  KanbanStatus,
  ProjectMember,
  StoryExecution,
} from '@/lib/types/execution';
import type { Agent6Input, UserWorkspace } from '@/lib/types/workspace';

export interface BoardStory {
  story: UserStory;
  execution: StoryExecution;
  epicId: string;
  epicTitle: string;
  points: number;
  priority: StoryPrioritization | null;
  sprintId: string | null;
  sprintNumber: number | null;
  dependencies: StoryDependency[];
}

export interface BoardFilters {
  sprintFilter: string | 'all';
  epicId: string | 'all';
  assigneeId: string | 'all' | 'unassigned';
  search: string;
}

export function collectStoryIdsFromEpics(epics: Epic[]): string[] {
  return epics.flatMap((epic) => epic.userStories.map((s) => s.id));
}

export function findStoryInEpics(epics: Epic[], storyId: string): { story: UserStory; epicId: string; epicTitle: string } | null {
  for (const epic of epics) {
    const story = epic.userStories.find((s) => s.id === storyId);
    if (story) {
      return { story, epicId: epic.id, epicTitle: epic.title };
    }
  }
  return null;
}

export function findSprintForStory(plan: SprintPlan | null | undefined, storyId: string): { sprintId: string; sprintNumber: number } | null {
  if (!plan) return null;
  for (const sprint of plan.sprints) {
    if (sprint.storyIds.includes(storyId)) {
      return { sprintId: sprint.id, sprintNumber: sprint.number };
    }
  }
  return null;
}

export function buildInitialExecutionState(epics: Epic[]): ExecutionState {
  const storyIds = collectStoryIdsFromEpics(epics);
  const stories: Record<string, StoryExecution> = {};
  const now = Date.now();

  storyIds.forEach((storyId, index) => {
    stories[storyId] = {
      status: 'todo',
      assigneeId: null,
      columnOrder: index,
      updatedAt: now,
      activity: [],
    };
  });

  return {
    initializedAt: now,
    members: [],
    stories,
    sprintFilter: 'all',
  };
}

export function createDefaultStoryExecution(columnOrder: number): StoryExecution {
  return {
    status: 'todo',
    assigneeId: null,
    columnOrder,
    updatedAt: Date.now(),
    activity: [],
  };
}

export function getAgent6Snapshot(workspace: UserWorkspace): Agent6Input | null {
  return workspace.pipeline.agent6Input ?? null;
}

export function resolveBoardData(
  workspace: UserWorkspace,
  filters: BoardFilters
): {
  stories: BoardStory[];
  members: ProjectMember[];
  plan: SprintPlan | null;
  framework: PrioritizationFramework;
  dependencies: StoryDependency[];
} {
  const snapshot = getAgent6Snapshot(workspace);
  const execution = workspace.execution;
  const members = execution?.members ?? [];

  if (!snapshot) {
    return {
      stories: [],
      members,
      plan: null,
      framework: 'moscow',
      dependencies: [],
    };
  }

  const { epics, estimations, priorities, framework, plan } = snapshot;
  const dependencies = plan?.dependencies ?? [];
  const stories: BoardStory[] = [];

  for (const epic of epics) {
    for (const story of epic.userStories) {
      const exec =
        execution?.stories[story.id] ?? createDefaultStoryExecution(0);
      const sprintInfo = findSprintForStory(plan, story.id);

      if (filters.sprintFilter !== 'all') {
        const inSprint = sprintInfo?.sprintId === filters.sprintFilter;
        const isUnassigned = !sprintInfo && filters.sprintFilter === 'unassigned';
        if (!inSprint && !isUnassigned) continue;
      }

      if (filters.epicId !== 'all' && epic.id !== filters.epicId) continue;

      if (filters.assigneeId === 'unassigned' && exec.assigneeId) continue;
      if (filters.assigneeId !== 'all' && filters.assigneeId !== 'unassigned' && exec.assigneeId !== filters.assigneeId) {
        continue;
      }

      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const haystack = `${story.id} ${story.title} ${story.description}`.toLowerCase();
        if (!haystack.includes(q)) continue;
      }

      const storyDeps = dependencies.filter(
        (d) => d.storyId === story.id || d.dependsOnStoryId === story.id
      );

      stories.push({
        story,
        execution: exec,
        epicId: epic.id,
        epicTitle: epic.title,
        points: estimations[story.id]?.points ?? 0,
        priority: priorities[story.id] ?? null,
        sprintId: sprintInfo?.sprintId ?? null,
        sprintNumber: sprintInfo?.sprintNumber ?? null,
        dependencies: storyDeps,
      });
    }
  }

  return {
    stories: stories.sort((a, b) => a.execution.columnOrder - b.execution.columnOrder),
    members,
    plan,
    framework,
    dependencies,
  };
}

export function groupStoriesByColumn(stories: BoardStory[]): Record<KanbanStatus, BoardStory[]> {
  const groups: Record<KanbanStatus, BoardStory[]> = {
    todo: [],
    in_progress: [],
    code_review: [],
    done: [],
  };

  for (const item of stories) {
    groups[item.execution.status].push(item);
  }

  for (const status of Object.keys(groups) as KanbanStatus[]) {
    groups[status].sort((a, b) => a.execution.columnOrder - b.execution.columnOrder);
  }

  return groups;
}

export function computeColumnStats(stories: BoardStory[]): Record<KanbanStatus, { count: number; points: number }> {
  const stats: Record<KanbanStatus, { count: number; points: number }> = {
    todo: { count: 0, points: 0 },
    in_progress: { count: 0, points: 0 },
    code_review: { count: 0, points: 0 },
    done: { count: 0, points: 0 },
  };

  for (const item of stories) {
    const bucket = stats[item.execution.status];
    bucket.count += 1;
    bucket.points += item.points;
  }

  return stats;
}

export function computeExecutionProgress(stories: BoardStory[]): number {
  if (stories.length === 0) return 0;
  const done = stories.filter((s) => s.execution.status === 'done').length;
  return Math.round((done / stories.length) * 100);
}

export function suggestDefaultSprintFilter(plan: SprintPlan | null): string | 'all' {
  if (!plan || plan.sprints.length === 0) return 'all';

  const now = Date.now();
  for (const sprint of plan.sprints) {
    const start = sprint.startDate ? new Date(sprint.startDate).getTime() : null;
    const end = sprint.endDate ? new Date(sprint.endDate).getTime() : null;
    if (start && end && now >= start && now <= end) {
      return sprint.id;
    }
  }

  return 'all';
}

/** Sincroniza execution.stories con las HUs del backlog consolidado. */
export function syncExecutionStories(
  execution: ExecutionState,
  epics: Epic[]
): ExecutionState {
  const storyIds = collectStoryIdsFromEpics(epics);
  const stories = { ...execution.stories };
  let changed = false;

  storyIds.forEach((storyId, index) => {
    if (!stories[storyId]) {
      stories[storyId] = createDefaultStoryExecution(index);
      changed = true;
    }
  });

  for (const storyId of Object.keys(stories)) {
    if (!storyIds.includes(storyId)) {
      delete stories[storyId];
      changed = true;
    }
  }

  return changed ? { ...execution, stories } : execution;
}

export function memberInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
