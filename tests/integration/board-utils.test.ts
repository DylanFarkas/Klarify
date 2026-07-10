import { describe, expect, it } from 'vitest';
import {
  buildInitialExecutionState,
  collectStoryIdsFromEpics,
  findSprintForStory,
  findStoryInEpics,
} from '@/lib/board/board-utils';
import type { Epic } from '@/lib/types/agent-2';
import type { SprintPlan } from '@/lib/types/agent-5';

const now = 1_720_000_000_000;

const epics: Epic[] = [
  {
    id: 'EPIC-001',
    title: 'Onboarding',
    description: 'Flujo de bienvenida',
    source: 'auto',
    isEdited: false,
    createdAt: now,
    userStories: [
      {
        id: 'HU-010',
        title: 'Tour inicial',
        description: 'Mostrar tour',
        acceptanceCriteria: ['Se muestra el tour'],
        sourceWishIds: [],
        source: 'auto',
        isEdited: false,
        createdAt: now,
      },
    ],
  },
];

const plan: SprintPlan = {
  sprints: [
    {
      id: 'SPRINT-1',
      number: 1,
      sprintGoal: 'Onboarding',
      startDate: '2026-07-01',
      endDate: '2026-07-14',
      velocitySp: 5,
      storyIds: ['HU-010'],
      isEdited: false,
    },
  ],
  dependencies: [],
  unassignedStoryIds: [],
  config: {
    sprintCapacitySp: 20,
    sprintDurationWeeks: 2,
    projectStartDate: '2026-07-01',
  },
};

describe('board-utils (integración del tablero)', () => {
  it('recolecta IDs de historias desde épicas', () => {
    expect(collectStoryIdsFromEpics(epics)).toEqual(['HU-010']);
  });

  it('encuentra una historia y su épica', () => {
    expect(findStoryInEpics(epics, 'HU-010')).toMatchObject({
      epicId: 'EPIC-001',
      epicTitle: 'Onboarding',
      story: { id: 'HU-010' },
    });
    expect(findStoryInEpics(epics, 'HU-999')).toBeNull();
  });

  it('resuelve el sprint de una historia', () => {
    expect(findSprintForStory(plan, 'HU-010')).toEqual({
      sprintId: 'SPRINT-1',
      sprintNumber: 1,
    });
    expect(findSprintForStory(plan, 'HU-999')).toBeNull();
  });

  it('inicializa el estado de ejecución en todo', () => {
    const state = buildInitialExecutionState(epics);
    expect(state.stories['HU-010'].status).toBe('todo');
    expect(state.members).toEqual([]);
    expect(state.sprintFilter).toBe('all');
  });
});
