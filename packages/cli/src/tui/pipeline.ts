import type { ProjectSummary } from '../core/types';

export const PIPELINE_STAGES = [
  { step: 1, label: 'contexto', short: 'ctx' },
  { step: 2, label: 'backlog', short: 'back' },
  { step: 3, label: 'estimación', short: 'est' },
  { step: 4, label: 'prioridad', short: 'prio' },
  { step: 6, label: 'dashboard', short: 'dash' },
] as const;

const STAGE_ORDER = PIPELINE_STAGES.map((stage) => stage.step);

export function stageFromProject(project: ProjectSummary | undefined): number | null {
  if (!project) return null;
  if (typeof project.pipelineStep === 'number') {
    return project.pipelineStep === 5 ? 6 : project.pipelineStep;
  }
  const label = project.pipelineLabel.toLowerCase();
  if (/(dashboard|stack|tablero)/.test(label)) return 6;
  if (label.includes('prior')) return 4;
  if (label.includes('estim')) return 3;
  if (label.includes('backlog')) return 2;
  if (/(ingesta|contexto)/.test(label)) return 1;
  return 1;
}

export function stageIndex(step: number | null): number {
  if (step == null) return -1;
  const mapped = step === 5 ? 6 : step;
  return STAGE_ORDER.findIndex((value) => value === mapped);
}

export function dotsFilled(project: ProjectSummary): number {
  if (typeof project.completionPercentage === 'number') {
    return Math.min(5, Math.max(0, Math.round(project.completionPercentage / 20)));
  }
  const index = stageIndex(stageFromProject(project));
  return index < 0 ? 1 : index + 1;
}

export function formatRelativeDate(timestamp: number | undefined, now = Date.now()): string {
  if (!timestamp) return '';
  const diffMin = Math.floor((now - timestamp) / 60_000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d`;
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(new Date(timestamp));
}

export function formatPlanName(id: string | undefined): string {
  if (!id) return '';
  const names: Record<string, string> = { free: 'Free', starter: 'Starter', pro: 'Pro' };
  return names[id] ?? id;
}

export function maxProjectsOf(limits: { maxProjects?: number } | undefined): number | undefined {
  return typeof limits?.maxProjects === 'number' ? limits.maxProjects : undefined;
}
