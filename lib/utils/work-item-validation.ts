/**
 * @fileoverview Validación y normalización de ítems de backlog (story | bug | task).
 */

import type { BugSeverity, UserStory, WorkItemType } from '@/lib/types/agent-2';
import { MIN_ACCEPTANCE_CRITERIA } from '@/lib/constants/agent-2';

export const WORK_ITEM_TYPES: WorkItemType[] = ['story', 'bug', 'task'];
export const BUG_SEVERITIES: BugSeverity[] = [
  'low',
  'medium',
  'high',
  'critical',
];

export function isWorkItemType(value: unknown): value is WorkItemType {
  return (
    typeof value === 'string' &&
    (WORK_ITEM_TYPES as string[]).includes(value)
  );
}

export function isBugSeverity(value: unknown): value is BugSeverity {
  return (
    typeof value === 'string' &&
    (BUG_SEVERITIES as string[]).includes(value)
  );
}

/** Resuelve el tipo efectivo (legacy sin campo → story). */
export function resolveWorkItemType(
  story: Pick<UserStory, 'type'> | null | undefined
): WorkItemType {
  return story?.type && isWorkItemType(story.type) ? story.type : 'story';
}

export function normalizeUserStory(story: UserStory): UserStory {
  const type = resolveWorkItemType(story);
  const normalized: UserStory = {
    ...story,
    type,
    acceptanceCriteria: Array.isArray(story.acceptanceCriteria)
      ? story.acceptanceCriteria
      : [],
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

export interface WorkItemFieldInput {
  type?: WorkItemType;
  title?: string;
  description?: string;
  acceptanceCriteria?: string[];
  severity?: BugSeverity;
  stepsToReproduce?: string[];
  technicalNotes?: string;
}

export function validateWorkItemFields(
  input: WorkItemFieldInput,
  options: { partial?: boolean } = {}
): string | null {
  const partial = options.partial === true;
  const type: WorkItemType =
    input.type && isWorkItemType(input.type) ? input.type : 'story';

  if (!partial) {
    if (!input.title?.trim()) return 'El título es obligatorio.';
    if (!input.description?.trim()) return 'La descripción es obligatoria.';
  }

  if (type === 'story') {
    const criteria = input.acceptanceCriteria ?? [];
    if (!partial && criteria.filter((c) => c.trim()).length < MIN_ACCEPTANCE_CRITERIA) {
      return 'Se requiere al menos un criterio de aceptación.';
    }
    if (
      partial &&
      input.acceptanceCriteria !== undefined &&
      criteria.filter((c) => c.trim()).length < MIN_ACCEPTANCE_CRITERIA
    ) {
      return 'Se requiere al menos un criterio de aceptación.';
    }
  }

  if (type === 'bug') {
    if (input.severity !== undefined && !isBugSeverity(input.severity)) {
      return 'Severidad de bug inválida.';
    }
    const severity = input.severity ?? 'medium';
    if (!partial && !isBugSeverity(severity)) {
      return 'Severidad de bug inválida.';
    }
    const steps = input.stepsToReproduce ?? [];
    if (!partial && steps.filter((s) => s.trim()).length < 1) {
      return 'Se requiere al menos un paso para reproducir el bug.';
    }
    if (
      partial &&
      input.stepsToReproduce !== undefined &&
      steps.filter((s) => s.trim()).length < 1
    ) {
      return 'Se requiere al menos un paso para reproducir el bug.';
    }
  }

  return null;
}
