import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase-admin', () => ({
  verifyRequestUser: vi.fn(),
  adminDb: {},
}));

vi.mock('@/lib/firestore', () => ({
  userDoc: vi.fn(),
}));

import { truncateBacklogToPlanLimits } from '@/lib/plans/truncate-backlog';
import { canChangeProjectSlotSelection } from '@/lib/plans/project-slot-selection';
import { getPlanLimits, PLAN_LIMITS } from '@/lib/plans/definitions';
import { getAiConfig, assertProjectSlotAccessible } from '@/lib/plans/plan-service';
import { PlanLimitError, isPlanLimitError, planErrorToJson } from '@/lib/plans/plan-errors';
import { makeEpic, makeStory } from '../helpers/fixtures';

describe('definitions y getAiConfig', () => {
  it('expone límites distintos por plan', () => {
    expect(getPlanLimits('free').maxProjects).toBe(1);
    expect(getPlanLimits('starter').executionBoard).toBe(true);
    expect(getPlanLimits('pro').github).toBe(true);
    expect(PLAN_LIMITS.pro.maxStories).toBeGreaterThan(PLAN_LIMITS.free.maxStories);
  });

  it('mapea getAiConfig desde los límites del plan', () => {
    expect(getAiConfig('free')).toMatchObject({
      maxEpics: 5,
      maxStories: 13,
      backlogDetail: 'compact',
    });
    expect(getAiConfig('pro').thinkingBudget).toBe(2048);
  });
});

describe('plan-errors', () => {
  it('serializa PlanLimitError a JSON', () => {
    const error = new PlanLimitError('Límite', 'PLAN_PROJECT_LIMIT', {
      upgradeTo: 'starter',
      remaining: 0,
    });
    expect(isPlanLimitError(error)).toBe(true);
    expect(planErrorToJson(error)).toEqual({
      error: 'Límite',
      code: 'PLAN_PROJECT_LIMIT',
      upgradeTo: 'starter',
      remaining: 0,
    });
  });
});

describe('assertProjectSlotAccessible', () => {
  it('permite proyectos active', () => {
    expect(() => assertProjectSlotAccessible('active')).not.toThrow();
  });

  it('bloquea proyectos locked', () => {
    expect(() => assertProjectSlotAccessible('locked')).toThrow(PlanLimitError);
  });
});

describe('canChangeProjectSlotSelection', () => {
  it('no permite elegir si no hay locked', () => {
    expect(canChangeProjectSlotSelection('free', undefined, 0, 1)).toBe(false);
  });

  it('permite elegir tras downgrade con excedente sin confirmar', () => {
    expect(canChangeProjectSlotSelection('free', undefined, 2, 3)).toBe(true);
  });

  it('no permite elegir si ya confirmó para el plan actual', () => {
    expect(canChangeProjectSlotSelection('free', 'free', 2, 3)).toBe(false);
  });
});

describe('truncateBacklogToPlanLimits', () => {
  it('recorta épicas e historias al límite del plan', () => {
    const epics = [
      makeEpic({
        id: 'EPIC-001',
        title: 'A',
        userStories: [
          makeStory({ id: 'HU-001', title: '1' }),
          makeStory({ id: 'HU-002', title: '2' }),
          makeStory({ id: 'HU-003', title: '3' }),
          makeStory({ id: 'HU-004', title: '4' }),
        ],
      }),
      makeEpic({
        id: 'EPIC-002',
        title: 'B',
        userStories: [makeStory({ id: 'HU-005', title: '5' })],
      }),
      makeEpic({
        id: 'EPIC-003',
        title: 'C',
        userStories: [makeStory({ id: 'HU-006', title: '6' })],
      }),
    ];

    const result = truncateBacklogToPlanLimits(epics, {
      maxEpics: 2,
      maxStories: 3,
      maxStoriesPerEpic: 2,
    });

    expect(result.truncated).toBe(true);
    expect(result.epics).toHaveLength(2);
    expect(result.epics[0].userStories).toHaveLength(2);
    expect(result.message).toContain('límites de tu plan');
  });

  it('no marca truncated si cabe todo', () => {
    const result = truncateBacklogToPlanLimits(
      [makeEpic({ id: 'EPIC-001', title: 'A' })],
      { maxEpics: 5, maxStories: 13, maxStoriesPerEpic: 3 }
    );
    expect(result.truncated).toBe(false);
    expect(result.message).toBeUndefined();
  });
});
