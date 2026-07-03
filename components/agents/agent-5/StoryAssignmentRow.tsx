'use client';

import { useState } from 'react';
import type { UserStory } from '@/lib/types/agent-2';
import type { StoryEstimation } from '@/lib/types/agent-3';
import type { StoryPrioritization, PrioritizationFramework } from '@/lib/types/agent-4';
import { getFrameworkShortLabels, getFrameworkColors } from '@/lib/constants/agent-4';
import { DetailModal } from '@/components/agents/shared/DetailModal';
import { UserStoryDetailContent } from '@/components/agents/shared/UserStoryDetailContent';
import { ViewDetailsButton } from '@/components/agents/shared/ViewDetailsButton';

interface StoryAssignmentRowProps {
  story: UserStory;
  epicTitle: string;
  est: StoryEstimation | undefined;
  pri: StoryPrioritization | undefined;
  framework: PrioritizationFramework;
  currentSprintId: string | null;
  sprintOptions: { id: string; number: number }[];
  unassignedStoryIds: string[];
  onAssign: (storyId: string, sprintId: string | null) => void;
  isApproved: boolean;
}

export function StoryAssignmentRow({
  story,
  epicTitle,
  est,
  pri,
  framework,
  currentSprintId,
  sprintOptions,
  onAssign,
  isApproved,
}: StoryAssignmentRowProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const labels = getFrameworkShortLabels(framework);
  const colors = getFrameworkColors(framework);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:px-6 lg:grid-cols-[1fr_120px_140px]">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-md border border-border bg-surface-muted px-2 py-0.5 font-mono text-[10px] font-medium text-muted">
              {story.id}
            </span>
            <h5 className="truncate text-sm font-semibold text-foreground">{story.title}</h5>
            <ViewDetailsButton onClick={() => setIsDetailOpen(true)} className="ml-auto shrink-0" />
          </div>
          <p className="line-clamp-1 text-xs text-muted">{story.description}</p>
        </div>

        <div className="flex items-center gap-2">
          {pri && (
            <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${colors[pri.category] ?? ''}`}>
              {labels[pri.category] ?? pri.category}
            </span>
          )}
          {est && (
            <span className="inline-flex items-center rounded-full border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] font-bold text-muted">
              {est.points} SP
            </span>
          )}
        </div>

        <div className="flex items-center justify-end">
          <select
            value={currentSprintId ?? '_unassigned'}
            onChange={(e) => {
              const val = e.target.value;
              onAssign(story.id, val === '_unassigned' ? null : val);
            }}
            disabled={isApproved}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground focus:border-primary focus:outline-none disabled:opacity-50 cursor-pointer"
          >
            {sprintOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                Sprint {opt.number}
              </option>
            ))}
            <option value="_unassigned">Sin asignar</option>
          </select>
        </div>
      </div>

      <DetailModal
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={story.title}
        subtitle={story.id}
        eyebrow="Historia de usuario"
      >
        <UserStoryDetailContent
          story={story}
          epicTitle={epicTitle}
          estimation={est}
          prioritization={pri}
          framework={framework}
        />
      </DetailModal>
    </>
  );
}
