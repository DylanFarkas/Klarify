import type { Epic, UserStory } from '@/lib/types/agent-2';
import type { LocalStoryForPlanning, PlannedSprint, SprintPlan } from '@/lib/types/agent-5';
import type { ProjectExportPayload } from '@/lib/export/types';
import type { UserWorkspace } from '@/lib/types/workspace';

const now = 1_720_000_000_000;

export function makeStory(
  overrides: Partial<UserStory> & Pick<UserStory, 'id' | 'title'>
): UserStory {
  return {
    description: overrides.description ?? `Descripción de ${overrides.title}`,
    acceptanceCriteria: overrides.acceptanceCriteria ?? ['Criterio 1'],
    sourceWishIds: overrides.sourceWishIds ?? ['DESEO-001'],
    source: overrides.source ?? 'auto',
    isEdited: overrides.isEdited ?? false,
    createdAt: overrides.createdAt ?? now,
    ...overrides,
  };
}

export function makeEpic(
  overrides: Partial<Epic> & Pick<Epic, 'id' | 'title'> & { userStories?: UserStory[] }
): Epic {
  return {
    description: overrides.description ?? `Épica ${overrides.title}`,
    source: overrides.source ?? 'auto',
    isEdited: overrides.isEdited ?? false,
    createdAt: overrides.createdAt ?? now,
    userStories: overrides.userStories ?? [
      makeStory({ id: 'HU-001', title: 'Historia base' }),
    ],
    ...overrides,
  };
}

export function makeLocalStory(
  overrides: Partial<LocalStoryForPlanning> & Pick<LocalStoryForPlanning, 'id' | 'title'>
): LocalStoryForPlanning {
  return {
    description: overrides.description ?? overrides.title,
    epicTitle: overrides.epicTitle ?? 'Épica',
    points: overrides.points ?? 3,
    priorityCategory: overrides.priorityCategory ?? 'must',
    ...overrides,
  };
}

export function makeSprint(
  overrides: Partial<PlannedSprint> & Pick<PlannedSprint, 'id' | 'number'>
): PlannedSprint {
  return {
    sprintGoal: overrides.sprintGoal ?? `Sprint ${overrides.number}: Objetivo`,
    startDate: overrides.startDate ?? '2026-07-01',
    endDate: overrides.endDate ?? '2026-07-14',
    velocitySp: overrides.velocitySp ?? 0,
    storyIds: overrides.storyIds ?? [],
    isEdited: overrides.isEdited ?? false,
    ...overrides,
  };
}

export function makeSprintPlan(overrides: Partial<SprintPlan> = {}): SprintPlan {
  return {
    sprints: overrides.sprints ?? [
      makeSprint({ id: 'SPRINT-001', number: 1, storyIds: ['HU-001'], velocitySp: 3 }),
    ],
    dependencies: overrides.dependencies ?? [],
    unassignedStoryIds: overrides.unassignedStoryIds ?? [],
    config: overrides.config ?? {
      sprintCapacitySp: 20,
      sprintDurationWeeks: 2,
      projectStartDate: '2026-07-01',
    },
  };
}

export function makeEmptyWorkspace(overrides: Partial<UserWorkspace> = {}): UserWorkspace {
  const base: UserWorkspace = {
    agent1: {
      file: null,
      transcription: null,
      discovery: null,
      enrichedContext: null,
      wishes: [],
      status: 'idle',
      error: null,
    },
    agent2: { input: null, epics: [], status: 'idle', error: null },
    agent3: { input: null, estimations: {}, status: 'idle', error: null },
    agent4: {
      input: null,
      priorities: {},
      framework: 'moscow',
      status: 'idle',
      error: null,
    },
    agent5: { input: null, plan: null, status: 'idle', error: null },
    pipeline: {
      agent2Input: null,
      agent3Input: null,
      agent4Input: null,
      agent5Input: null,
      agent6Input: null,
    },
  };

  return {
    ...base,
    ...overrides,
    agent1: { ...base.agent1, ...overrides.agent1 },
    agent2: { ...base.agent2, ...overrides.agent2 },
    agent3: { ...base.agent3, ...overrides.agent3 },
    agent4: { ...base.agent4, ...overrides.agent4 },
    agent5: { ...base.agent5, ...overrides.agent5 },
    pipeline: { ...base.pipeline, ...overrides.pipeline },
  };
}

