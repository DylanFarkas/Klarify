/**
 * @fileoverview Generadores de IDs del Agente 2 (seguros para cliente).
 */

import type { Epic, StorySubtask, UserStory, WorkItemType } from '@/lib/types/agent-2';
import {
  BUG_ID_PREFIX,
  EPIC_ID_PREFIX,
  SUBTASK_ID_PREFIX,
  TASK_ID_PREFIX,
  USER_STORY_ID_PREFIX,
} from '@/lib/constants/agent-2';

export function workItemIdPrefix(type: WorkItemType): string {
  switch (type) {
    case 'bug':
      return BUG_ID_PREFIX;
    case 'task':
      return TASK_ID_PREFIX;
    case 'story':
    default:
      return USER_STORY_ID_PREFIX;
  }
}

function nextIdForPrefix(prefix: string, existingIds: string[]): string {
  const maxNum = existingIds.reduce((max, id) => {
    if (!id.startsWith(`${prefix}-`)) return max;
    const numStr = id.slice(prefix.length + 1);
    const num = parseInt(numStr, 10);
    return Number.isNaN(num) ? max : Math.max(max, num);
  }, 0);
  return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
}

export function generateEpicId(existing: Epic[] = []): string {
  return nextIdForPrefix(
    EPIC_ID_PREFIX,
    existing.map((epic) => epic.id)
  );
}

/** Variantes sobre ids sueltos, para no materializar los ítems completos. */
export function nextEpicIdFromIds(existingIds: string[]): string {
  return nextIdForPrefix(EPIC_ID_PREFIX, existingIds);
}

export function nextWorkItemIdFromIds(type: WorkItemType, existingIds: string[]): string {
  return nextIdForPrefix(workItemIdPrefix(type), existingIds);
}

/** Genera el siguiente HU-XXX a partir de ítems existentes (solo cuenta prefijo HU). */
export function generateUserStoryId(existing: UserStory[] = []): string {
  return generateWorkItemId('story', existing);
}

/** Genera el siguiente ID según el tipo (HU / BUG / TASK), contando solo ese prefijo. */
export function generateWorkItemId(
  type: WorkItemType,
  existing: UserStory[] = []
): string {
  return nextIdForPrefix(
    workItemIdPrefix(type),
    existing.map((item) => item.id)
  );
}

/** Genera el siguiente ST-XXX a partir de las subtareas de una misma historia. */
export function generateSubtaskId(existing: StorySubtask[] = []): string {
  return nextIdForPrefix(
    SUBTASK_ID_PREFIX,
    existing.map((item) => item.id)
  );
}

/** Asigna IDs y `done: false` a títulos de subtarea (salida del LLM o input de tools). */
export function assignSubtaskIds(titles: string[]): StorySubtask[] {
  const result: StorySubtask[] = [];
  for (const title of titles) {
    const trimmed = title.trim();
    if (!trimmed) continue;
    result.push({
      id: generateSubtaskId(result),
      title: trimmed,
      done: false,
    });
  }
  return result;
}
