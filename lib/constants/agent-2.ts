/**
 * @fileoverview Constantes del Agente 2 — Backlog Inicial.
 */

export const EPIC_ID_PREFIX = 'EPIC';
export const USER_STORY_ID_PREFIX = 'HU';
export const BUG_ID_PREFIX = 'BUG';
export const TASK_ID_PREFIX = 'TASK';
export const SUBTASK_ID_PREFIX = 'ST';

export const WORK_ITEM_TYPE_LABELS: Record<
  import('@/lib/types/agent-2').WorkItemType,
  string
> = {
  story: 'Historia',
  bug: 'Bug',
  task: 'Task',
};

export const BUG_SEVERITY_LABELS: Record<
  import('@/lib/types/agent-2').BugSeverity,
  string
> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
};

export const STORAGE_KEY_AGENT_2_INPUT = 'agent_2_input';
export const STORAGE_KEY_AGENT_2 = 'klarify-agent2-state';

export const GENERATION_DELAY_MS = 2500; // mock delay para simular gen
export const MIN_ACCEPTANCE_CRITERIA = 1;
export const MAX_ACCEPTANCE_CRITERIA = 10;
export const MAX_SUBTASKS_PER_STORY = 12;