export function makeExportPayload(
  overrides: Partial<ProjectExportPayload> = {}
): ProjectExportPayload {
  const epic = makeEpic({
    id: 'EPIC-001',
    title: 'Auth',
    userStories: [makeStory({ id: 'HU-001', title: 'Login' })],
  });

  return {
    exportedAt: '2026-07-10T12:00:00.000Z',
    projectName: 'Proyecto Demo',
    pipelineCompletionPercentage: 40,
    framework: 'moscow',
    frameworkLabel: 'MoSCoW',
    wishes: [
      {
        id: 'DESEO-001',
        text: 'Quiero login',
        source: 'manual',
        isEdited: false,
        createdAt: now,
      },
    ],
    epics: [epic],
    estimations: {
      'HU-001': { points: 5, justification: 'OAuth', isModified: false },
    },
    priorities: {
      'HU-001': { category: 'must', justification: 'Crítico', isModified: false },
    },
    plan: makeSprintPlan(),
    sprints: [makeSprint({ id: 'SPRINT-001', number: 1, storyIds: ['HU-001'], velocitySp: 5 })],
    dependencies: [],
    unassignedStoryIds: [],
    stories: [
      {
        storyId: 'HU-001',
        storyTitle: 'Login',
        storyDescription: 'Como usuario quiero login',
        acceptanceCriteria: ['Puedo entrar'],
        epicId: 'EPIC-001',
        epicTitle: 'Auth',
        epicDescription: 'Auth',
        storyPoints: 5,
        estimationJustification: 'OAuth',
        priorityCategory: 'must',
        priorityLabel: 'Must Have',
        priorityJustification: 'Crítico',
        sprintId: 'SPRINT-001',
        sprintNumber: 1,
        sprintGoal: 'Sprint 1: Objetivo',
        sprintStartDate: '2026-07-01',
        sprintEndDate: '2026-07-14',
        sprintVelocitySp: 5,
        dependencies: [],
        sourceWishIds: ['DESEO-001'],
        kanbanStatus: 'todo',
        kanbanStatusLabel: 'Por hacer',
        assigneeId: null,
        assigneeName: null,
      },
    ],
    execution: null,
    members: [],
    summary: {
      epicCount: 1,
      storyCount: 1,
      totalStoryPoints: 5,
      estimatedStoryCount: 1,
      prioritizedStoryCount: 1,
      sprintCount: 1,
      plannedStoryCount: 1,
      unassignedStoryCount: 0,
    },
    ...overrides,
  };
}

export const samplePlanFree = {
  id: 'free' as const,
  limits: {
    maxProjects: 1,
    maxEpics: 5,
    maxStories: 13,
    maxStoriesPerEpic: 3,
    thinkingBudget: 512,
    backlogDetail: 'compact' as const,
    allowedFileTypes: ['.txt', '.pdf'] as const,
    github: false,
    export: false as const,
    executionBoard: false,
    maxTeamMembers: 0,
  },
  usage: {
    periodKey: '2026-07',
    regenerations: { agent2: 0, agent3: 0, agent4: 0, agent5: 0 },
  },
  subscription: { planId: 'free' as const, status: 'active' as const },
};

export const samplePlanPro = {
  ...samplePlanFree,
  id: 'pro' as const,
  limits: {
    ...samplePlanFree.limits,
    maxProjects: 10,
    maxEpics: 25,
    maxStories: 150,
    maxStoriesPerEpic: 8,
    thinkingBudget: 2048,
    backlogDetail: 'detailed' as const,
    allowedFileTypes: ['.mp3', '.wav', '.txt', '.pdf'] as const,
    github: true,
    export: 'full' as const,
    executionBoard: true,
    maxTeamMembers: 25,
  },
  subscription: { planId: 'pro' as const, status: 'active' as const },
};
