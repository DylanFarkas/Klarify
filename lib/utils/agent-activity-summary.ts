/**
 * @fileoverview Resumen derivado del log de actividad para progreso y cabecera del modal.
 */

import type { AgentActivityEntry } from '@/lib/types/agent-activity';

export interface AgentActivitySummary {
  activePhaseLabel: string | null;
  runningActionLabel: string | null;
  doneActions: number;
  totalActions: number;
  progressPercent: number;
  hasThoughts: boolean;
}

export function summarizeAgentActivity(entries: AgentActivityEntry[]): AgentActivitySummary {
  const phases = entries.filter((e) => e.kind === 'phase');
  const actions = entries.filter((e) => e.kind === 'action');
  const thoughts = entries.filter((e) => e.kind === 'thought');

  const activePhase = phases.find((p) => p.status === 'active');
  const runningAction = actions.find((a) => a.status === 'running');
  const doneActions = actions.filter((a) => a.status === 'done').length;
  const totalActions = actions.length;

  const progressPercent =
    totalActions === 0 ? 8 : Math.min(100, Math.round((doneActions / totalActions) * 100));

  return {
    activePhaseLabel: activePhase?.label ?? phases.at(-1)?.label ?? null,
    runningActionLabel: runningAction?.label ?? null,
    doneActions,
    totalActions,
    progressPercent,
    hasThoughts: thoughts.some((t) => t.text.trim().length > 0),
  };
}
