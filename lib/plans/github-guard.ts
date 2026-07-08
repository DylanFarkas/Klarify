/**
 * @fileoverview Guardia server-side para integración y exportación GitHub.
 */

import { resolveUserPlan } from '@/lib/plans/plan-service';
import { PlanLimitError } from '@/lib/plans/plan-errors';

export async function assertGithubExportAllowed(uid: string): Promise<void> {
  const plan = await resolveUserPlan(uid);
  if (!plan.limits.github) {
    throw new PlanLimitError(
      'La exportación a GitHub está disponible en el plan Pro.',
      'PLAN_FEATURE_GITHUB',
      { upgradeTo: 'pro' }
    );
  }
}
