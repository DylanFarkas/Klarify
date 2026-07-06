/**
 * @fileoverview Tipos del sistema de planes y límites de uso.
 */

export type PlanId = 'free' | 'starter' | 'pro';

export type BacklogDetail = 'compact' | 'standard' | 'detailed';

export type RegenerationAgent = 'agent2' | 'agent3' | 'agent4' | 'agent5';

export type PlanErrorCode =
  | 'PLAN_PROJECT_LIMIT'
  | 'PLAN_PROJECT_LOCKED'
  | 'PLAN_PROJECT_SELECTION_LOCKED'
  | 'PLAN_REGENERATION_BLOCKED'
  | 'PLAN_REGENERATION_LIMIT'
  | 'PLAN_STORY_LIMIT'
  | 'PLAN_FEATURE_GITHUB'
  | 'PLAN_FEATURE_EXPORT'
  | 'PLAN_FEATURE_EXECUTION_BOARD'
  | 'PLAN_TEAM_MEMBER_LIMIT'
  | 'PLAN_AUDIO_NOT_ALLOWED';

export interface PlanLimits {
  maxProjects: number;
  maxEpics: number;
  maxStories: number;
  maxStoriesPerEpic: number;
  thinkingBudget: number;
  backlogDetail: BacklogDetail;
  allowedFileTypes: readonly string[];
  github: boolean;
  export: false | 'manual' | 'full';
  executionBoard: boolean;
  maxTeamMembers: number;
}

export interface AiGenerationConfig {
  thinkingBudget: number;
  maxEpics: number;
  maxStories: number;
  maxStoriesPerEpic: number;
  backlogDetail: BacklogDetail;
}

export interface UserSubscription {
  planId: PlanId;
  status: 'active' | 'past_due' | 'canceled';
  /** ISO 8601 — inicio del periodo past_due (para gracia de 7 días). */
  pastDueSince?: string;
}

export interface RegenerationUsage {
  agent2: number;
  agent3: number;
  agent4: number;
  agent5: number;
}

export interface UserUsage {
  periodKey: string;
  regenerations: RegenerationUsage;
}

export interface PlanSnapshot {
  /** Plan cuyos límites aplican (puede ser free si la suscripción expiró). */
  id: PlanId;
  limits: PlanLimits;
  usage: UserUsage;
  subscription: UserSubscription;
}

export interface RegenerationCheckResult {
  allowed: boolean;
  remaining: number | null;
  upgradeTo?: PlanId;
}
