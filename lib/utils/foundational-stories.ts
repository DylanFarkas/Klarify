/**
 * Detección de historias habilitantes (capacidades transversales) y
 * inferencia de dependencias para planificación temprana en sprints.
 */

import type { LocalStoryForPlanning, PlannedSprint, StoryDependency } from '@/lib/types/agent-5';
import type { PrioritizationFramework } from '@/lib/types/agent-4';
import { getPriorityRank } from '@/lib/utils/priority-rank';
import {
  containsKeyword,
  hasSemanticGrounding,
  sanitizeDependencies,
} from '@/lib/utils/story-dependencies';
import { formatInferredDependencyReason } from '@/lib/utils/dependency-display';

/** Señales de que una historia CREA o GESTIONA una capacidad transversal del producto. */
const ENABLING_SIGNALS: Array<{ terms: string[]; weight: number }> = [
  { terms: ['autenticacion', 'autenticar', 'login', 'logout', 'sesion', 'oauth', 'jwt'], weight: 3 },
  { terms: ['rol', 'roles', 'permiso', 'permisos', 'autorizacion', 'rbac', 'acceso'], weight: 2 },
  { terms: ['usuario', 'usuarios', 'identidad', 'cuenta', 'cuentas'], weight: 1 },
  { terms: ['registro', 'signup', 'signin', 'onboarding'], weight: 2 },
  { terms: ['infraestructura', 'plataforma', 'arquitectura'], weight: 2 },
  { terms: ['configuracion inicial', 'setup', 'scaffold', 'bootstrap', 'inicializacion'], weight: 3 },
  { terms: ['base de datos', 'modelo de datos', 'esquema', 'migracion', 'persistencia'], weight: 2 },
  { terms: ['api base', 'servicio base', 'nucleo', 'core'], weight: 2 },
  { terms: ['seguridad', 'cifrado', 'encriptacion'], weight: 2 },
];

const MANAGEMENT_VERBS = [
  'gestion',
  'administracion',
  'administrar',
  'manejo',
  'gestionar',
  'control de',
  'modulo de',
  'sistema de',
];

const FOUNDATIONAL_NOUNS = [
  'usuario',
  'usuarios',
  'rol',
  'roles',
  'permiso',
  'permisos',
  'acceso',
  'identidad',
  'autenticacion',
  'autorizacion',
];

/** Puntuación mínima para considerar una historia como habilitante. */
const ENABLING_SCORE_THRESHOLD = 3;

function storyText(story: LocalStoryForPlanning): string {
  return `${story.title} ${story.description}`;
}

/**
 * Puntuación de cuánto una historia representa una capacidad habilitante transversal.
 * Mayor puntuación = debe planificarse más temprano.
 */
export function scoreEnablingCapability(story: LocalStoryForPlanning): number {
  const text = storyText(story);
  let score = 0;

  for (const signal of ENABLING_SIGNALS) {
    if (signal.terms.some((term) => containsKeyword(text, term))) {
      score += signal.weight;
    }
  }

  const hasManagementVerb = MANAGEMENT_VERBS.some((verb) => containsKeyword(text, verb));
  const hasFoundationalNoun = FOUNDATIONAL_NOUNS.some((noun) => containsKeyword(text, noun));
  if (hasManagementVerb && hasFoundationalNoun) {
    score += 3;
  }

  return score;
}

export function isEnablingStory(story: LocalStoryForPlanning): boolean {
  return scoreEnablingCapability(story) >= ENABLING_SCORE_THRESHOLD;
}

/**
 * Orden de planificación: prioridad del framework, luego capacidad habilitante, luego SP.
 */
export function compareStoriesForSprintOrder(
  a: LocalStoryForPlanning,
  b: LocalStoryForPlanning,
  framework: PrioritizationFramework
): number {
  const pa = getPriorityRank(framework, a.priorityCategory);
  const pb = getPriorityRank(framework, b.priorityCategory);
  if (pa !== pb) return pa - pb;

  const ea = scoreEnablingCapability(a);
  const eb = scoreEnablingCapability(b);
  if (ea !== eb) return eb - ea;

  return a.points - b.points;
}

/**
 * Infiere dependencias donde historias consumidoras dependen de historias habilitantes.
 * Aplica reglas semánticas y de prioridad del framework.
 */
export function inferEnablingDependencies(
  stories: LocalStoryForPlanning[],
  framework: PrioritizationFramework
): StoryDependency[] {
  const enablers = stories.filter(isEnablingStory);
  if (enablers.length === 0) return [];

  const candidates: StoryDependency[] = [];

  for (const consumer of stories) {
    if (isEnablingStory(consumer)) continue;

    for (const enabler of enablers) {
      if (consumer.id === enabler.id) continue;

      if (!hasSemanticGrounding(consumer, enabler)) continue;

      candidates.push({
        storyId: consumer.id,
        dependsOnStoryId: enabler.id,
        reason: formatInferredDependencyReason(enabler.title),
      });
    }
  }

  return sanitizeDependencies(candidates, stories, { framework });
}

/**
 * Combina dependencias del LLM con las inferidas y las sanitiza.
 */
export function mergeAndSanitizeDependencies(
  llmDependencies: StoryDependency[],
  stories: LocalStoryForPlanning[],
  framework: PrioritizationFramework,
  sprints?: PlannedSprint[]
): StoryDependency[] {
  const inferred = inferEnablingDependencies(stories, framework);
  return sanitizeDependencies([...llmDependencies, ...inferred], stories, {
    framework,
    sprints,
  });
}
