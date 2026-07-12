/**
 * Ranking de prioridad unificado para todos los frameworks del Agente 4.
 * Menor número = mayor prioridad.
 */

import type { PrioritizationFramework } from '@/lib/types/agent-4';
import {
  getFrameworkCategories,
  getFrameworkShortLabels,
} from '@/lib/constants/agent-4';

export function getPriorityRank(
  framework: PrioritizationFramework,
  category: string
): number {
  const categories = getFrameworkCategories(framework);
  const index = categories.indexOf(category);
  return index === -1 ? 99 : index;
}

export function getPriorityOrderLabel(framework: PrioritizationFramework): string {
  const categories = getFrameworkCategories(framework);
  const labels = getFrameworkShortLabels(framework);
  return categories.map((category) => labels[category] ?? category).join(' > ');
}

/**
 * El prerequisito no debería tener menor prioridad que la historia dependiente.
 */
export function violatesPriorityOrder(
  dependentCategory: string,
  prerequisiteCategory: string,
  framework: PrioritizationFramework
): boolean {
  return (
    getPriorityRank(framework, prerequisiteCategory) >
    getPriorityRank(framework, dependentCategory)
  );
}
