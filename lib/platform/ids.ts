/**
 * @fileoverview Resolución flexible de IDs (HU-28, 28, EPIC-1, SPRINT-2).
 */

import type { UserWorkspace } from '@/lib/types/workspace';
import { getLiveBacklog, listLiveStories } from '@/lib/utils/live-backlog';
import { platformNotFound, platformInvalid } from '@/lib/platform/errors';

export function extractEntityNumber(raw: string): number | null {
  const trimmed = raw.trim();
  const prefixed = trimmed.match(
    /^(?:HU|BUG|TASK|STORY|US|USER[\s_-]?STORY|HISTORIA)[\s_-]*0*(\d+)$/i
  );
  if (prefixed) return Number(prefixed[1]);
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  return null;
}

export function canonicalizeSubtaskId(raw: string): string {
  const match = raw.trim().match(/^(?:ST[\s_-]*)?0*(\d+)$/i);
  if (match) return `ST-${String(Number(match[1])).padStart(3, '0')}`;
  return raw.trim().toUpperCase();
}

export function resolveStoryId(workspace: UserWorkspace, rawId: string): {
  storyId: string;
  title: string;
  epicId: string;
} {
  const stories = listLiveStories(workspace);
  const exact = stories.find((s) => s.id.toLowerCase() === rawId.toLowerCase());
  if (exact) {
    return { storyId: exact.id, title: exact.title, epicId: exact.epicId };
  }

  const num = extractEntityNumber(rawId);
  if (num !== null) {
    const byNumber = stories.filter((s) => extractEntityNumber(s.id) === num);
    if (byNumber.length === 1) {
      const match = byNumber[0];
      return { storyId: match.id, title: match.title, epicId: match.epicId };
    }
    if (byNumber.length > 1) {
      throw platformInvalid(
        `Ambiguo: varias historias coinciden con "${rawId}" (${byNumber.map((s) => s.id).join(', ')}).`,
        'STORY_AMBIGUOUS'
      );
    }
  }

  throw platformNotFound(`Historia no encontrada: ${rawId.trim()}.`, 'STORY_NOT_FOUND');
}

export function resolveEpicId(workspace: UserWorkspace, rawId: string): {
  epicId: string;
  title: string;
  storyCount: number;
} {
  const epics = getLiveBacklog(workspace).epics;
  const exact = epics.find((e) => e.id.toLowerCase() === rawId.toLowerCase());
  if (exact) {
    return { epicId: exact.id, title: exact.title, storyCount: exact.userStories.length };
  }

  const epicNumMatch = rawId.trim().match(/^(?:EPIC|EPI)?[\s_-]*0*(\d+)$/i);
  if (epicNumMatch) {
    const n = Number(epicNumMatch[1]);
    const byNumber = epics.filter((e) => {
      const m = e.id.match(/^EPIC-0*(\d+)$/i);
      return m && Number(m[1]) === n;
    });
    if (byNumber.length === 1) {
      const match = byNumber[0];
      return {
        epicId: match.id,
        title: match.title,
        storyCount: match.userStories.length,
      };
    }
  }

  throw platformNotFound(`Épica no encontrada: ${rawId.trim()}.`, 'EPIC_NOT_FOUND');
}

export function resolveSprintId(workspace: UserWorkspace, rawId: string): {
  sprintId: string;
  number: number;
  goal: string;
  storyCount: number;
  storyIds: string[];
} {
  const plan = getLiveBacklog(workspace).plan;
  if (!plan) {
    throw platformNotFound('No hay plan de sprints.', 'SPRINT_PLAN_MISSING');
  }

  const exact = plan.sprints.find((sprint) => sprint.id.toLowerCase() === rawId.toLowerCase());
  if (exact) {
    return {
      sprintId: exact.id,
      number: exact.number,
      goal: exact.sprintGoal,
      storyCount: exact.storyIds.length,
      storyIds: exact.storyIds,
    };
  }

  const sprintNumMatch = rawId.trim().match(/^(?:SPRINT|SP)?[\s_-]*0*(\d+)$/i);
  if (sprintNumMatch) {
    const n = Number(sprintNumMatch[1]);
    const byNumber = plan.sprints.filter((sprint) => sprint.number === n);
    const match = byNumber[0] ?? plan.sprints.find((sprint) => {
      const idMatch = sprint.id.match(/^SPRINT-0*(\d+)$/i);
      return idMatch && Number(idMatch[1]) === n;
    });
    if (match && (byNumber.length <= 1)) {
      return {
        sprintId: match.id,
        number: match.number,
        goal: match.sprintGoal,
        storyCount: match.storyIds.length,
        storyIds: match.storyIds,
      };
    }
  }

  throw platformNotFound(`Sprint no encontrado: ${rawId.trim()}.`, 'SPRINT_NOT_FOUND');
}
