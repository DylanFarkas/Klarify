import { describe, expect, it } from 'vitest';
import {
  containsKeyword,
  sanitizeDependencies,
  wouldCreateCycle,
} from '@/lib/utils/story-dependencies';
import { assignStoriesToSprints, generateSprintGoals } from '@/lib/utils/sprint-assignment';
import {
  addDays,
  computeEndDateForDuration,
  parseLocalDate,
  toIsoDate,
  validateNoOverlap,
} from '@/lib/utils/sprint-dates';
import {
  getNextSprintId,
  hasDuplicateSprintIds,
  moveStoryInPlan,
  normalizeSprintPlan,
  syncSprintGoalNumber,
} from '@/lib/utils/sprint-plan-mutations';
import { makeLocalStory, makeSprint, makeSprintPlan } from '../helpers/fixtures';

describe('story-dependencies', () => {
  it('detecta keywords con límites de palabra', () => {
    expect(containsKeyword('login con google oauth', 'oauth')).toBe(true);
    expect(containsKeyword('authentication flow', 'auth')).toBe(false);
  });

  it('detecta ciclos potenciales', () => {
    expect(
      wouldCreateCycle(
        [{ storyId: 'HU-002', dependsOnStoryId: 'HU-001', reason: 'base' }],
        { storyId: 'HU-001', dependsOnStoryId: 'HU-002', reason: 'ciclo' }
      )
    ).toBe(true);
  });

  it('sanitiza dependencias inválidas por prioridad o grounding', () => {
    const stories = [
      makeLocalStory({
        id: 'HU-001',
        title: 'Login OAuth',
        description: 'Autenticación con google oauth',
        priorityCategory: 'must',
      }),
      makeLocalStory({
        id: 'HU-002',
        title: 'Dashboard',
        description: 'Panel principal sin relación',
        priorityCategory: 'could',
      }),
    ];

    const sanitized = sanitizeDependencies(
      [
        {
          storyId: 'HU-001',
          dependsOnStoryId: 'HU-002',
          reason: 'prioridad invertida',
        },
        {
          storyId: 'HU-002',
          dependsOnStoryId: 'HU-001',
          reason: 'necesita oauth login',
        },
      ],
      stories,
      { framework: 'moscow' }
    );

    expect(sanitized).toHaveLength(1);
    expect(sanitized[0].storyId).toBe('HU-002');
  });
});

describe('sprint-dates', () => {
  it('parsea y formatea fechas locales sin desfase UTC', () => {
    const date = parseLocalDate('2026-07-10');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6);
    expect(toIsoDate(date)).toBe('2026-07-10');
  });

  it('calcula fin inclusive por semanas y días', () => {
    expect(computeEndDateForDuration('2026-07-01', 'weeks', 2)).toBe('2026-07-14');
    expect(computeEndDateForDuration('2026-07-01', 'days', 5)).toBe('2026-07-05');
    expect(addDays('2026-07-01', 1)).toBe('2026-07-02');
  });

  it('valida solapes entre sprints', () => {
    expect(
      validateNoOverlap([
        makeSprint({ id: 'S1', number: 1, startDate: '2026-07-01', endDate: '2026-07-14' }),
        makeSprint({ id: 'S2', number: 2, startDate: '2026-07-14', endDate: '2026-07-28' }),
      ])
    ).toBe(true);
    expect(
      validateNoOverlap([
        makeSprint({ id: 'S1', number: 1, startDate: '2026-07-01', endDate: '2026-07-14' }),
        makeSprint({ id: 'S2', number: 2, startDate: '2026-07-10', endDate: '2026-07-20' }),
      ])
    ).toBe(false);
  });
});

describe('sprint-assignment', () => {
  it('asigna historias respetando capacidad y dependencias', () => {
    const stories = [
      makeLocalStory({ id: 'HU-001', title: 'Auth base', points: 8, priorityCategory: 'must' }),
      makeLocalStory({
        id: 'HU-002',
        title: 'Perfil',
        description: 'Perfil tras auth base',
        points: 5,
        priorityCategory: 'should',
      }),
      makeLocalStory({ id: 'HU-003', title: 'Extras', points: 8, priorityCategory: 'could' }),
    ];

    const { sprints } = assignStoriesToSprints(
      stories,
      [{ storyId: 'HU-002', dependsOnStoryId: 'HU-001', reason: 'auth base' }],
      { sprintCapacitySp: 10, sprintDurationWeeks: 2, projectStartDate: '2026-07-01' },
      'moscow'
    );

    expect(sprints.length).toBeGreaterThanOrEqual(2);
    const sprintOf = (id: string) =>
      sprints.findIndex((sprint) => sprint.storyIds.includes(id));
    expect(sprintOf('HU-001')).toBeLessThanOrEqual(sprintOf('HU-002'));
    expect(sprints.every((sprint) => sprint.velocitySp <= 10)).toBe(true);
  });

  it('genera goals con prefijo Sprint N', () => {
    const stories = [
      makeLocalStory({ id: 'HU-001', title: 'Core', points: 5, priorityCategory: 'must' }),
    ];
    const planned = assignStoriesToSprints(
      stories,
      [],
      { sprintCapacitySp: 20, sprintDurationWeeks: 2, projectStartDate: '2026-07-01' },
      'moscow'
    );
    const withGoals = generateSprintGoals(planned.sprints, stories);
    expect(withGoals[0].sprintGoal).toMatch(/^Sprint 1:/);
  });
});

describe('sprint-plan-mutations', () => {
  it('normaliza ids duplicados y números secuenciales', () => {
    const plan = makeSprintPlan({
      sprints: [
        makeSprint({ id: 'SPRINT-001', number: 3, sprintGoal: 'Sprint 3: Uno' }),
        makeSprint({ id: 'SPRINT-001', number: 3, sprintGoal: 'Sprint 3: Dos' }),
      ],
    });
    expect(hasDuplicateSprintIds(plan)).toBe(true);
    const normalized = normalizeSprintPlan(plan);
    expect(hasDuplicateSprintIds(normalized)).toBe(false);
    expect(normalized.sprints.map((s) => s.number)).toEqual([1, 2]);
  });

  it('mueve historias entre sprints y actualiza velocity', () => {
    const plan = makeSprintPlan({
      sprints: [
        makeSprint({ id: 'SPRINT-001', number: 1, storyIds: ['HU-001'], velocitySp: 5 }),
        makeSprint({ id: 'SPRINT-002', number: 2, storyIds: [], velocitySp: 0 }),
      ],
    });
    const moved = moveStoryInPlan(plan, 'HU-001', 'SPRINT-001', 'SPRINT-002', 5);
    expect(moved.sprints[0].storyIds).not.toContain('HU-001');
    expect(moved.sprints[1].storyIds).toContain('HU-001');
    expect(moved.sprints[1].velocitySp).toBe(5);
  });

  it('genera el siguiente id de sprint y sincroniza goals', () => {
    expect(getNextSprintId([makeSprint({ id: 'SPRINT-002', number: 1 })])).toBe('SPRINT-003');
    expect(syncSprintGoalNumber(makeSprint({ id: 'S', number: 1, sprintGoal: 'Sprint 4: Meta' }), 2).sprintGoal).toBe(
      'Sprint 2: Meta'
    );
  });
});
