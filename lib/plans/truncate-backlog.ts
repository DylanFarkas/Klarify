/**
 * @fileoverview Recorta backlog generado para cumplir límites del plan.
 */

import type { Epic } from '@/lib/types/agent-2';
import type { AiGenerationConfig } from '@/lib/plans/types';

export interface TruncateBacklogResult {
  epics: Epic[];
  truncated: boolean;
  message?: string;
}

export function truncateBacklogToPlanLimits(
  epics: Epic[],
  config: Pick<AiGenerationConfig, 'maxEpics' | 'maxStories' | 'maxStoriesPerEpic'>
): TruncateBacklogResult {
  const limitedEpics: Epic[] = [];
  let totalStories = 0;
  let truncated = false;

  for (const epic of epics.slice(0, config.maxEpics)) {
    const remaining = config.maxStories - totalStories;
    if (remaining <= 0) {
      truncated = true;
      break;
    }

    const stories = epic.userStories.slice(0, Math.min(config.maxStoriesPerEpic, remaining));
    if (stories.length < epic.userStories.length) {
      truncated = true;
    }

    totalStories += stories.length;
    limitedEpics.push({ ...epic, userStories: stories });
  }

  if (epics.length > config.maxEpics) {
    truncated = true;
  }

  return {
    epics: limitedEpics,
    truncated,
    message: truncated
      ? `El backlog se ajustó a los límites de tu plan (${config.maxEpics} épicas, ${config.maxStories} historias).`
      : undefined,
  };
}
