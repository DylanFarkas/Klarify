/**
 * @fileoverview Mock data para el Agente 4 — Priorización multi-framework.
 *
 * Simula la salida del Product Owner IA con heurísticas basadas en
 * el framework seleccionado.
 */

import type {
  LocalEpicWithEstimation,
  Agent4SuggestionItem,
  PrioritizationFramework,
  FrameworkCategory,
} from '@/lib/types/agent-4';
import { MOCK_PRIORITIZATION_PREFIX } from '@/lib/constants/agent-4';

/** Pensamientos simulados emitidos durante la priorización mock */
export const MOCK_PRIORITIZATION_THOUGHTS = [
  'Analizando valor de negocio vs esfuerzo estimado en Story Points...',
  'Identificando dependencias críticas y funcionalidades bloqueantes...',
  'Clasificando historias según el framework seleccionado...',
];

function classifyByMoscow(points: number, titleLower: string): FrameworkCategory {
  if (titleLower.includes('iniciar sesión') || titleLower.includes('autenticación')) {
    return points >= 13 ? 'could' : 'must';
  }
  if (points >= 13) return 'could';
  if (points >= 8) return 'must';
  if (points <= 3) return 'could';
  return 'should';
}

function classifyByWsjf(points: number, titleLower: string): FrameworkCategory {
  if (titleLower.includes('iniciar sesión') || titleLower.includes('autenticación')) return 'critical';
  if (points >= 13) return 'low';
  if (points >= 8) return 'high';
  if (points <= 3) return 'medium';
  return 'critical';
}

function classifyByRice(points: number, titleLower: string): FrameworkCategory {
  if (titleLower.includes('iniciar sesión') || titleLower.includes('autenticación')) return 'major-project';
  if (points >= 13) return 'thankless';
  if (points >= 8) return 'quick-win';
  if (points <= 3) return 'fill-in';
  return 'quick-win';
}

function classifyByValueEffort(points: number, titleLower: string): FrameworkCategory {
  if (titleLower.includes('iniciar sesión') || titleLower.includes('autenticación')) return 'high-value-high-effort';
  if (points >= 13) return 'low-value-high-effort';
  if (points >= 8) return 'high-value-low-effort';
  if (points <= 3) return 'low-value-low-effort';
  return 'high-value-low-effort';
}

const classifyByFramework: Record<PrioritizationFramework, (points: number, titleLower: string) => FrameworkCategory> = {
  moscow: classifyByMoscow,
  wsjf: classifyByWsjf,
  rice: classifyByRice,
  'value-effort': classifyByValueEffort,
};

const justificationByCategory: Record<string, string> = {
  must: 'Requisito crítico para el MVP; sin esto el producto no es usable.',
  should: 'Funcionalidad valiosa pero no bloqueante para el primer release.',
  could: 'Bajo esfuerzo y valor incremental; candidata a implementar si hay capacidad.',
  wont: 'Alto esfuerzo con valor limitado para el MVP; posponer.',
  critical: 'Alto impacto y urgencia; prioridad máxima.',
  high: 'Buen balance entre valor y esfuerzo; importante para el roadmap.',
  medium: 'Valor moderado o esfuerzo significativo; evaluar según capacidad.',
  low: 'Bajo prioridad; solo si sobra capacidad.',
  'quick-win': 'Alto valor con bajo esfuerzo; implementar primero.',
  'major-project': 'Alto valor pero alto esfuerzo; planificar cuidadosamente.',
  'fill-in': 'Bajo esfuerzo pero impacto limitado; hacer si hay tiempo libre.',
  'thankless': 'Bajo valor y alto esfuerzo; considerar no hacer.',
  'high-value-low-effort': 'Quick Win: alto valor, bajo esfuerzo. PRIORIZAR.',
  'high-value-high-effort': 'Major Project: alto valor, alto esfuerzo. PLANIFICAR.',
  'low-value-low-effort': 'Fill-in: bajo valor, bajo esfuerzo. SI HAY TIEMPO.',
  'low-value-high-effort': 'Thankless: bajo valor, alto esfuerzo. EVITAR.',
};

/**
 * Genera priorizaciones mock a partir del backlog estimado usando heurísticas simples.
 */
export function mockPrioritizeStories(
  epics: LocalEpicWithEstimation[],
  framework: PrioritizationFramework = 'moscow'
): Agent4SuggestionItem[] {
  const classify = classifyByFramework[framework];

  return epics.flatMap((epic) =>
    (epic.userStories ?? []).map((story) => {
      const titleLower = story.title.toLowerCase();
      const category = classify(story.points, titleLower);
      const justification = justificationByCategory[category] ?? 'Clasificación automática.';

      return {
        storyId: story.id,
        suggestedCategory: category,
        justification: `${MOCK_PRIORITIZATION_PREFIX} ${justification}`,
      };
    })
  );
}
