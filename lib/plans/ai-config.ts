/**
 * @fileoverview Configuración por defecto de IA (plan free) para mocks y tests.
 */

import { getPlanLimits } from '@/lib/plans/definitions';
import type { AiGenerationConfig } from '@/lib/plans/types';

export function defaultAiConfig(): AiGenerationConfig {
  const limits = getPlanLimits('free');
  return {
    thinkingBudget: limits.thinkingBudget,
    maxEpics: limits.maxEpics,
    maxStories: limits.maxStories,
    maxStoriesPerEpic: limits.maxStoriesPerEpic,
    backlogDetail: limits.backlogDetail,
  };
}

export function backlogDetailPrompt(detail: AiGenerationConfig['backlogDetail']): string {
  switch (detail) {
    case 'compact':
      return 'Genera un backlog conciso y enfocado en el MVP.';
    case 'detailed':
      return 'Genera un backlog detallado con cobertura amplia de funcionalidades.';
    default:
      return 'Genera un backlog equilibrado con buena cobertura funcional.';
  }
}
