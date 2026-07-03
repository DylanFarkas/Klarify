'use client';

import { useState } from 'react';
import type { PlannedSprint, StoryDependency } from '@/lib/types/agent-5';
import type { UserStory } from '@/lib/types/agent-2';
import type { StoryEstimation } from '@/lib/types/agent-3';
import type { StoryPrioritization } from '@/lib/types/agent-4';
import { getFrameworkShortLabels, getFrameworkColors } from '@/lib/constants/agent-4';
import { MOSCOW_PRIORITY_ORDER } from '@/lib/constants/agent-5';
import { DetailModal } from '@/components/agents/shared/DetailModal';
import { UserStoryDetailContent } from '@/components/agents/shared/UserStoryDetailContent';
import { ViewDetailsButton } from '@/components/agents/shared/ViewDetailsButton';
import { DependencyBadge } from './DependencyBadge';
import type { PrioritizationFramework } from '@/lib/types/agent-4';

interface SprintCardProps {
  sprint: PlannedSprint;
  sprintIndex: number;
  stories: UserStory[];
  estimations: Record<string, StoryEstimation>;
  priorities: Record<string, StoryPrioritization>;
  framework: PrioritizationFramework;
  dependencies: StoryDependency[];
  epicMap: Record<string, string>;
  colorClass: string;
  isApproved: boolean;
  totalProjectSp: number;
  completedSpBefore: number;
  onGoalChange: (goal: string) => void;
  onMoveStory: (storyId: string, fromSprintId: string, toSprintId: string | null) => void;
  isEditable: boolean;
}

const capacityColors = [
  'bg-emerald-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-orange-500',
  'bg-red-500',
  'bg-red-600',
];

function getCapacityColor(velocity: number, capacity: number): string {
  const ratio = velocity / capacity;
  if (ratio <= 0.5) return 'bg-emerald-500';
  if (ratio <= 0.75) return 'bg-amber-500';
  if (ratio <= 1.0) return 'bg-orange-500';
  return 'bg-red-500';
}

export function SprintCard({
  sprint,
  sprintIndex,
  stories,
  estimations,
  priorities,
  framework,
  dependencies,
  epicMap,
  colorClass,
  isApproved,
  totalProjectSp,
  completedSpBefore,
  onGoalChange,
  isEditable,
}: SprintCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState(sprint.sprintGoal);
  const [detailStoryId, setDetailStoryId] = useState<string | null>(null);

  const sprintStories = sprint.storyIds
    .map((id) => stories.find((s) => s.id === id))
    .filter(Boolean) as UserStory[];

  const sprintSharePct = totalProjectSp > 0 ? Math.round((sprint.velocitySp / totalProjectSp) * 100) : 0;
  const cumulativePct = totalProjectSp > 0 ? Math.round(((completedSpBefore + sprint.velocitySp) / totalProjectSp) * 100) : 0;
  const completionColor = cumulativePct <= 25 ? 'bg-emerald-500' : cumulativePct <= 50 ? 'bg-amber-500' : cumulativePct <= 75 ? 'bg-blue-500' : 'bg-violet-500';

  const mustCount = sprintStories.filter((s) => priorities[s.id]?.category === 'must').length;
  const shouldCount = sprintStories.filter((s) => priorities[s.id]?.category === 'should').length;

  const handleSaveGoal = () => {
    if (goalDraft.trim() !== sprint.sprintGoal) {
      onGoalChange(goalDraft.trim());
    }
    setEditingGoal(false);
  };

  const detailStory = detailStoryId ? stories.find((s) => s.id === detailStoryId) : null;

  return (
    <div className={`overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-md ${colorClass}`}>
      <div className="border-b border-border bg-surface-muted/40 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-[11px] font-bold text-muted hover:bg-surface-hover cursor-pointer transition-colors"
              title={isExpanded ? 'Colapsar' : 'Expandir'}
            >
              {sprintIndex + 1}
            </button>
            <div className="min-w-0">
              {editingGoal && !isApproved ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={goalDraft}
                    onChange={(e) => setGoalDraft(e.target.value)}
                    onBlur={handleSaveGoal}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveGoal();
                      if (e.key === 'Escape') { setGoalDraft(sprint.sprintGoal); setEditingGoal(false); }
                    }}
                    className="rounded-lg border border-border bg-surface px-2 py-1 text-sm font-bold text-foreground w-80 focus:border-primary focus:outline-none"
                    autoFocus
                  />
                </div>
              ) : (
                <h4
                  className={`text-sm font-bold text-foreground ${!isApproved ? 'cursor-pointer hover:text-primary' : ''}`}
                  onClick={() => !isApproved && setEditingGoal(true)}
                  title={!isApproved ? 'Click para editar el Sprint Goal' : undefined}
                >
                  {sprint.sprintGoal}
                </h4>
              )}
              <p className="mt-0.5 text-[10px] text-muted">
                {sprintStories.length} historia{sprintStories.length !== 1 ? 's' : ''} · {sprint.velocitySp} SP
                {mustCount > 0 && ` · ${mustCount} Must`}
                {shouldCount > 0 && ` · ${shouldCount} Should`}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {sprint.isEdited && (
              <span className="shrink-0 rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600">
                HITL
              </span>
            )}
            <div className="flex items-center gap-2 text-[10px] text-muted">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              {sprint.startDate} → {sprint.endDate}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="whitespace-nowrap text-[10px] text-muted">Aporta {sprintSharePct}% · avance {cumulativePct}%</span>
              <div className="h-2 min-w-28 w-28 rounded-full bg-surface-muted overflow-hidden sm:w-32 md:w-36">
                <div
                  className={`h-full rounded-full transition-all ${completionColor}`}
                  style={{ width: `${Math.min(cumulativePct, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {isExpanded && sprintStories.length > 0 && (
        <div className="divide-y divide-border">
          {sprintStories.map((story) => {
            const pri = priorities[story.id];
            const est = estimations[story.id];
            const labels = getFrameworkShortLabels(framework);
            const colors = getFrameworkColors(framework);

            return (
              <div key={story.id} className="px-5 py-4 sm:px-6 hover:bg-surface-hover/30 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 rounded-md border border-border bg-surface-muted px-2 py-0.5 font-mono text-[10px] font-medium text-muted">
                        {story.id}
                      </span>
                      <h5 className="truncate text-sm font-semibold text-foreground">{story.title}</h5>
                      <DependencyBadge
                        storyId={story.id}
                        dependencies={dependencies}
                        storyMap={Object.fromEntries(stories.map((s) => [s.id, s.title.slice(0, 30)]))}
                      />
                      <ViewDetailsButton
                        onClick={() => setDetailStoryId(story.id)}
                        className="ml-auto shrink-0"
                      />
                    </div>
                    <p className="line-clamp-1 text-xs text-muted">{story.description}</p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
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
                    <span className="text-[10px] text-muted">{epicMap[story.id] ?? ''}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isExpanded && sprintStories.length === 0 && (
        <div className="px-6 py-8 text-center text-sm text-muted">
          Sin historias asignadas.
        </div>
      )}

      {detailStory && (
        <DetailModal
          open={!!detailStory}
          onClose={() => setDetailStoryId(null)}
          title={detailStory.title}
          subtitle={detailStory.id}
          eyebrow="Historia de usuario"
        >
          <UserStoryDetailContent
            story={detailStory}
            epicTitle={epicMap[detailStory.id] ?? ''}
            estimation={estimations[detailStory.id]}
            prioritization={priorities[detailStory.id]}
            framework={framework}
          />
        </DetailModal>
      )}
    </div>
  );
}
