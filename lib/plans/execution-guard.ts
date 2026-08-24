/**
 * @fileoverview Guardia server-side para el tablero de ejecución.
 */

import type { DocumentSnapshot } from 'firebase-admin/firestore';

import { resolveUserPlan } from '@/lib/plans/plan-service';
import { PlanLimitError } from '@/lib/plans/plan-errors';

export async function assertExecutionBoardAllowed(
  uid: string,
  preloadedUserSnapshot?: DocumentSnapshot
): Promise<void> {
  const plan = await resolveUserPlan(uid, preloadedUserSnapshot);
  if (!plan.limits.executionBoard) {
    throw new PlanLimitError(
      'El tablero de ejecución está disponible en los planes Starter y Pro.',
      'PLAN_FEATURE_EXECUTION_BOARD',
      { upgradeTo: 'starter' }
    );
  }
}

export async function assertTeamMemberLimit(uid: string, currentCount: number): Promise<void> {
  const plan = await resolveUserPlan(uid);
  if (!plan.limits.executionBoard) {
    throw new PlanLimitError(
      'La gestión de equipo está disponible en los planes Starter y Pro.',
      'PLAN_FEATURE_EXECUTION_BOARD',
      { upgradeTo: 'starter' }
    );
  }
  if (currentCount >= plan.limits.maxTeamMembers) {
    throw new PlanLimitError(
      `Has alcanzado el límite de ${plan.limits.maxTeamMembers} miembros en tu plan.`,
      'PLAN_TEAM_MEMBER_LIMIT',
      { upgradeTo: plan.id === 'starter' ? 'pro' : undefined }
    );
  }
}
