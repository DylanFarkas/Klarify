/**
 * @fileoverview Mock data para el Agente 5 — Sprint Planning.
 *
 * Simula la salida del Scrum Master IA con heurísticas deterministas:
 * ordenar por prioridad MoSCoW, detectar dependencias por keywords,
 * distribuir en sprints según capacidad, y generar cronograma.
 */

import type {
  LocalStoryForPlanning,
  SprintPlan,
  SprintPlanningConfig,
  StoryDependency,
  PlannedSprint,
} from '@/lib/types/agent-5';
import { sortStoriesByPriority, buildSprintSchedule } from '@/lib/types/agent-5';
import {
  SPRINT_ID_PREFIX,
  DEPENDENCY_KEYWORDS,
  MOCK_SPRINT_PLANNING_PREFIX,
  MOCK_SPRINT_GOALS,
} from '@/lib/constants/agent-5';

export const MOCK_SPRINT_PLANNING_THOUGHTS = [
  'Analizando el backlog priorizado y sus Story Points...',
  'Identificando dependencias semánticas entre historias de usuario...',
  'Distribuyendo historias en sprints según capacidad y prioridad MoSCoW...',
  'Calculando velocidad estimada por sprint...',
  'Generando cronograma con fechas de inicio y fin...',
];

function detectDependencies(stories: LocalStoryForPlanning[]): StoryDependency[] {
  const deps: StoryDependency[] = [];
  const titles = stories.map((s) => ({ id: s.id, title: s.title.toLowerCase(), desc: s.description.toLowerCase() }));

  for (const story of titles) {
    for (const rule of DEPENDENCY_KEYWORDS) {
      if (!story.title.includes(rule.word) && !story.desc.includes(rule.word)) continue;

      for (const depWord of rule.dependsOn) {
        const dependent = titles.find(
          (t) => t.id !== story.id && (t.title.includes(depWord) || t.desc.includes(depWord))
        );
        if (dependent && !deps.some((d) => d.storyId === story.id && d.dependsOnStoryId === dependent.id)) {
          deps.push({
            storyId: story.id,
            dependsOnStoryId: dependent.id,
            reason: `"${story.title}" requiere "${dependent.title}" por dependencia funcional detectada.`,
          });
        }
      }
    }
  }

  return deps;
}

function topologicalSort(
  stories: LocalStoryForPlanning[],
  dependencies: StoryDependency[]
): LocalStoryForPlanning[] {
  const depMap = new Map<string, string[]>();
  for (const d of dependencies) {
    const list = depMap.get(d.storyId) ?? [];
    list.push(d.dependsOnStoryId);
    depMap.set(d.storyId, list);
  }

  const visited = new Set<string>();
  const sorted: LocalStoryForPlanning[] = [];
  const storyMap = new Map(stories.map((s) => [s.id, s]));

  function visit(storyId: string) {
    if (visited.has(storyId)) return;
    visited.add(storyId);
    const deps = depMap.get(storyId) ?? [];
    for (const depId of deps) {
      if (storyMap.has(depId)) visit(depId);
    }
    const story = storyMap.get(storyId);
    if (story) sorted.push(story);
  }

  for (const story of stories) {
    visit(story.id);
  }

  const unvisited = stories.filter((s) => !sorted.includes(s));
  for (const story of unvisited) {
    sorted.push(story);
  }

  return sorted;
}

function assignToSprints(
  stories: LocalStoryForPlanning[],
  dependencies: StoryDependency[],
  config: SprintPlanningConfig
): { sprints: PlannedSprint[]; unassigned: string[] } {
  const sorted = topologicalSort(stories, dependencies);

  const depMap = new Map<string, string[]>();
  for (const d of dependencies) {
    const list = depMap.get(d.storyId) ?? [];
    list.push(d.dependsOnStoryId);
    depMap.set(d.storyId, list);
  }

  const sprints: PlannedSprint[] = [];
  const storyToSprint = new Map<string, number>();
  const unassigned: string[] = [];

  for (const story of sorted) {
    const requiredDeps = depMap.get(story.id) ?? [];
    const depMinSprint = Math.max(0, ...requiredDeps.map((did) => (storyToSprint.get(did) ?? 0)));
    let assigned = false;

    for (let si = depMinSprint; si < sprints.length; si++) {
      const currentSp = sprints[si].velocitySp;
      if (currentSp + story.points <= config.sprintCapacitySp) {
        sprints[si].storyIds.push(story.id);
        sprints[si].velocitySp += story.points;
        storyToSprint.set(story.id, si);
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      const newSprintIdx = sprints.length;
      sprints.push({
        id: `${SPRINT_ID_PREFIX}-${String(newSprintIdx + 1).padStart(3, '0')}`,
        number: newSprintIdx + 1,
        sprintGoal: '',
        storyIds: [story.id],
        velocitySp: story.points,
        startDate: '',
        endDate: '',
        isEdited: false,
      });
      storyToSprint.set(story.id, newSprintIdx);
    }
  }

  return { sprints, unassigned };
}

function generateGoals(sprints: PlannedSprint[], stories: LocalStoryForPlanning[]): PlannedSprint[] {
  const storyMap = new Map(stories.map((s) => [s.id, s]));
  return sprints.map((sprint, idx) => {
    const sprintStories = sprint.storyIds.map((id) => storyMap.get(id)).filter(Boolean) as LocalStoryForPlanning[];
    const epicNames = [...new Set(sprintStories.map((s) => s.epicTitle))];
    const mustCount = sprintStories.filter((s) => s.priorityCategory === 'must').length;

    let goal: string;
    if (idx === 0) {
      goal = MOCK_SPRINT_GOALS[0] ?? 'Funcionalidades core';
    } else     if (idx > 0 && mustCount > sprintStories.length * 0.5) {
      goal = `Continuación de funcionalidades esenciales (${mustCount} Must Have)`;
    } else {
      goal = MOCK_SPRINT_GOALS[idx] ?? `Funcionalidades de ${epicNames.slice(0, 2).join(' y ')}`;
    }

    return { ...sprint, sprintGoal: `Sprint ${idx + 1}: ${goal}` };
  });
}

export function mockPlanSprints(
  stories: LocalStoryForPlanning[],
  config: SprintPlanningConfig,
  framework: string = 'moscow'
): SprintPlan {
  const sorted = sortStoriesByPriority(stories, framework as any);
  const dependencies = detectDependencies(sorted);
  const { sprints, unassigned } = assignToSprints(sorted, dependencies, config);
  const withGoals = generateGoals(sprints, sorted);
  const scheduled = buildSprintSchedule(withGoals, config);

  return {
    sprints: scheduled,
    dependencies,
    config,
    unassignedStoryIds: unassigned,
  };
}
