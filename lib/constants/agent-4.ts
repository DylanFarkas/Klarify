/**
 * @fileoverview Constantes del Agente 4 — Priorización multi-framework.
 */

import type {
  MoscowCategory,
  WsjfCategory,
  RiceCategory,
  ValueEffortCategory,
  PrioritizationFramework,
} from '@/lib/types/agent-4';

// ── Framework general ────────────────────────────────────────────────────────

export const DEFAULT_FRAMEWORK: PrioritizationFramework = 'moscow';

export const FRAMEWORK_DESCRIPTIONS: Record<PrioritizationFramework, { label: string; summary: string; details: string }> = {
  moscow: {
    label: 'MoSCoW',
    summary: 'Clasifica historias por nivel de importancia: Must, Should, Could, Won\'t.',
    details: 'Metodología simple que clasifica requisitos en 4 categorías de prioridad. Ideal para definir el alcance de un MVP y comunicar prioridades a stakeholders.',
  },
  wsjf: {
    label: 'WSJF',
    summary: 'Prioriza por costo de retraso dividido entre tamaño (Weighted Shortest Job First).',
    details: 'Mide el valor de negocio + costo de retraso, dividido por el tamaño de implementación. Cuanto mayor sea el WSJF, más urgente es implementar la historia.',
  },
  rice: {
    label: 'RICE',
    summary: 'Score = (Reach × Impact × Confidence) / Effort. Prioriza impacto rápido.',
    details: 'Cuatro factores: alcance (usuarios afectados), impacto (0.25-3×), confianza (0-100%) y esfuerzo (person-mes). Optimiza para máximo impacto con mínimo esfuerzo.',
  },
  'value-effort': {
    label: 'Valor / Esfuerzo',
    summary: 'Matriz 2×2 que posiciona historias por valor de negocio vs esfuerzo técnico.',
    details: 'Quick Wins (alto valor, bajo esfuerzo) se priorizan. Major Projects (alto/alto) se planifican. Fill-in y Thankless se evalúan caso por caso.',
  },
};

// ── MoSCoW ───────────────────────────────────────────────────────────────────

export const MOSCOW_CATEGORIES: MoscowCategory[] = ['must', 'should', 'could', 'wont'];

export const MOSCOW_LABELS: Record<MoscowCategory, string> = {
  must: 'Must Have',
  should: 'Should Have',
  could: 'Could Have',
  wont: "Won't Have (this time)",
};

export const MOSCOW_SHORT_LABELS: Record<MoscowCategory, string> = {
  must: 'Must',
  should: 'Should',
  could: 'Could',
  wont: "Won't",
};

export const MOSCOW_COLORS: Record<MoscowCategory, string> = {
  must: 'bg-red-500/15 text-red-700 border-red-500/35',
  should: 'bg-amber-500/15 text-amber-700 border-amber-500/35',
  could: 'bg-blue-500/15 text-blue-700 border-blue-500/35',
  wont: 'bg-surface-muted text-muted border-border',
};

// ── WSJF ─────────────────────────────────────────────────────────────────────

export const WSJF_CATEGORIES: WsjfCategory[] = ['critical', 'high', 'medium', 'low'];

export const WSJF_LABELS: Record<WsjfCategory, string> = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Medio',
  low: 'Bajo',
};

export const WSJF_SHORT_LABELS: Record<WsjfCategory, string> = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Medio',
  low: 'Bajo',
};

export const WSJF_COLORS: Record<WsjfCategory, string> = {
  critical: 'bg-red-500/15 text-red-700 border-red-500/35',
  high: 'bg-orange-500/15 text-orange-700 border-orange-500/35',
  medium: 'bg-amber-500/15 text-amber-700 border-amber-500/35',
  low: 'bg-surface-muted text-muted border-border',
};

// ── RICE ─────────────────────────────────────────────────────────────────────

export const RICE_CATEGORIES: RiceCategory[] = ['quick-win', 'major-project', 'fill-in', 'thankless'];

export const RICE_LABELS: Record<RiceCategory, string> = {
  'quick-win': 'Quick Win',
  'major-project': 'Major Project',
  'fill-in': 'Fill-in',
  'thankless': 'Thankless',
};

