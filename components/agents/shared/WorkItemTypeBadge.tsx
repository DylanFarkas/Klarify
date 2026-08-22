'use client';

import {
  BUG_SEVERITY_LABELS,
  WORK_ITEM_TYPE_LABELS,
} from '@/lib/constants/agent-2';
import type { BugSeverity, WorkItemType } from '@/lib/types/agent-2';
import { resolveWorkItemType } from '@/lib/utils/work-item-validation';

const TYPE_BADGE_CLASS: Record<WorkItemType, string> = {
  story: 'bg-elevated text-muted',
  bug: 'bg-red-500/10 text-red-600 dark:text-red-400',
  task: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
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
        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        TYPE_BADGE_CLASS[resolved],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {WORK_ITEM_TYPE_LABELS[resolved]}
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
