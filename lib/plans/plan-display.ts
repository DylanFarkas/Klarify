/**
 * @fileoverview Etiquetas y utilidades de presentación de planes (client-safe).
 */

import type { PlanId } from '@/lib/plans/types';

const PLAN_NAMES: Record<PlanId, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
};

export function getPlanDisplayName(planId: PlanId): string {
  return PLAN_NAMES[planId];
}

export function canUpgradePlan(planId: PlanId): boolean {
  return planId !== 'pro';
}
