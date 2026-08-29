'use client';

import Link from 'next/link';
import type { DashboardSprintStoryRow } from '@/components/agents/dashboard/dashboardMetrics';
import { WorkItemTypeBadge } from '@/components/agents/shared/WorkItemTypeBadge';
import { backlogStoryHref } from '@/lib/utils/backlog-story-navigation';

interface BacklogStoryDetailHeaderProps {
  row: DashboardSprintStoryRow;
  storyIndex: number;
  storyCount: number;
  previousStoryId: string | null;
  nextStoryId: string | null;
}

export function BacklogStoryDetailHeader({
  row,
  storyIndex,
  storyCount,
  previousStoryId,
  nextStoryId,
}: BacklogStoryDetailHeaderProps) {
  const sprintLabel =
    row.sprintNumber != null ? `Sprint ${row.sprintNumber}` : 'Backlog';

  return (
    <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-4 border-b border-border bg-surface/95 px-4 py-2 backdrop-blur-sm md:px-6">
      <nav className="flex min-w-0 items-center gap-1.5 text-sm" aria-label="Navegación">
        <Link
          href="/agentes/backlog"
          className="shrink-0 font-medium text-muted transition-colors hover:text-foreground"
        >
          Backlog
        </Link>
        <ChevronRightIcon className="size-3.5 shrink-0 text-subtle" />
        <span className="hidden shrink-0 text-muted sm:inline">{sprintLabel}</span>
        <ChevronRightIcon className="hidden size-3.5 shrink-0 text-subtle sm:inline" />
        <span className="flex min-w-0 items-center gap-2 truncate">
          <span className="shrink-0 font-mono text-[12px] font-medium text-subtle">
            {row.story.id}
          </span>
          <WorkItemTypeBadge type={row.story.type} className="hidden shrink-0 sm:inline-flex" />
          <span className="truncate font-medium text-foreground">{row.story.title}</span>
        </span>
      </nav>

      <div className="flex shrink-0 items-center gap-1">
        {storyCount > 0 ? (
          <span className="mr-1 hidden text-xs tabular-nums text-muted sm:inline">
            {storyIndex + 1} / {storyCount}
          </span>
        ) : null}
        <NavArrow
          href={previousStoryId ? backlogStoryHref(previousStoryId) : null}
          label="Historia anterior"
        >
          <ChevronUpIcon />
        </NavArrow>
        <NavArrow
          href={nextStoryId ? backlogStoryHref(nextStoryId) : null}
          label="Historia siguiente"
        >
          <ChevronDownIcon />
        </NavArrow>
      </div>
    </header>
  );
}

function NavArrow({
  href,
  label,
  children,
}: {
  href: string | null;
  label: string;
  children: React.ReactNode;
}) {
  const className = [
    'inline-flex size-7 items-center justify-center rounded-md transition-colors',
    href
      ? 'cursor-pointer text-muted hover:bg-surface-hover hover:text-foreground'
      : 'cursor-not-allowed text-subtle/40',
  ].join(' ');

  if (href) {
    return (
      <Link href={href} aria-label={label} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <span aria-label={label} aria-disabled="true" className={className}>
      {children}
    </span>
  );
}

function ChevronRightIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}
