/**
 * @fileoverview Tipos compartidos para el log de actividad del agente.
 * Eventos de wire (NDJSON) y entradas derivadas para la UI.
 */

// ---------------------------------------------------------------------------
// Wire events (NDJSON stream)
// ---------------------------------------------------------------------------

export type ActionStatus = 'pending' | 'running' | 'done' | 'error';

export type AgentStreamPhaseEvent = {
  type: 'phase';
  id: string;
  label: string;
  status: 'start' | 'end';
};

export type AgentStreamActionEvent = {
  type: 'action';
  id: string;
  label: string;
  status: ActionStatus;
};

export type AgentStreamThoughtEvent = {
  type: 'thought';
  text: string;
};

export type AgentStreamDoneEvent<T> = {
  type: 'done';
  payload: T;
};

export type AgentStreamErrorEvent = {
  type: 'error';
  error: string;
};

export type AgentStreamEvent<T = unknown> =
  | AgentStreamPhaseEvent
  | AgentStreamActionEvent
  | AgentStreamThoughtEvent
  | AgentStreamDoneEvent<T>
  | AgentStreamErrorEvent;

// ---------------------------------------------------------------------------
// UI entries (derived by reducer)
// ---------------------------------------------------------------------------

export type ThoughtBlockEntry = {
  kind: 'thought';
  id: string;
  text: string;
  startedAt: number;
  endedAt?: number;
};

export type ActionEntry = {
  kind: 'action';
  id: string;
  label: string;
  status: ActionStatus;
};

export type PhaseEntry = {
  kind: 'phase';
  id: string;
  label: string;
  status: 'active' | 'done';
};

export type AgentActivityEntry = ThoughtBlockEntry | ActionEntry | PhaseEntry;

export type AgentActivityState = {
  entries: AgentActivityEntry[];
};

export type AgentActivityAction =
  | AgentStreamEvent
  | { type: 'reset' };
