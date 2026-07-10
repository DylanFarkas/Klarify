import { describe, expect, it } from 'vitest';
import { getEffectivePlanId, PAST_DUE_GRACE_DAYS } from '@/lib/plans/subscription-policy';
import { DEFAULT_PLAN_ID } from '@/lib/plans/definitions';
import type { UserSubscription } from '@/lib/plans/types';

describe('getEffectivePlanId (integración de política de suscripción)', () => {
  it('devuelve el plan contratado cuando la suscripción está activa', () => {
    const subscription: UserSubscription = { planId: 'pro', status: 'active' };
    expect(getEffectivePlanId(subscription)).toBe('pro');
  });

  it('degrada a free cuando la suscripción está cancelada', () => {
    const subscription: UserSubscription = { planId: 'starter', status: 'canceled' };
    expect(getEffectivePlanId(subscription)).toBe(DEFAULT_PLAN_ID);
  });

  it('mantiene el plan durante el periodo de gracia past_due', () => {
    const pastDueSince = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const subscription: UserSubscription = {
      planId: 'starter',
      status: 'past_due',
      pastDueSince,
    };
    expect(getEffectivePlanId(subscription)).toBe('starter');
  });

  it('degrada a free si past_due supera los días de gracia', () => {
    const pastDueSince = new Date(
      Date.now() - (PAST_DUE_GRACE_DAYS + 1) * 24 * 60 * 60 * 1000
    ).toISOString();
    const subscription: UserSubscription = {
      planId: 'pro',
      status: 'past_due',
      pastDueSince,
    };
    expect(getEffectivePlanId(subscription)).toBe(DEFAULT_PLAN_ID);
  });
});