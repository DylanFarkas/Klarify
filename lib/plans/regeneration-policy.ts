/**
 * @fileoverview Política de regeneración por plan — desacoplada para cambios futuros.
 */

import type { PlanId, RegenerationAgent, RegenerationUsage, UserUsage } from '@/lib/plans/types';

export type RegenerationPolicy =
  | { mode: 'blocked' }
  | { mode: 'monthly'; perAgent: number }
  | { mode: 'unlimited' };

export const REGENERATION_POLICY: Record<PlanId, RegenerationPolicy> = {
  free: { mode: 'blocked' },
  starter: { mode: 'monthly', perAgent: 3 },
  pro: { mode: 'unlimited' },
};

export function getRegenerationPolicy(planId: PlanId): RegenerationPolicy {
  return REGENERATION_POLICY[planId];
}

export function canRegenerateWithPolicy(
  planId: PlanId,
  agent: RegenerationAgent,
  usage: RegenerationUsage
): { allowed: boolean; remaining: number | null } {
  const policy = getRegenerationPolicy(planId);

  if (policy.mode === 'blocked') {
    return { allowed: false, remaining: 0 };
  }

  if (policy.mode === 'unlimited') {
    return { allowed: true, remaining: null };
  }

  const used = usage[agent];
  const remaining = Math.max(0, policy.perAgent - used);
  return { allowed: remaining > 0, remaining };
}

export function getUpgradeTargetForRegeneration(planId: PlanId): PlanId | undefined {
  if (planId === 'free') return 'starter';
  if (planId === 'starter') return 'pro';
  return undefined;
}

export function canRegenerateClient(
  planId: PlanId,
  agent: RegenerationAgent,
  usage: UserUsage
): { allowed: boolean; remaining: number | null } {
  return canRegenerateWithPolicy(planId, agent, usage.regenerations);
}
