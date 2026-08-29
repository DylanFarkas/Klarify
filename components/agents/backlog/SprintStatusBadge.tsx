'use client';

import type { SprintStatus } from '@/lib/types/agent-5';

export function SprintStatusBadge({ status }: { status: SprintStatus }) {
  const styles =
    status === 'active'
      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300'
      : status === 'completed'
        ? 'border-border bg-surface-muted text-muted'
        : 'border-border bg-surface text-foreground';
  const label =
    status === 'active' ? 'Activo' : status === 'completed' ? 'Cerrado' : 'Planificado';

  return (
    <span
      className={`rounded-full border px-1.5 py-px text-[8px] font-bold uppercase tracking-wider ${styles}`}
    >
      {label}
    </span>
  );
}
