/**
 * @fileoverview Agrupa entradas del log en fases con una línea de tiempo ordenada
 * (acciones + razonamiento intercalado).
 */

import type {
  ActionEntry,
  AgentActivityEntry,
  PhaseEntry,
  ThoughtBlockEntry,
} from '@/lib/types/agent-activity';

export type TimelineItem =
  | { type: 'action'; entry: ActionEntry }
  | { type: 'thought'; entry: ThoughtBlockEntry };

export type ActivityPhaseGroup = {
  phase: PhaseEntry;
  timeline: TimelineItem[];
};

function buildTimeline(entries: AgentActivityEntry[]): TimelineItem[] {
  const timeline: TimelineItem[] = [];

  for (const entry of entries) {
    if (entry.kind === 'action') {
      timeline.push({ type: 'action', entry });
    } else if (entry.kind === 'thought') {
      timeline.push({ type: 'thought', entry });
    }
  }

  return timeline;
}

/** Agrupa entradas planas en fases con línea de tiempo cronológica. */
export function groupAgentActivityEntries(entries: AgentActivityEntry[]): ActivityPhaseGroup[] {
  const groups: ActivityPhaseGroup[] = [];
  let currentPhase: PhaseEntry | undefined;
  let phaseEntries: AgentActivityEntry[] = [];

  const flushPhase = () => {
    if (!currentPhase) return;
    groups.push({
      phase: currentPhase,
      timeline: buildTimeline(phaseEntries),
    });
    phaseEntries = [];
  };

  for (const entry of entries) {
    if (entry.kind === 'phase') {
      flushPhase();
      currentPhase = entry;
      continue;
    }
    if (currentPhase) {
      phaseEntries.push(entry);
    }
  }

  flushPhase();
  return groups;
}

export function countPhaseActions(timeline: TimelineItem[]): {
  done: number;
  total: number;
  running: ActionEntry | undefined;
} {
  const actions = timeline
    .filter((item): item is { type: 'action'; entry: ActionEntry } => item.type === 'action')
    .map((item) => item.entry);

  return {
    done: actions.filter((a) => a.status === 'done').length,
    total: actions.length,
    running: actions.find((a) => a.status === 'running'),
  };
}
