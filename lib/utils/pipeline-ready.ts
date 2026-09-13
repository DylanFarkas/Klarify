/**
 * Un proyecto está listo para Klark, tablero y dashboard sin exigir el HITL web.
 *
 * En schema v4 el blob `workspace.pipeline.agent6Input` desaparece del doc raíz.
 * El CLI materializa el backlog canónico y marca `lastAgent: 'dashboard'`.
 */

export interface PipelineReadySnapshot {
  lastAgent?: string;
  pipelineStep?: number;
  workspace?: {
    pipeline?: {
      agent6Input?: unknown;
    };
  } | null;
  workspaceMeta?: {
    agent4?: { status?: string };
  };
}

export const DASHBOARD_PROGRESS = {
  lastAgent: 'dashboard',
  pipelineStep: 6,
  pipelineLabel: 'Dashboard',
  completionPercentage: 100,
} as const;

export function isProjectDashboardReady(data: PipelineReadySnapshot | undefined): boolean {
  if (!data) return false;
  if (data.workspace?.pipeline?.agent6Input) return true;
  if (data.lastAgent === 'dashboard') return true;
  return (data.pipelineStep ?? 0) >= 6;
}
