/**
 * @fileoverview Progreso del pipeline para metadatos de proyecto.
 */

import type { UserWorkspace } from '@/lib/types/workspace';

/** Pipeline activo: Agente 5 (planificación IA) está desactivado; tras priorizar → dashboard. */
const PIPELINE_STEPS = [
  { step: 1, label: 'Ingesta de contexto', check: (ws: UserWorkspace) => ws.agent1.status === 'approved' },
  { step: 2, label: 'Backlog inicial', check: (ws: UserWorkspace) => ws.agent2.status === 'approved' },
  { step: 3, label: 'Estimación', check: (ws: UserWorkspace) => ws.agent3.status === 'approved' },
  { step: 4, label: 'Priorización', check: (ws: UserWorkspace) => ws.agent4.status === 'approved' },
  { step: 6, label: 'Dashboard', check: (ws: UserWorkspace) => Boolean(ws.pipeline.agent6Input) },
] as const;

export function computePipelineProgress(workspace: UserWorkspace): {
  pipelineStep: number;
  pipelineLabel: string;
  completionPercentage: number;
} {
  let lastActive = 1;
  let completed = 0;

  for (const entry of PIPELINE_STEPS) {
    if (entry.check(workspace)) {
      completed += 1;
      lastActive = entry.step;
    } else if (hasStarted(workspace, entry.step)) {
      lastActive = entry.step;
      break;
    } else {
      break;
    }
  }

  const current = PIPELINE_STEPS.find((s) => s.step === lastActive) ?? PIPELINE_STEPS[0];
  const percentage = Math.round((completed / PIPELINE_STEPS.length) * 100);

  return {
    pipelineStep: current.step,
    pipelineLabel: current.label,
    completionPercentage: percentage,
  };
}

const PIPELINE_ENTRY_PATHS: Record<number, string> = {
  1: '/agentes/1',
  2: '/agentes/2',
  3: '/agentes/3',
  4: '/agentes/4',
  5: '/agentes/dashboard',
  6: '/agentes/dashboard',
};

/** Ruta de entrada al abrir un proyecto según progreso real y última visita. */
export function getProjectEntryPath(project: {
  pipelineStep: number;
  lastAgent: string;
}): string {
  if (project.lastAgent === 'dashboard') {
    return '/agentes/dashboard';
  }

  if (project.pipelineStep >= 6 || project.lastAgent === '5') {
    return '/agentes/dashboard';
  }

  const lastStep = Number(project.lastAgent);
  if (lastStep >= 1 && lastStep <= 5) {
    const targetStep = Math.max(lastStep, project.pipelineStep);
    return PIPELINE_ENTRY_PATHS[targetStep] ?? '/agentes/1';
  }

  return PIPELINE_ENTRY_PATHS[project.pipelineStep] ?? '/agentes/1';
}

function hasStarted(workspace: UserWorkspace, step: number): boolean {
  switch (step) {
    case 1:
      return workspace.agent1.status !== 'idle' || workspace.agent1.wishes.length > 0;
    case 2:
      return workspace.agent2.status !== 'idle' || workspace.agent2.epics.length > 0;
    case 3:
      return workspace.agent3.status !== 'idle' || Object.keys(workspace.agent3.estimations).length > 0;
    case 4:
      return workspace.agent4.status !== 'idle' || Object.keys(workspace.agent4.priorities).length > 0;
    case 6:
      return Boolean(workspace.pipeline.agent6Input);
    default:
      return false;
  }
}
