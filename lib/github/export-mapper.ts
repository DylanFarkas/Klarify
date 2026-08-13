/**
 * @fileoverview Transforma Agent6Input en payloads exportables para GitHub.
 */

import type { Agent6Input } from '@/lib/types/workspace';
import type { Epic, UserStory } from '@/lib/types/agent-2';
import type { PlannedSprint, StoryDependency } from '@/lib/types/agent-5';
import {
  getFrameworkLabels,
  getFrameworkShortLabels,
} from '@/lib/constants/agent-4';
import type { PrioritizationFramework } from '@/lib/types/agent-4';

export interface ExportableStory {
  story: UserStory;
  epic: Epic;
  points: number;
  priorityLabel: string;
  priorityCategory: string;
  sprint: PlannedSprint | null;
  dependencies: StoryDependency[];
}

export interface ExportableBacklog {
  epics: Epic[];
  stories: ExportableStory[];
  sprints: PlannedSprint[];
  framework: PrioritizationFramework;
  priorityOptionNames: string[];
}

export function buildExportableBacklog(input: Agent6Input): ExportableBacklog {
  const labels = getFrameworkLabels(input.framework);
  const shortLabels = getFrameworkShortLabels(input.framework);
  const priorityOptionNames = Object.values(shortLabels);

  const sprintByStoryId = new Map<string, PlannedSprint>();
  for (const sprint of input.plan.sprints) {
    for (const storyId of sprint.storyIds) {
      sprintByStoryId.set(storyId, sprint);
    }
  }

  const dependenciesByStoryId = new Map<string, StoryDependency[]>();
  for (const dep of input.plan.dependencies) {
    const list = dependenciesByStoryId.get(dep.storyId) ?? [];
    list.push(dep);
    dependenciesByStoryId.set(dep.storyId, list);
  }

  const stories: ExportableStory[] = input.epics.flatMap((epic) =>
    epic.userStories.map((story) => {
      const category = input.priorities[story.id]?.category ?? 'could';
      return {
        story,
        epic,
        points: input.estimations[story.id]?.points ?? 0,
        priorityLabel: labels[category] ?? category,
        priorityCategory: category,
        sprint: sprintByStoryId.get(story.id) ?? null,
        dependencies: dependenciesByStoryId.get(story.id) ?? [],
      };
    })
  );

  return {
    epics: input.epics,
    stories,
    sprints: input.plan.sprints,
    framework: input.framework,
    priorityOptionNames,
  };
}

export function buildEpicIssueBody(epic: Epic): string {
  const lines = [
    epic.description,
    '',
    '## Historias incluidas',
    ...epic.userStories.map((story) => `- ${story.id}: ${story.title}`),
    '',
    '---',
    `_Exportado desde Klarify · Épica ${epic.id}_`,
  ];
  return lines.join('\n');
}

export function buildStoryIssueBody(exportable: ExportableStory, allStories: ExportableStory[]): string {
  const { story, epic, points, priorityLabel, sprint, dependencies } = exportable;
  const type = story.type ?? 'story';

  const acceptanceLines =
    story.acceptanceCriteria.length > 0
      ? story.acceptanceCriteria.map((criterion) => `- [ ] ${criterion}`)
      : ['- [ ] Sin criterios definidos'];

  const dependencyLines =
    dependencies.length > 0
      ? dependencies.map((dep) => {
          const prerequisite = allStories.find((item) => item.story.id === dep.dependsOnStoryId);
          const title = prerequisite?.story.title ?? dep.dependsOnStoryId;
          return `- Depende de **${dep.dependsOnStoryId}**: ${title}${dep.reason ? ` — ${dep.reason}` : ''}`;
        })
      : ['- Ninguna'];

  const sprintLine = sprint
    ? `Sprint ${sprint.number}: ${sprint.sprintGoal} (${sprint.startDate} → ${sprint.endDate})`
    : 'Sin sprint asignado';

  const bugBlocks: string[] = [];
  if (type === 'bug') {
    bugBlocks.push(
      '',
      '## Severidad',
      story.severity ?? 'medium',
      '',
      '## Pasos para reproducir',
      ...(story.stepsToReproduce && story.stepsToReproduce.length > 0
        ? story.stepsToReproduce.map((step, i) => `${i + 1}. ${step}`)
        : ['1. Sin pasos definidos'])
    );
  }

  const taskBlocks: string[] = [];
  if (type === 'task' && story.technicalNotes) {
    taskBlocks.push('', '## Notas técnicas', story.technicalNotes);
  }

  const lines = [
    '## Descripción',
    story.description,
    ...bugBlocks,
    ...taskBlocks,
    '',
    '## Criterios de aceptación',
    ...acceptanceLines,
    '',
    '## Dependencias',
    ...dependencyLines,
    '',
    '## Metadatos',
    `- **ID:** ${story.id}`,
    `- **Tipo:** ${type}`,
    `- **Épica:** ${epic.id} — ${epic.title}`,
    `- **Story Points:** ${points}`,
    `- **Prioridad:** ${priorityLabel}`,
    `- **Sprint:** ${sprintLine}`,
    '',
    '---',
    `_Exportado desde Klarify · ${story.id}_`,
  ];

  return lines.join('\n');
}

export function buildSprintMilestoneTitle(sprint: PlannedSprint): string {
  return `Sprint ${sprint.number}: ${sprint.sprintGoal}`;
}

export function buildSprintMilestoneDescription(sprint: PlannedSprint): string {
  return `Objetivo: ${sprint.sprintGoal}\nVelocidad: ${sprint.velocitySp} SP\nPeríodo: ${sprint.startDate} → ${sprint.endDate}`;
}

export function buildSprintFieldValue(sprint: PlannedSprint): string {
  return `Sprint ${sprint.number} (${sprint.startDate} → ${sprint.endDate})`;
}
