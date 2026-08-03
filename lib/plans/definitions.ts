/**
 * @fileoverview Límites por plan — única fuente de verdad editable.
 */

import type { PlanId, PlanLimits } from '@/lib/plans/types';

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    maxProjects: 1,
    maxEpics: 5,
    maxStories: 13,
    maxStoriesPerEpic: 3,
    thinkingBudget: 512,
    backlogDetail: 'compact',
    allowedFileTypes: ['.txt', '.pdf'],
    github: false,
    export: 'manual',
    executionBoard: false,
    maxTeamMembers: 0,
    maxHarnessMessages: 15,
  },
  starter: {
    maxProjects: 3,
    maxEpics: 10,
    maxStories: 40,
    maxStoriesPerEpic: 5,
    thinkingBudget: 1024,
    backlogDetail: 'standard',
    allowedFileTypes: ['.mp3', '.wav', '.txt', '.pdf'],
    github: false,
    export: 'manual',
    executionBoard: true,
    maxTeamMembers: 8,
    maxHarnessMessages: 60,
  },
  pro: {
    maxProjects: 10,
    maxEpics: 25,
    maxStories: 150,
    maxStoriesPerEpic: 8,
    thinkingBudget: 2048,
    backlogDetail: 'detailed',
    allowedFileTypes: ['.mp3', '.wav', '.txt', '.pdf'],
    github: true,
    export: 'full',
    executionBoard: true,
    maxTeamMembers: 25,
    maxHarnessMessages: null,
  },
};

export function getPlanLimits(planId: PlanId): PlanLimits {
  return PLAN_LIMITS[planId];
}

export const DEFAULT_PLAN_ID: PlanId = 'free';
