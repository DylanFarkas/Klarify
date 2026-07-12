/**
 * @fileoverview Guardia server-side para exportación de archivos del proyecto.
 */

import { resolveUserPlan } from '@/lib/plans/plan-service';
import { PlanLimitError } from '@/lib/plans/plan-errors';

export async function assertProjectExportAllowed(uid: string): Promise<void> {
  const plan = await resolveUserPlan(uid);
  if (!plan.limits.export) {
    throw new PlanLimitError(
      'La exportación de proyectos no está disponible en tu plan actual.',
      'PLAN_FEATURE_EXPORT',
      { upgradeTo: 'starter' }
    );
  }
}