export const RICE_SHORT_LABELS: Record<RiceCategory, string> = {
  'quick-win': 'Quick Win',
  'major-project': 'Major',
  'fill-in': 'Fill-in',
  'thankless': 'Thankless',
};

export const RICE_COLORS: Record<RiceCategory, string> = {
  'quick-win': 'bg-emerald-500/15 text-emerald-700 border-emerald-500/35',
  'major-project': 'bg-blue-500/15 text-blue-700 border-blue-500/35',
  'fill-in': 'bg-amber-500/15 text-amber-700 border-amber-500/35',
  'thankless': 'bg-surface-muted text-muted border-border',
};

// ── Value / Effort ───────────────────────────────────────────────────────────

export const VALUE_EFFORT_CATEGORIES: ValueEffortCategory[] = [
  'high-value-low-effort',
  'high-value-high-effort',
  'low-value-low-effort',
  'low-value-high-effort',
];

export const VALUE_EFFORT_LABELS: Record<ValueEffortCategory, string> = {
  'high-value-low-effort': 'Quick Win (Alto valor, bajo esfuerzo)',
  'high-value-high-effort': 'Major Project (Alto valor, alto esfuerzo)',
  'low-value-low-effort': 'Fill-in (Bajo valor, bajo esfuerzo)',
  'low-value-high-effort': 'Thankless (Bajo valor, alto esfuerzo)',
};

export const VALUE_EFFORT_SHORT_LABELS: Record<ValueEffortCategory, string> = {
  'high-value-low-effort': 'Quick Win',
  'high-value-high-effort': 'Major Project',
  'low-value-low-effort': 'Fill-in',
  'low-value-high-effort': 'Thankless',
};

export const VALUE_EFFORT_COLORS: Record<ValueEffortCategory, string> = {
  'high-value-low-effort': 'bg-emerald-500/15 text-emerald-700 border-emerald-500/35',
  'high-value-high-effort': 'bg-blue-500/15 text-blue-700 border-blue-500/35',
  'low-value-low-effort': 'bg-amber-500/15 text-amber-700 border-amber-500/35',
  'low-value-high-effort': 'bg-surface-muted text-muted border-border',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getFrameworkCategories(framework: PrioritizationFramework): string[] {
  switch (framework) {
    case 'moscow': return MOSCOW_CATEGORIES;
    case 'wsjf': return WSJF_CATEGORIES;
    case 'rice': return RICE_CATEGORIES;
    case 'value-effort': return VALUE_EFFORT_CATEGORIES;
  }
}

export function getFrameworkLabels(framework: PrioritizationFramework): Record<string, string> {
  switch (framework) {
    case 'moscow': return MOSCOW_LABELS;
    case 'wsjf': return WSJF_LABELS;
    case 'rice': return RICE_LABELS;
    case 'value-effort': return VALUE_EFFORT_LABELS;
  }
}

export function getFrameworkShortLabels(framework: PrioritizationFramework): Record<string, string> {
  switch (framework) {
    case 'moscow': return MOSCOW_SHORT_LABELS;
    case 'wsjf': return WSJF_SHORT_LABELS;
    case 'rice': return RICE_SHORT_LABELS;
    case 'value-effort': return VALUE_EFFORT_SHORT_LABELS;
  }
}

export function getFrameworkColors(framework: PrioritizationFramework): Record<string, string> {
  switch (framework) {
    case 'moscow': return MOSCOW_COLORS;
    case 'wsjf': return WSJF_COLORS;
    case 'rice': return RICE_COLORS;
    case 'value-effort': return VALUE_EFFORT_COLORS;
  }
}

// ── Generales ────────────────────────────────────────────────────────────────

export const MAX_PRIORITIZATION_JUSTIFICATION_LENGTH = 140;

export const MOCK_PRIORITIZATION_PREFIX = 'Agente 4 (Mock Product Owner):';
export const GEMINI_PRIORITIZATION_PREFIX = 'Agente 4 (Product Owner):';

/** Delay total de simulación mock (ms) */
export const PRIORITIZATION_DELAY_MS = 2500;
