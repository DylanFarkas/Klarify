/**
 * @fileoverview Tipos del harness de edición de backlog.
 */

export type HarnessRole = 'user' | 'assistant';

export interface HarnessChatMessage {
  id: string;
  role: HarnessRole;
  content: string;
  createdAt: number;
}

export interface HarnessConfirmedAction {
  name: string;
  args: Record<string, unknown>;
}

/** Estado semántico de una tool — no usar solo ok:true para confirmaciones. */
export type HarnessToolStatus = 'success' | 'error' | 'pending_confirmation';

export interface HarnessToolResult {
  ok: boolean;
  status: HarnessToolStatus;
  summary: string;
  data?: unknown;
  mutated?: boolean;
  needsConfirmation?: boolean;
  confirmationLabel?: string;
  error?: string;
}

export type HarnessStreamEvent =
  | { type: 'thought'; text: string; delta?: boolean }
  | { type: 'tool_start'; name: string; args: Record<string, unknown> }
  | {
      type: 'tool_end';
      name: string;
      summary: string;
      mutated: boolean;
      ok: boolean;
    }
  | {
      type: 'confirm';
      name: string;
      args: Record<string, unknown>;
      label: string;
    }
  | { type: 'message'; role: 'assistant'; text: string }
  | { type: 'workspace_updated' }
  | {
      type: 'done';
      payload: {
        messages: HarnessChatMessage[];
        remaining: number | null;
      };
    }
  | { type: 'error'; error: string };

export const HARNESS_HISTORY_LIMIT = 20;
export const HARNESS_MAX_TOOL_ITERATIONS = 6;

/** Errores que el runtime muestra al usuario sin dejar que el modelo los reescriba. */
export const HARNESS_TERMINAL_TOOL_ERRORS = new Set([
  'STORY_NOT_FOUND',
  'EPIC_NOT_FOUND',
  'SPRINT_NOT_FOUND',
  'SPRINT_NOT_EMPTY',
  'SPRINT_CLOSED',
  'NEEDS_CONFIRMATION',
]);
