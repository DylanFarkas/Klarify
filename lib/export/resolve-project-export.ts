/**
 * @fileoverview Resuelve datos del workspace en un payload exportable unificado.
 */

import { FRAMEWORK_DESCRIPTIONS } from '@/lib/constants/agent-4';
import { getFrameworkLabels } from '@/lib/constants/agent-4';
import { KANBAN_COLUMNS, MEMBER_ROLE_LABELS } from '@/lib/types/execution';
import type { UserWorkspace } from '@/lib/types/workspace';
import type { Epic } from '@/lib/types/agent-2';
import type { EstimationMode, StoryEstimation } from '@/lib/types/agent-3';
import type { PrioritizationFramework, StoryPrioritization } from '@/lib/types/agent-4';
import type { PlannedSprint, SprintPlan, StoryDependency } from '@/lib/types/agent-5';
import { getLiveBacklog } from '@/lib/utils/live-backlog';
import {
  formatEffortTotal,
  formatEstimation,
  getEffortValue,
  isStoryEstimated,
} from '@/lib/utils/estimation';
import type { ProjectExportPayload, ProjectExportStoryRow } from '@/lib/export/types';

const KANBAN_LABELS = Object.fromEntries(
  KANBAN_COLUMNS.map((column) => [column.id, column.label])
) as Record<string, string>;

function resolveEpics(workspace: UserWorkspace): Epic[] {
  return getLiveBacklog(workspace).epics;
}

function resolveEstimations(workspace: UserWorkspace): Record<string, StoryEstimation> {
  return getLiveBacklog(workspace).estimations;
}

function resolvePriorities(workspace: UserWorkspace): Record<string, StoryPrioritization> {
  return getLiveBacklog(workspace).priorities;
}

function resolveFramework(workspace: UserWorkspace): PrioritizationFramework | null {
  return getLiveBacklog(workspace).framework;
}

function resolvePlan(workspace: UserWorkspace): SprintPlan | null {
  return getLiveBacklog(workspace).plan;
}

function resolveDependencies(plan: SprintPlan | null): StoryDependency[] {
  return plan?.dependencies ?? [];
}

function buildStoryRows(
  epics: Epic[],
  estimations: Record<string, StoryEstimation>,
  estimationMode: EstimationMode,
  priorities: Record<string, StoryPrioritization>,
  framework: PrioritizationFramework | null,
  plan: SprintPlan | null,
  workspace: UserWorkspace
): ProjectExportStoryRow[] {
  const labels = framework ? getFrameworkLabels(framework) : null;
  const sprintByStoryId = new Map<string, PlannedSprint>();
  if (plan) {
    for (const sprint of plan.sprints) {
      for (const storyId of sprint.storyIds) {
        sprintByStoryId.set(storyId, sprint);
      }
    }
  }

  const dependenciesByStoryId = new Map<string, StoryDependency[]>();
  for (const dep of plan?.dependencies ?? []) {
    const list = dependenciesByStoryId.get(dep.storyId) ?? [];
    list.push(dep);
    dependenciesByStoryId.set(dep.storyId, list);
  }

  const membersById = new Map(
    (workspace.execution?.members ?? []).map((member) => [member.id, member])
  );

  return epics.flatMap((epic) =>
    epic.userStories.map((story) => {
      const estimation = estimations[story.id];
      const prioritization = priorities[story.id];
      const sprint = sprintByStoryId.get(story.id) ?? null;
      const execution = workspace.execution?.stories[story.id];
      const assignee = execution?.assigneeId ? membersById.get(execution.assigneeId) : null;

      return {
        storyId: story.id,
        storyType: story.type ?? 'story',
        storyTitle: story.title,
        storyDescription: story.description,
        acceptanceCriteria: story.acceptanceCriteria,
        subtasks: story.subtasks ?? [],
        severity: story.severity ?? null,
        stepsToReproduce: story.stepsToReproduce ?? [],
        technicalNotes: story.technicalNotes ?? null,
        epicId: epic.id,
        epicTitle: epic.title,
        epicDescription: epic.description,
        storyPoints: estimationMode === 'story_points' && isStoryEstimated(estimation, estimationMode)
          ? estimation.points
          : null,
        durationLabel:
          estimationMode === 'time' && isStoryEstimated(estimation, estimationMode)
            ? formatEstimation(estimation, estimationMode)
            : null,
        effortLabel: isStoryEstimated(estimation, estimationMode)
          ? formatEstimation(estimation, estimationMode)
          : null,
        effortValue: getEffortValue(estimation, estimationMode),
        estimationJustification: estimation?.justification ?? null,
        priorityCategory: prioritization?.category ?? null,
        priorityLabel: prioritization && labels ? labels[prioritization.category] ?? prioritization.category : null,
        priorityJustification: prioritization?.justification ?? null,
        sprintId: sprint?.id ?? null,
        sprintNumber: sprint?.number ?? null,
        sprintGoal: sprint?.sprintGoal ?? null,
        sprintStartDate: sprint?.startDate ?? null,
        sprintEndDate: sprint?.endDate ?? null,
        sprintVelocitySp: sprint?.velocitySp ?? null,
        dependencies: dependenciesByStoryId.get(story.id) ?? [],
        sourceWishIds: story.sourceWishIds,
        kanbanStatus: execution?.status ?? null,
        kanbanStatusLabel: execution ? KANBAN_LABELS[execution.status] ?? execution.status : null,
        assigneeId: execution?.assigneeId ?? null,
        assigneeName: assignee?.displayName ?? null,
      };
    })
  );
}

