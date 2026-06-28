/**
 * @fileoverview Reducer puro para construir el log de actividad del agente.
 */

import { LLM_STREAM_ACTION_IDS } from '@/lib/constants/agent-activity';
import type {
  AgentActivityAction,
  AgentActivityEntry,
  AgentActivityState,
  AgentStreamActionEvent,
  AgentStreamPhaseEvent,
  AgentStreamThoughtEvent,
  ThoughtBlockEntry,
} from '@/lib/types/agent-activity';

export const INITIAL_AGENT_ACTIVITY_STATE: AgentActivityState = {
  entries: [],
};

let thoughtBlockCounter = 0;

function nextThoughtId(): string {
  thoughtBlockCounter += 1;
  return `thought-${thoughtBlockCounter}`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.max(1, Math.round(ms))}ms`;
  }
  const seconds = ms / 1000;
  return seconds < 10 ? `${seconds.toFixed(1)}s` : `${Math.round(seconds)}s`;
}

function findOpenThoughtBlock(entries: AgentActivityEntry[]): ThoughtBlockEntry | undefined {
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.kind === 'thought' && entry.endedAt === undefined) {
      return entry;
    }
  }
  return undefined;
}

function closeOpenThoughtBlock(
  entries: AgentActivityEntry[],
  endedAt: number
): AgentActivityEntry[] {
  const openBlock = findOpenThoughtBlock(entries);
  if (!openBlock) return entries;

  return entries.map((entry) =>
    entry.kind === 'thought' && entry.id === openBlock.id
      ? { ...entry, endedAt }
      : entry
  );
}

function handlePhase(state: AgentActivityState, event: AgentStreamPhaseEvent): AgentActivityState {
  const now = Date.now();
  let entries = closeOpenThoughtBlock(state.entries, now);

  if (event.status === 'start') {
    const phaseEntry: AgentActivityEntry = {
      kind: 'phase',
      id: event.id,
      label: event.label,
      status: 'active',
    };
    return { entries: [...entries, phaseEntry] };
  }

  entries = entries.map((entry) =>
    entry.kind === 'phase' && entry.id === event.id
      ? { ...entry, status: 'done' as const }
      : entry
  );

  return { entries };
}

function openThoughtPlaceholder(entries: AgentActivityEntry[]): AgentActivityEntry[] {
  if (findOpenThoughtBlock(entries)) return entries;

  const placeholder: ThoughtBlockEntry = {
    kind: 'thought',
    id: nextThoughtId(),
    text: '',
    startedAt: Date.now(),
  };

  return [...entries, placeholder];
}

function handleAction(state: AgentActivityState, event: AgentStreamActionEvent): AgentActivityState {
  const existingIndex = state.entries.findIndex(
    (entry) => entry.kind === 'action' && entry.id === event.id
  );

  const actionEntry: AgentActivityEntry = {
    kind: 'action',
    id: event.id,
    label: event.label,
    status: event.status,
  };

  let entries = state.entries;

  if (existingIndex >= 0) {
    entries = [...entries];
    entries[existingIndex] = actionEntry;
  } else if (event.status === 'running' && LLM_STREAM_ACTION_IDS.has(event.id)) {
    entries = openThoughtPlaceholder(entries);
    entries = [...entries, actionEntry];
  } else {
    entries = [...entries, actionEntry];
  }

  if (event.status === 'done' && LLM_STREAM_ACTION_IDS.has(event.id)) {
    entries = closeOpenThoughtBlock(entries, Date.now());
  }

  return { entries };
}

function handleThought(state: AgentActivityState, event: AgentStreamThoughtEvent): AgentActivityState {
  const openBlock = findOpenThoughtBlock(state.entries);

  if (openBlock) {
    return {
      entries: state.entries.map((entry) =>
        entry.kind === 'thought' && entry.id === openBlock.id
          ? { ...entry, text: entry.text + event.text }
          : entry
      ),
    };
  }

  const newBlock: ThoughtBlockEntry = {
    kind: 'thought',
    id: nextThoughtId(),
    text: event.text,
    startedAt: Date.now(),
  };

  return { entries: [...state.entries, newBlock] };
}

export function reduceAgentActivity(
  state: AgentActivityState,
  action: AgentActivityAction
): AgentActivityState {
  if (action.type === 'reset') {
    thoughtBlockCounter = 0;
    return INITIAL_AGENT_ACTIVITY_STATE;
  }

  const event = action;

  switch (event.type) {
    case 'phase':
      return handlePhase(state, event);
    case 'action':
      return handleAction(state, event);
    case 'thought':
      return handleThought(state, event);
    case 'done':
    case 'error':
      return {
        entries: closeOpenThoughtBlock(state.entries, Date.now()),
      };
    default:
      return state;
  }
}

export const RESET_AGENT_ACTIVITY_ACTION = { type: 'reset' } as const;

/** Concatena el texto de todos los bloques de pensamiento del log. */
export function collectThoughtText(entries: AgentActivityEntry[]): string {
  return entries
    .filter((entry): entry is ThoughtBlockEntry => entry.kind === 'thought')
    .map((entry) => entry.text.trim())
    .filter(Boolean)
    .join('\n\n');
}
