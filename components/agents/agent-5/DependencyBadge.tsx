'use client';

import type { StoryDependency } from '@/lib/types/agent-5';
import { HoverTooltip } from '@/components/ui/HoverTooltip';
import {
  formatDependencyListTooltip,
  formatDependencyTooltip,
  getPrerequisiteTitle,
} from '@/lib/utils/dependency-display';

interface DependencyBadgeProps {
  storyId: string;
  dependencies: StoryDependency[];
  storyMap: Record<string, string>;
  isDetailed?: boolean;
  compact?: boolean;
}

const LinkIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
    />
  </svg>
);

export function DependencyBadge({ storyId, dependencies, storyMap, isDetailed, compact }: DependencyBadgeProps) {
  const deps = dependencies.filter(
    (d) => d.storyId === storyId || d.dependsOnStoryId === storyId
  );

  const blockedBy = deps.filter((d) => d.storyId === storyId);

  if (blockedBy.length === 0) return null;

  if (compact) {
    const tooltip = formatDependencyListTooltip(blockedBy, storyMap);
    return (
      <HoverTooltip
        title={tooltip.title}
        description={tooltip.description}
        detail={tooltip.detail}
        className="inline-flex shrink-0 cursor-default rounded text-subtle outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-border-strong"
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </HoverTooltip>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {blockedBy.map((dep) => {
        const prerequisite = getPrerequisiteTitle(dep, storyMap);
        const tooltip = formatDependencyTooltip(dep, storyMap);
        const displayText = isDetailed ? `Requiere: ${prerequisite}` : prerequisite;

        return (
          <HoverTooltip
            key={`${dep.storyId}-${dep.dependsOnStoryId}`}
            title={tooltip.title}
            description={tooltip.description}
            detail={tooltip.detail}
            className="inline-flex cursor-default rounded-md outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
          >
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-muted">
              <LinkIcon className="h-2.5 w-2.5" />
              {displayText}
            </span>
          </HoverTooltip>
        );
      })}
    </div>
  );
}