export function resolveProjectExport(
  workspace: UserWorkspace,
  projectName: string
): ProjectExportPayload {
  const epics = resolveEpics(workspace);
  const live = getLiveBacklog(workspace);
  const estimations = resolveEstimations(workspace);
  const estimationMode = live.estimationMode;
  const priorities = resolvePriorities(workspace);
  const framework = resolveFramework(workspace);
  const plan = resolvePlan(workspace);
  const stories = buildStoryRows(
    epics,
    estimations,
    estimationMode,
    priorities,
    framework,
    plan,
    workspace
  );
  const storyCount = stories.length;
  const estimatedStoryCount = stories.filter((row) => row.effortLabel !== null).length;
  const prioritizedStoryCount = stories.filter((row) => row.priorityCategory !== null).length;
  const plannedStoryCount = plan
    ? new Set(plan.sprints.flatMap((sprint) => sprint.storyIds)).size
    : 0;
  const totalEffort = stories.reduce((sum, row) => sum + row.effortValue, 0);

  const completionCount = [
    workspace.agent1.status,
    workspace.agent2.status,
    workspace.agent3.status,
    workspace.agent4.status,
    workspace.agent5.status,
  ].filter((status) => status === 'approved').length;

  return {
    exportedAt: new Date().toISOString(),
    projectName,
    pipelineCompletionPercentage: Math.round((completionCount / 5) * 100),
    estimationMode,
    framework,
    frameworkLabel: framework ? FRAMEWORK_DESCRIPTIONS[framework].label : null,
    wishes: workspace.agent1.wishes,
    epics,
    estimations,
    priorities,
    plan,
    sprints: plan?.sprints ?? [],
    dependencies: resolveDependencies(plan),
    unassignedStoryIds: plan?.unassignedStoryIds ?? [],
    stories,
    execution: workspace.execution ?? null,
    members: workspace.execution?.members ?? [],
    summary: {
      epicCount: epics.length,
      storyCount,
      totalStoryPoints: totalEffort,
      totalEffortLabel: formatEffortTotal(totalEffort, estimationMode),
      estimatedStoryCount,
      prioritizedStoryCount,
      sprintCount: plan?.sprints.length ?? 0,
      plannedStoryCount,
      unassignedStoryCount: plan?.unassignedStoryIds.length ?? Math.max(storyCount - plannedStoryCount, 0),
    },
  };
}

export function canExportProject(workspace: UserWorkspace): boolean {
  const epics = resolveEpics(workspace);
  const storyCount = epics.reduce((sum, epic) => sum + epic.userStories.length, 0);
  return storyCount > 0 || workspace.agent1.wishes.length > 0;
}

export { MEMBER_ROLE_LABELS };
