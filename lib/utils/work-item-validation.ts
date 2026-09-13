/**
 * @fileoverview Validación y normalización de ítems de backlog (story | bug | task).
 */

import type { BugSeverity, StorySubtask, UserStory, WorkItemType } from '@/lib/types/agent-2';
import {
  MAX_SUBTASKS_PER_STORY,
  SUBTASK_ID_PREFIX,
} from '@/lib/constants/agent-2';
import { generateSubtaskId } from '@/lib/utils/agent-2-ids';
import {
  bugSeveritySchema,
  parseSubtasks,
  parseWorkItemFields,
  workItemTypeSchema,
  type WorkItemFieldInput,
} from '@/lib/schemas/work-item';

export type { WorkItemFieldInput };

export const WORK_ITEM_TYPES: WorkItemType[] = ['story', 'bug', 'task'];
export const BUG_SEVERITIES: BugSeverity[] = [
  'low',
  'medium',
  'high',
  'critical',
];

export function isWorkItemType(value: unknown): value is WorkItemType {
  return workItemTypeSchema.safeParse(value).success;
}

export function isBugSeverity(value: unknown): value is BugSeverity {
  return bugSeveritySchema.safeParse(value).success;
}

/** Resuelve el tipo efectivo (legacy sin campo → story). */
export function resolveWorkItemType(
  story: Pick<UserStory, 'type'> | null | undefined
): WorkItemType {
  return story?.type && isWorkItemType(story.type) ? story.type : 'story';
}

export function normalizeSubtasks(value: unknown): StorySubtask[] {
  if (!Array.isArray(value)) return [];

  const result: StorySubtask[] = [];
  for (const item of value) {
    if (result.length >= MAX_SUBTASKS_PER_STORY) break;

    if (typeof item === 'string') {
      const title = item.trim();
      if (!title) continue;
      result.push({
        id: generateSubtaskId(result),
        title,
        done: false,
      });
      continue;
    }

    if (!item || typeof item !== 'object') continue;
    const raw = item as { id?: unknown; title?: unknown; done?: unknown };
    const title = typeof raw.title === 'string' ? raw.title.trim() : '';
    if (!title) continue;

    const candidateId =
      typeof raw.id === 'string' && raw.id.startsWith(`${SUBTASK_ID_PREFIX}-`)
        ? raw.id
        : generateSubtaskId(result);
    const id = result.some((subtask) => subtask.id === candidateId)
      ? generateSubtaskId(result)
      : candidateId;

    result.push({
      id,
      title,
      done: raw.done === true,
    });
  }
  return result;
}

export function validateSubtasks(value: unknown): string | null {
  return parseSubtasks(value);
}

export function normalizeUserStory(story: UserStory): UserStory {
  const type = resolveWorkItemType(story);
  const normalized: UserStory = {
    ...story,
    type,
    acceptanceCriteria: Array.isArray(story.acceptanceCriteria)
      ? story.acceptanceCriteria
      : [],
    subtasks: normalizeSubtasks(story.subtasks),
  };

  if (type === 'bug') {
    normalized.severity = isBugSeverity(story.severity)
      ? story.severity
      : 'medium';
    normalized.stepsToReproduce = Array.isArray(story.stepsToReproduce)
      ? story.stepsToReproduce
      : [];
    delete normalized.technicalNotes;
  } else if (type === 'task') {
    if (typeof story.technicalNotes === 'string') {
      normalized.technicalNotes = story.technicalNotes;
    }
    delete normalized.severity;
    delete normalized.stepsToReproduce;
  } else {
    delete normalized.severity;
    delete normalized.stepsToReproduce;
    delete normalized.technicalNotes;
  }

  return normalized;
}

export function normalizeEpicStories<T extends { userStories: UserStory[] }>(
  epic: T
): T {
  return {
    ...epic,
    userStories: epic.userStories.map(normalizeUserStory),
  };
}

export function normalizeEpics(epics: UserStory[] | import('@/lib/types/agent-2').Epic[]): import('@/lib/types/agent-2').Epic[] {
  // Overload-friendly: always treat as Epic[]
  const list = epics as import('@/lib/types/agent-2').Epic[];
  return list.map(normalizeEpicStories);
}

export function validateWorkItemFields(
  input: WorkItemFieldInput,
  options: { partial?: boolean } = {}
): string | null {
  return parseWorkItemFields(input, options);
}
