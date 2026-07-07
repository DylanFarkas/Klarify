/**
 * @fileoverview Reglas para la elección única de proyectos activos tras un downgrade.
 */

import { getPlanLimits } from '@/lib/plans/definitions';
import type { PlanId } from '@/lib/plans/types';

/**
 * Indica si el usuario debe elegir manualmente qué proyectos desbloquear.
 * Solo aplica cuando hay más proyectos que slots del plan (downgrade forzado).
 */
export function canChangeProjectSlotSelection(
  effectivePlanId: PlanId,
  confirmedForPlan: PlanId | undefined,
  lockedCount: number,
  totalProjects: number
): boolean {
  if (lockedCount === 0) {
    return false;
  }

  const maxActive = getPlanLimits(effectivePlanId).maxProjects;

  // Caben todos → sync los desbloquea; no hace falta elegir.
  if (totalProjects <= maxActive) {
    return false;
  }

  if (!confirmedForPlan) {
    return true;
  }

  // Ya confirmó para el plan actual.
  if (confirmedForPlan === effectivePlanId) {
    return false;
  }

  // Cambió de plan y aún hay excedente → una elección para el plan nuevo.
  return true;
}