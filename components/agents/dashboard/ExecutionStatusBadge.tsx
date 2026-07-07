import { KANBAN_COLUMNS, type KanbanStatus } from '@/lib/types/execution';

const STATUS_STYLES: Record<KanbanStatus, string> = {
  todo: 'border-slate-400/40 bg-slate-500/10 text-slate-300',
  in_progress: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
  code_review: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  done: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
};

export function ExecutionStatusBadge({ status }: { status: KanbanStatus }) {
  const label = KANBAN_COLUMNS.find((col) => col.id === status)?.label ?? status;

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        STATUS_STYLES[status],
      ].join(' ')}
    >
      {label}
    </span>
  );
}
