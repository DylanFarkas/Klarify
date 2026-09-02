import { KANBAN_LABELS, type KanbanStatus } from '../core/types';

export function prettyPriority(value: string | null | undefined): string {
  if (!value) return '';
  const lower = value.toLowerCase();
  if (lower === 'wont' || lower === "won't") return "Won't";
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function statusLabel(status: string | null | undefined): string {
  const key = (status ?? 'todo') as KanbanStatus;
  return KANBAN_LABELS[key] ?? status ?? 'To-do';
}

export function typeLabel(type: string | undefined): string {
  if (type === 'bug') return 'Bug';
  if (type === 'task') return 'Task';
  return 'Historia';
}
