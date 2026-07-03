'use client';

import type { SprintPlan, StoryDependency } from '@/lib/types/agent-5';
import type { UserStory } from '@/lib/types/agent-2';
import type { StoryEstimation } from '@/lib/types/agent-3';
import type { StoryPrioritization, PrioritizationFramework } from '@/lib/types/agent-4';
import { SPRINT_COLORS } from '@/lib/constants/agent-5';
import { SprintCard } from './SprintCard';
import { DependencyBadge } from './DependencyBadge';

interface SprintBoardProps {
  plan: SprintPlan;
  stories: UserStory[];
  estimations: Record<string, StoryEstimation>;
  priorities: Record<string, StoryPrioritization>;
  framework: PrioritizationFramework;
  epicMap: Record<string, string>;
  isApproved: boolean;
  onGoalChange: (sprintId: string, goal: string) => void;
  onMoveStory: (storyId: string, fromSprintId: string, toSprintId: string | null) => void;
}

export function SprintBoard({
  plan,
  stories,
  estimations,
  priorities,
  framework,
  epicMap,
  isApproved,
  onGoalChange,
  onMoveStory,
}: SprintBoardProps) {
  const totalSp = plan.sprints.reduce((sum, s) => sum + s.velocitySp, 0);
  const avgVelocity = plan.sprints.length > 0 ? Math.round(totalSp / plan.sprints.length) : 0;

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_0.3s_ease-out]">
      {plan.dependencies.length > 0 && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            <span className="text-xs font-medium text-amber-700">
              {plan.dependencies.length} dependencia{plan.dependencies.length !== 1 ? 's' : ''} detectada{plan.dependencies.length !== 1 ? 's' : ''}
            </span>
            <div className="flex flex-wrap gap-1 ml-2">
              {plan.dependencies.slice(0, 3).map((dep) => (
                <DependencyBadge
                  key={`${dep.storyId}-${dep.dependsOnStoryId}`}
                  storyId={dep.storyId}
                  dependencies={[dep]}
                  storyMap={Object.fromEntries(stories.map((s) => [s.id, s.title.slice(0, 25)]))}
                  isDetailed
                />
              ))}
              {plan.dependencies.length > 3 && (
                <span className="text-[10px] text-muted">+{plan.dependencies.length - 3} más</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {plan.sprints.map((sprint, idx) => {
          const completedSpBefore = plan.sprints.slice(0, idx).reduce((sum, item) => sum + item.velocitySp, 0);

          return (
            <SprintCard
              key={sprint.id}
              sprint={sprint}
              sprintIndex={idx}
              stories={stories}
              estimations={estimations}
              priorities={priorities}
              framework={framework}
              dependencies={plan.dependencies}
              epicMap={epicMap}
              colorClass={`border-l-4 ${SPRINT_COLORS[idx % SPRINT_COLORS.length]}`}
              isApproved={isApproved}
              totalProjectSp={totalSp}
              completedSpBefore={completedSpBefore}
              onGoalChange={(goal) => onGoalChange(sprint.id, goal)}
              onMoveStory={(storyId, fromId, toId) => onMoveStory(storyId, fromId, toId)}
              isEditable={!isApproved}
            />
          );
        })}
      </div>

      {plan.sprints.length > 0 && (
        <div className="rounded-xl border border-border bg-surface-muted/40 px-5 py-3">
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
            <span>
              <span className="font-bold text-foreground">{plan.sprints.length}</span> sprint{plan.sprints.length !== 1 ? 's' : ''}
            </span>
            <span className="h-4 w-px bg-border" />
            <span>
              <span className="font-bold text-foreground">{totalSp}</span> SP totales
            </span>
            <span className="h-4 w-px bg-border" />
            <span>
              <span className="font-bold text-foreground">{avgVelocity}</span> SP/sprint (promedio)
            </span>
            <span className="h-4 w-px bg-border" />
            <span>
              <span className="font-bold text-foreground">{stories.length}</span> historias planificadas
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
