/**
 * Asignación determinista de historias a sprints respetando
 * dependencias, prioridad, capacidades habilitantes y límite de SP.
 */

import type { PrioritizationFramework } from '@/lib/types/agent-4';
import type {
  LocalStoryForPlanning,
  PlannedSprint,
  SprintPlanningConfig,
  StoryDependency,
} from '@/lib/types/agent-5';
import { SPRINT_ID_PREFIX, MOCK_SPRINT_GOALS } from '@/lib/constants/agent-5';
import { compareStoriesForSprintOrder } from '@/lib/utils/foundational-stories';

function topologicalSort(
  stories: LocalStoryForPlanning[],
  dependencies: StoryDependency[],
  framework: PrioritizationFramework
): LocalStoryForPlanning[] {
  const depMap = new Map<string, string[]>();
  for (const dep of dependencies) {
    const list = depMap.get(dep.storyId) ?? [];
    list.push(dep.dependsOnStoryId);
    depMap.set(dep.storyId, list);
  }

  const visited = new Set<string>();
  const sorted: LocalStoryForPlanning[] = [];
  const storyMap = new Map(stories.map((story) => [story.id, story]));
  const orderedStories = [...stories].sort((a, b) =>
    compareStoriesForSprintOrder(a, b, framework)
  );

  function visit(storyId: string) {
    if (visited.has(storyId)) return;
    visited.add(storyId);
    for (const depId of depMap.get(storyId) ?? []) {
      if (storyMap.has(depId)) visit(depId);
    }
    const story = storyMap.get(storyId);
    if (story) sorted.push(story);
  }

  for (const story of orderedStories) {
    visit(story.id);
  }

  for (const story of stories) {
    if (!visited.has(story.id)) sorted.push(story);
  }

  return sorted;
}

export function assignStoriesToSprints(
  stories: LocalStoryForPlanning[],
  dependencies: StoryDependency[],
  config: SprintPlanningConfig,
  framework: PrioritizationFramework
): { sprints: PlannedSprint[]; unassigned: string[] } {
  const sorted = topologicalSort(stories, dependencies, framework);

  const depMap = new Map<string, string[]>();
  for (const dep of dependencies) {
    const list = depMap.get(dep.storyId) ?? [];
    list.push(dep.dependsOnStoryId);
    depMap.set(dep.storyId, list);
  }

  const sprints: PlannedSprint[] = [];
  const storyToSprint = new Map<string, number>();
  const unassigned: string[] = [];

  for (const story of sorted) {
    const requiredDeps = depMap.get(story.id) ?? [];
    const depMinSprint = Math.max(
      0,
      ...requiredDeps.map((depId) => storyToSprint.get(depId) ?? 0)
    );
    let assigned = false;

    for (let sprintIdx = depMinSprint; sprintIdx < sprints.length; sprintIdx++) {
      if (sprints[sprintIdx].velocitySp + story.points <= config.sprintCapacitySp) {
        sprints[sprintIdx].storyIds.push(story.id);
        sprints[sprintIdx].velocitySp += story.points;
        storyToSprint.set(story.id, sprintIdx);
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

export function generateSprintGoals(
  sprints: PlannedSprint[],
  stories: LocalStoryForPlanning[]
): PlannedSprint[] {
  const storyMap = new Map(stories.map((story) => [story.id, story]));

  return sprints.map((sprint, idx) => {
    const sprintStories = sprint.storyIds
      .map((id) => storyMap.get(id))
      .filter(Boolean) as LocalStoryForPlanning[];
    const epicNames = [...new Set(sprintStories.map((story) => story.epicTitle))];
    const mustCount = sprintStories.filter((story) => story.priorityCategory === 'must').length;

    let goal: string;
    if (idx === 0) {
      goal = MOCK_SPRINT_GOALS[0] ?? 'Funcionalidades core y capacidades habilitantes';
    } else if (mustCount > sprintStories.length * 0.5) {
      goal = `Continuación de funcionalidades esenciales (${mustCount} Must Have)`;
    } else {
      goal = MOCK_SPRINT_GOALS[idx] ?? `Funcionalidades de ${epicNames.slice(0, 2).join(' y ')}`;
    }

    return { ...sprint, sprintGoal: `Sprint ${idx + 1}: ${goal}` };
  });
}
