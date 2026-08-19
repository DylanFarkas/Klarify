/**
 * @fileoverview Tipos TypeScript para el Agente 4 — Priorización (MoSCoW).
 */

import type { Agent4Input } from '@/lib/types/workspace';
import type { EstimationMode, StoryEstimation } from '@/lib/types/agent-3';
import type { Epic } from '@/lib/types/agent-2';

export type Agent4Status = 'idle' | 'prioritizing' | 'review' | 'approved';

export type MoscowCategory = 'must' | 'should' | 'could' | 'wont';
export type WsjfCategory = 'critical' | 'high' | 'medium' | 'low';
export type RiceCategory = 'quick-win' | 'major-project' | 'fill-in' | 'thankless';
export type ValueEffortCategory = 'high-value-low-effort' | 'high-value-high-effort' | 'low-value-low-effort' | 'low-value-high-effort';

/** Frameworks de priorización soportados */
export type PrioritizationFramework = 'moscow' | 'wsjf' | 'rice' | 'value-effort';

export type FrameworkCategory = MoscowCategory | WsjfCategory | RiceCategory | ValueEffortCategory;

export interface StoryPrioritization {
  category: FrameworkCategory;
  justification: string;
  isModified: boolean;
}

export interface Agent4State {
  input: Agent4Input | null;
  priorities: Record<string, StoryPrioritization>;
  framework: PrioritizationFramework;
  status: Agent4Status;
  error: string | null;
}

export interface Agent4SuggestionItem {
  storyId: string;
  suggestedCategory: FrameworkCategory;
  justification: string;
}

export interface Agent4PrioritizationResponse {
  suggestions: Agent4SuggestionItem[];
}

/** Épica con estimaciones para el adaptador */
export interface LocalEpicWithEstimation {
  id: string;
  title: string;
  description?: string;
  userStories?: LocalUserStoryWithEstimation[];
}

export interface LocalUserStoryWithEstimation {
  id: string;
  title: string;
  description: string;
  points: number;
  effortLabel: string;
  pointsJustification?: string;
}

export interface Agent4PrioritizeRequest {
  epics: Epic[];
  estimations: Record<string, StoryEstimation>;
  estimationMode?: EstimationMode;
  framework?: PrioritizationFramework;
}

/** Convierte Epic[] + estimations al formato que consume el adaptador */
export function toLocalEpicsWithEstimation(
  epics: Epic[],
  estimations: Record<string, StoryEstimation>,
  estimationMode: EstimationMode = 'story_points'
): LocalEpicWithEstimation[] {
  return epics.map((epic) => ({
    id: epic.id,
    title: epic.title,
    description: epic.description,
    userStories: epic.userStories.map((story) => {
      const estimation = estimations[story.id];
      return {
        id: story.id,
        title: story.title,
        description: story.description,
        points: estimationMode === 'time' ? estimation?.durationMinutes ?? 0 : estimation?.points ?? 0,
        effortLabel:
          estimationMode === 'time'
            ? estimation?.durationLabel ||
              (estimation?.durationMinutes ? `${estimation.durationMinutes}m` : '—')
            : `${estimation?.points ?? 0} SP`,
        pointsJustification: estimation?.justification,
      };
    }),
  }));
}
