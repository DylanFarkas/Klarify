/**
 * @fileoverview Normalización y validación de categorías de prioridad del harness.
 */

import {
  DEFAULT_FRAMEWORK,
  FRAMEWORK_DESCRIPTIONS,
  getFrameworkCategories,
  getFrameworkLabels,
} from '@/lib/constants/agent-4';
import type { FrameworkCategory, PrioritizationFramework } from '@/lib/types/agent-4';
import type { UserWorkspace } from '@/lib/types/workspace';

const CATEGORY_ALIASES: Record<string, FrameworkCategory> = {
  must: 'must',
  'must-have': 'must',
  musthave: 'must',
  'must have': 'must',
  should: 'should',
  'should-have': 'should',
  shouldhave: 'should',
  'should have': 'should',
  could: 'could',
  'could-have': 'could',
  couldhave: 'could',
  'could have': 'could',
  wont: 'wont',
  "won't": 'wont',
  'wont-have': 'wont',
  "won't-have": 'wont',
  wonthave: 'wont',
  'wont have': 'wont',
  "won't have": 'wont',
  "won't have (this time)": 'wont',
  critical: 'critical',
  critico: 'critical',
  crítico: 'critical',
  high: 'high',
  alto: 'high',
  medium: 'medium',
  medio: 'medium',
  low: 'low',
  bajo: 'low',
  'quick-win': 'quick-win',
  quickwin: 'quick-win',
  'quick win': 'quick-win',
  'major-project': 'major-project',
  majorproject: 'major-project',
  'major project': 'major-project',
  'fill-in': 'fill-in',
  fillin: 'fill-in',
  thankless: 'thankless',
  'high-value-low-effort': 'high-value-low-effort',
  'high-value-high-effort': 'high-value-high-effort',
  'low-value-low-effort': 'low-value-low-effort',
  'low-value-high-effort': 'low-value-high-effort',
};

export function resolveWorkspaceFramework(workspace: UserWorkspace): PrioritizationFramework {
  return (
    workspace.pipeline.agent6Input?.framework ??
    workspace.agent5.input?.framework ??
    workspace.agent4.framework ??
    DEFAULT_FRAMEWORK
  );
}

export function normalizePriorityCategory(
  raw: string,
  framework: PrioritizationFramework
): FrameworkCategory | null {
  const key = raw.trim().toLowerCase().replace(/_/g, '-');
  const normalized = CATEGORY_ALIASES[key] ?? (key as FrameworkCategory);
  const allowed = getFrameworkCategories(framework);
  return allowed.includes(normalized) ? normalized : null;
}

export function describeFrameworkCategories(framework: PrioritizationFramework): {
  framework: PrioritizationFramework;
  frameworkLabel: string;
  allowedCategories: string[];
  categoryLabels: Record<string, string>;
} {
  const labels = getFrameworkLabels(framework);
  return {
    framework,
    frameworkLabel: FRAMEWORK_DESCRIPTIONS[framework].label,
    allowedCategories: getFrameworkCategories(framework),
    categoryLabels: labels,
  };
}

export function buildPriorityToolHint(framework: PrioritizationFramework): string {
  const { frameworkLabel, allowedCategories, categoryLabels } =
    describeFrameworkCategories(framework);
  const pairs = allowedCategories
    .map((code) => `${code} (${categoryLabels[code] ?? code})`)
    .join(', ');
  return `Framework activo: ${frameworkLabel}. Usa SOLO estos códigos canónicos en category: ${pairs}.`;
}
