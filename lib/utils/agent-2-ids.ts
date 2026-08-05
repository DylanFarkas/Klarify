/**
 * @fileoverview Generadores de IDs del Agente 2 (seguros para cliente).
 */

import type { Epic, UserStory } from '@/lib/types/agent-2';
import { EPIC_ID_PREFIX, USER_STORY_ID_PREFIX } from '@/lib/constants/agent-2';

export function generateEpicId(existing: Epic[] = []): string {
  const maxNum = existing.reduce((max, epic) => {
    const numStr = epic.id.replace(`${EPIC_ID_PREFIX}-`, '');
    const num = parseInt(numStr, 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
  return `${EPIC_ID_PREFIX}-${String(maxNum + 1).padStart(3, '0')}`;
}

export function generateUserStoryId(existing: UserStory[] = []): string {
  const maxNum = existing.reduce((max, story) => {
    const numStr = story.id.replace(`${USER_STORY_ID_PREFIX}-`, '');
    const num = parseInt(numStr, 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
  return `${USER_STORY_ID_PREFIX}-${String(maxNum + 1).padStart(3, '0')}`;
}
