'use client';

import type { StoryDependency } from '@/lib/types/agent-5';

interface DependencyBadgeProps {
  storyId: string;
  dependencies: StoryDependency[];
  storyMap: Record<string, string>;
  isDetailed?: boolean;
}

export function DependencyBadge({ storyId, dependencies, storyMap, isDetailed }: DependencyBadgeProps) {
  const deps = dependencies.filter(
    (d) => d.storyId === storyId || d.dependsOnStoryId === storyId
  );

  const blockedBy = deps.filter((d) => d.storyId === storyId);

  if (blockedBy.length === 0 && deps.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {blockedBy.map((dep) => (
        <span
          key={`${dep.storyId}-${dep.dependsOnStoryId}`}
          title={dep.reason}
          className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 cursor-help"
        >
          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
          {isDetailed ? `Depende de ${storyMap[dep.dependsOnStoryId] ?? dep.dependsOnStoryId}` : storyMap[dep.dependsOnStoryId] ?? dep.dependsOnStoryId}
        </span>
      ))}
    </div>
  );
}
