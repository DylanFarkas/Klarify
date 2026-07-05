/**
 * Validación de dependencias entre historias de usuario.
 * Reglas agnósticas al dominio: prioridad, grounding semántico, orden de sprints y ciclos.
 */

import type { LocalStoryForPlanning, PlannedSprint, StoryDependency } from '@/lib/types/agent-5';
import type { PrioritizationFramework } from '@/lib/types/agent-4';
import { violatesPriorityOrder as violatesFrameworkPriorityOrder } from '@/lib/utils/priority-rank';

export interface SanitizeDependenciesOptions {
  /** Framework de priorización usado en el Agente 4. */
  framework: PrioritizationFramework;
  /** Si se provee, descarta dependencias que contradigan el orden de sprints. */
  sprints?: PlannedSprint[];
}

const STOP_WORDS = new Set([
  'como',
  'para',
  'este',
  'esta',
  'esto',
  'esos',
  'esas',
  'debe',
  'debo',
  'poder',
  'pueda',
  'puedo',
  'puede',
  'quiero',
  'quiere',
  'tener',
  'hacer',
  'desde',
  'hacia',
  'sobre',
  'entre',
  'cuando',
  'donde',
  'cual',
  'todo',
  'toda',
  'todos',
  'todas',
  'cada',
  'otro',
  'otra',
  'otros',
  'otras',
]);

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function storyText(story: LocalStoryForPlanning): string {
  return normalizeText(`${story.title} ${story.description}`);
}

export function containsKeyword(text: string, keyword: string): boolean {
  const normalized = normalizeText(text);
  const normalizedKeyword = normalizeText(keyword);
  if (!normalizedKeyword) return false;

  const variants = [normalizedKeyword];
  if (!normalizedKeyword.endsWith('s')) {
    variants.push(`${normalizedKeyword}s`);
  }

  for (const variant of variants) {
    const index = normalized.indexOf(variant);
    if (index === -1) continue;

    const before = index === 0 ? '' : normalized[index - 1];
    const after = normalized[index + variant.length] ?? '';
    const isWordChar = (ch: string) => /[\p{L}\p{N}]/u.test(ch);

    if ((!before || !isWordChar(before)) && (!after || !isWordChar(after))) {
      return true;
    }
  }

  return false;
}

function extractSignificantTokens(text: string): string[] {
  return normalizeText(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));
}

/**
 * La historia dependiente debe referenciar al prerequisito en su texto
 * o la justificación debe mencionar explícitamente al prerequisito.
 */
export function hasSemanticGrounding(
  dependent: LocalStoryForPlanning,
  prerequisite: LocalStoryForPlanning,
  reason?: string
): boolean {
  const dependentContext = storyText(dependent);
  const prerequisiteTokens = [
    ...extractSignificantTokens(prerequisite.title),
    ...extractSignificantTokens(prerequisite.description),
  ];

  const uniquePrerequisiteTokens = [...new Set(prerequisiteTokens)];

  if (uniquePrerequisiteTokens.length === 0) return true;

  const textGrounded = uniquePrerequisiteTokens.some((token) =>
    containsKeyword(dependentContext, token)
  );
  if (textGrounded) return true;

  if (!reason) return false;

  const normalizedReason = normalizeText(reason);
  if (containsKeyword(normalizedReason, prerequisite.id)) return true;

  return uniquePrerequisiteTokens.some((token) => containsKeyword(normalizedReason, token));
}

function buildSprintIndex(sprints: PlannedSprint[]): Map<string, number> {
  const index = new Map<string, number>();
  for (let sprintIdx = 0; sprintIdx < sprints.length; sprintIdx++) {
    for (const storyId of sprints[sprintIdx].storyIds) {
      index.set(storyId, sprintIdx);
    }
  }
  return index;
}

/** La dependiente no puede estar en un sprint anterior al de su prerequisito. */
export function violatesSprintOrder(
  dependentId: string,
  prerequisiteId: string,
  sprintIndex: Map<string, number>
): boolean {
  const dependentSprint = sprintIndex.get(dependentId);
  const prerequisiteSprint = sprintIndex.get(prerequisiteId);
  if (dependentSprint === undefined || prerequisiteSprint === undefined) return false;
  return dependentSprint < prerequisiteSprint;
}

function buildAdjacency(dependencies: StoryDependency[]): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  for (const dep of dependencies) {
    const edges = graph.get(dep.storyId) ?? [];
    edges.push(dep.dependsOnStoryId);
    graph.set(dep.storyId, edges);
  }
  return graph;
}

/** Detecta si prerequisite puede alcanzar dependent siguiendo dependencias existentes. */
function canReach(
  fromId: string,
  toId: string,
  graph: Map<string, string[]>
): boolean {
  if (fromId === toId) return true;

  const visited = new Set<string>();
  const stack = [fromId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const next of graph.get(current) ?? []) {
      if (next === toId) return true;
      stack.push(next);
    }
  }

  return false;
}

export function wouldCreateCycle(
  accepted: StoryDependency[],
  candidate: StoryDependency
): boolean {
  const graph = buildAdjacency(accepted);
  return canReach(candidate.dependsOnStoryId, candidate.storyId, graph);
}

export function isInvalidDependency(
  dep: StoryDependency,
  dependent: LocalStoryForPlanning,
  prerequisite: LocalStoryForPlanning,
  options: SanitizeDependenciesOptions
): boolean {
  if (dep.storyId === dep.dependsOnStoryId) return true;

  if (
    violatesFrameworkPriorityOrder(
      dependent.priorityCategory,
      prerequisite.priorityCategory,
      options.framework
    )
  ) {
    return true;
  }

  if (!hasSemanticGrounding(dependent, prerequisite, dep.reason)) return true;

  if (options.sprints?.length) {
    const sprintIndex = buildSprintIndex(options.sprints);
    if (violatesSprintOrder(dep.storyId, dep.dependsOnStoryId, sprintIndex)) {
      return true;
    }
  }

  return false;
}

/**
 * Filtra dependencias inválidas usando reglas generales aplicables a cualquier backlog.
 */
export function sanitizeDependencies(
  dependencies: StoryDependency[],
  stories: LocalStoryForPlanning[],
  options: SanitizeDependenciesOptions
): StoryDependency[] {
  const storyMap = new Map(stories.map((story) => [story.id, story]));
  const accepted: StoryDependency[] = [];
  const seen = new Set<string>();

  for (const dep of dependencies) {
    const dependent = storyMap.get(dep.storyId);
    const prerequisite = storyMap.get(dep.dependsOnStoryId);
    if (!dependent || !prerequisite) continue;

    const key = `${dep.storyId}->${dep.dependsOnStoryId}`;
    if (seen.has(key)) continue;

    if (isInvalidDependency(dep, dependent, prerequisite, options)) continue;
    if (wouldCreateCycle(accepted, dep)) continue;

    seen.add(key);
    accepted.push(dep);
  }

  return accepted;
}
