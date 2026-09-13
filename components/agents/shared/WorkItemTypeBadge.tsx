'use client';

import {
  BUG_SEVERITY_LABELS,
  WORK_ITEM_TYPE_LABELS,
} from '@/lib/constants/agent-2';
import type { BugSeverity, WorkItemType } from '@/lib/types/agent-2';
import { resolveWorkItemType } from '@/lib/utils/work-item-validation';

const TYPE_DOT_CLASS: Record<WorkItemType, string> = {
  story: 'bg-primary',
  bug: 'bg-red-500',
  task: 'bg-sky-500',
};

const TYPE_PILL_CLASS: Record<WorkItemType, string> = {
  story: 'bg-primary/12 text-primary dark:bg-primary/18',
  bug: 'bg-red-500/12 text-red-700 dark:bg-red-500/18 dark:text-red-400',
  task: 'bg-sky-500/12 text-sky-700 dark:bg-sky-500/18 dark:text-sky-400',
};

export function WorkItemTypeBadge({
  type,
  className = '',
}: {
  type?: WorkItemType | null;
  className?: string;
}) {
  const resolved = resolveWorkItemType({ type: type ?? undefined });
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold',
        TYPE_PILL_CLASS[resolved],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {WORK_ITEM_TYPE_LABELS[resolved]}
    </span>
  );
}

/** ID con color del tipo (sin label de Historia/Bug/Task). */
export function WorkItemIdLabel({
  id,
  type,
  className = '',
}: {
  id: string;
  type?: WorkItemType | null;
  className?: string;
}) {
  const resolved = resolveWorkItemType({ type: type ?? undefined });
  return (
    <span
      className={[
        'inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium',
        TYPE_PILL_CLASS[resolved],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {id}
    </span>
  );
}

export function workItemTypeLabel(type?: WorkItemType | null): string {
  return WORK_ITEM_TYPE_LABELS[resolveWorkItemType({ type: type ?? undefined })];
}

export function bugSeverityLabel(severity?: BugSeverity | null): string {
  if (!severity) return BUG_SEVERITY_LABELS.medium;
  return BUG_SEVERITY_LABELS[severity] ?? BUG_SEVERITY_LABELS.medium;
}
