/**
 * @fileoverview Tipos para exportación de proyectos (JSON, Markdown, Excel).
 */

import type { Wish } from '@/lib/types/agent-1';
import type { Epic } from '@/lib/types/agent-2';
import type { StoryEstimation } from '@/lib/types/agent-3';
import type { PrioritizationFramework, StoryPrioritization } from '@/lib/types/agent-4';
import type { PlannedSprint, SprintPlan, StoryDependency } from '@/lib/types/agent-5';
import type { ExecutionState, KanbanStatus, ProjectMember } from '@/lib/types/execution';

export type ProjectExportFormat = 'json' | 'markdown' | 'xlsx';

export interface ProjectExportStoryRow {
  storyId: string;
  storyType: import('@/lib/types/agent-2').WorkItemType;
  storyTitle: string;
  storyDescription: string;
  acceptanceCriteria: string[];
  severity: import('@/lib/types/agent-2').BugSeverity | null;
  stepsToReproduce: string[];
  technicalNotes: string | null;
  epicId: string;
  epicTitle: string;
  epicDescription: string;
  storyPoints: number | null;
  estimationJustification: string | null;
  priorityCategory: string | null;
  priorityLabel: string | null;
  priorityJustification: string | null;
  sprintId: string | null;
  sprintNumber: number | null;
  sprintGoal: string | null;
  sprintStartDate: string | null;
  sprintEndDate: string | null;
  sprintVelocitySp: number | null;
  dependencies: StoryDependency[];
  sourceWishIds: string[];
  kanbanStatus: KanbanStatus | null;
  kanbanStatusLabel: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
}

export interface ProjectExportPayload {
  exportedAt: string;
  projectName: string;
  pipelineCompletionPercentage: number;
  framework: PrioritizationFramework | null;
  frameworkLabel: string | null;
  wishes: Wish[];
  epics: Epic[];
  estimations: Record<string, StoryEstimation>;
  priorities: Record<string, StoryPrioritization>;
  plan: SprintPlan | null;
  sprints: PlannedSprint[];
  dependencies: StoryDependency[];
  unassignedStoryIds: string[];
  stories: ProjectExportStoryRow[];
  execution: ExecutionState | null;
  members: ProjectMember[];
  summary: {
    epicCount: number;
    storyCount: number;
    totalStoryPoints: number;
    estimatedStoryCount: number;
    prioritizedStoryCount: number;
    sprintCount: number;
    plannedStoryCount: number;
    unassignedStoryCount: number;
  };
}

export interface ProjectExportResult {
  /** Present for text formats (JSON, Markdown). */
  content?: string;
  /** Present for binary formats (Excel). */
  blob?: Blob;
  mimeType: string;
  extension: string;
  filename: string;
}
