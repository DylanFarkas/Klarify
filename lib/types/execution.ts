/**
 * @fileoverview Tipos del módulo de ejecución (mini-Jira / tablero Kanban).
 */

export type KanbanStatus = 'todo' | 'in_progress' | 'code_review' | 'done';

export type ProjectMemberRole =
  | 'scrum_master'
  | 'product_owner'
  | 'developer'
  | 'qa'
  | 'designer';

export type ProjectMemberInput = {
  id?: string;
  displayName: string;
  email?: string;
  role: ProjectMemberRole;
};

export interface ProjectMember {
  id: string;
  displayName: string;
  email?: string;
  role: ProjectMemberRole;
  avatarColor: string;
  createdAt: number;
}

export type ExecutionActivityType = 'status_change' | 'assignee_change';

export interface ExecutionActivityEntry {
  type: ExecutionActivityType;
  from: string | null;
  to: string | null;
  at: number;
}

export interface StoryExecution {
  status: KanbanStatus;
  assigneeId: string | null;
  columnOrder: number;
  updatedAt: number;
  activity?: ExecutionActivityEntry[];
}

export interface ExecutionState {
  initializedAt: number;
  members: ProjectMember[];
  stories: Record<string, StoryExecution>;
  sprintFilter: string | 'all';
}

export const KANBAN_COLUMNS: { id: KanbanStatus; label: string }[] = [
  { id: 'todo', label: 'To-Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'code_review', label: 'Code Review' },
  { id: 'done', label: 'Done' },
];

export const MEMBER_ROLE_LABELS: Record<ProjectMemberRole, string> = {
  scrum_master: 'Scrum Master',
  product_owner: 'Product Owner',
  developer: 'Developer',
  qa: 'QA',
  designer: 'Designer',
};

export const AVATAR_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#0ea5e9',
  '#64748b',
] as const;

export function generateMemberId(members: { id: string }[]): string {
  const maxId = members.reduce((max, member) => {
    const match = member.id.match(/^MEM-(\d+)$/i);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `MEM-${String(maxId + 1).padStart(3, '0')}`;
}

export function pickAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}
