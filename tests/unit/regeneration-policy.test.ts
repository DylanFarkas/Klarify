import { describe, expect, it } from 'vitest';
import {
  canRegenerateWithPolicy,
  getRegenerationPolicy,
  getUpgradeTargetForRegeneration,
} from '@/lib/plans/regeneration-policy';

describe('política de regeneración por plan', () => {
  it('bloquea regeneración en plan free', () => {
    expect(getRegenerationPolicy('free')).toEqual({ mode: 'blocked' });
    expect(
      canRegenerateWithPolicy('free', 'agent2', {
        agent2: 0,
        agent3: 0,
        agent4: 0,
        agent5: 0,
      })
    ).toEqual({ allowed: false, remaining: 0 });
  });

  it('limita regeneraciones mensuales en starter', () => {
    const result = canRegenerateWithPolicy('starter', 'agent3', {
      agent2: 0,
      agent3: 2,
      agent4: 0,
      agent5: 0,
    });
    expect(result).toEqual({ allowed: true, remaining: 1 });
  });

  it('niega regeneración cuando se agota el cupo starter', () => {
    const result = canRegenerateWithPolicy('starter', 'agent4', {
      agent2: 0,
      agent3: 0,
      agent4: 3,
      agent5: 0,
    });
    expect(result).toEqual({ allowed: false, remaining: 0 });
  });

  it('permite regeneración ilimitada en pro', () => {
    const result = canRegenerateWithPolicy('pro', 'agent5', {
      agent2: 99,
      agent3: 99,
      agent4: 99,
      agent5: 99,
    });
    expect(result).toEqual({ allowed: true, remaining: null });
  });

  it('sugiere el upgrade correcto según el plan actual', () => {
    expect(getUpgradeTargetForRegeneration('free')).toBe('starter');
    expect(getUpgradeTargetForRegeneration('starter')).toBe('pro');
    expect(getUpgradeTargetForRegeneration('pro')).toBeUndefined();
  });
});
