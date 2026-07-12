/**
 * @fileoverview Resolución del plan efectivo según estado de suscripción.
 */

import { DEFAULT_PLAN_ID } from '@/lib/plans/definitions';
import type { PlanId, UserSubscription } from '@/lib/plans/types';

/** Días de gracia tras un pago fallido antes de degradar a free. */
export const PAST_DUE_GRACE_DAYS = 7;

function isWithinGracePeriod(pastDueSince: string): boolean {
  const started = new Date(pastDueSince).getTime();
  if (Number.isNaN(started)) return false;
  const graceMs = PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - started < graceMs;
}

/** Plan cuyos límites aplican según planId y status de la suscripción. */
export function getEffectivePlanId(subscription: UserSubscription): PlanId {
  if (subscription.status === 'canceled') {
    return DEFAULT_PLAN_ID;
  }

  if (subscription.status === 'past_due') {
    if (subscription.pastDueSince && isWithinGracePeriod(subscription.pastDueSince)) {
      return subscription.planId;
    }
    return DEFAULT_PLAN_ID;
  }

  return subscription.planId;
}
