/**
 * Textos claros para mostrar dependencias entre historias en la UI.
 */

import type { StoryDependency } from '@/lib/types/agent-5';
import {
  FOUNDATIONAL_INFERENCE_PREFIX,
  GEMINI_SPRINT_PLANNING_PREFIX,
  MOCK_SPRINT_PLANNING_PREFIX,
} from '@/lib/constants/agent-5';

const AGENT_PREFIXES = [
  FOUNDATIONAL_INFERENCE_PREFIX,
  GEMINI_SPRINT_PLANNING_PREFIX,
  MOCK_SPRINT_PLANNING_PREFIX,
];

const TECHNICAL_REASON_PATTERNS = [
  /capacidad habilitante/i,
  /consume la/i,
  /historia dependiente/i,
  /prerequisito/i,
];

export function stripDependencyPrefix(reason: string): string {
  let text = reason.trim();
  for (const prefix of AGENT_PREFIXES) {
    if (text.startsWith(prefix)) {
      text = text.slice(prefix.length).trim();
    }
  }
  return text;
}

export function getPrerequisiteTitle(
  dep: StoryDependency,
  storyMap: Record<string, string>
): string {
  return storyMap[dep.dependsOnStoryId] ?? dep.dependsOnStoryId;
}

export function formatInferredDependencyReason(prerequisiteTitle: string): string {
  return `Requiere completar primero «${prerequisiteTitle}».`;
}

function formatDependencyCountTitle(count: number): string {
  if (count === 1) return 'Requiere 1 historia previa';
  return `Requiere ${count} historias previas`;
}

function formatPrerequisiteList(
  blockedBy: StoryDependency[],
  storyMap: Record<string, string>
): string {
  return blockedBy
    .map((dep) => `· «${getPrerequisiteTitle(dep, storyMap)}»`)
    .join('\n');
}

function isTechnicalReason(reason: string): boolean {
  const cleaned = stripDependencyPrefix(reason);
  if (!cleaned) return true;
  return TECHNICAL_REASON_PATTERNS.some((pattern) => pattern.test(cleaned));
}

function formatOptionalDetail(
  blockedBy: StoryDependency[],
  storyMap: Record<string, string>
): string | undefined {
  const simpleReasons = blockedBy
    .map((dep) => stripDependencyPrefix(dep.reason))
    .filter((reason) => reason && !isTechnicalReason(reason));

  if (simpleReasons.length === 0) {
    return blockedBy.length === 1
      ? 'Esta historia debe planificarse en un sprint posterior.'
      : 'Estas historias deben completarse en sprints anteriores.';
  }

  return simpleReasons.map((reason) => `· ${reason}`).join('\n');
}

export interface DependencyTooltipContent {
  title: string;
  description: string;
  detail?: string;
}

export function formatDependencyTooltip(
  dep: StoryDependency,
  storyMap: Record<string, string>
): DependencyTooltipContent {
  return formatDependencyListTooltip([dep], storyMap);
}

export function formatDependencyListTooltip(
  blockedBy: StoryDependency[],
  storyMap: Record<string, string>
): DependencyTooltipContent {
  return {
    title: formatDependencyCountTitle(blockedBy.length),
    description: formatPrerequisiteList(blockedBy, storyMap),
    detail: formatOptionalDetail(blockedBy, storyMap),
  };
}
