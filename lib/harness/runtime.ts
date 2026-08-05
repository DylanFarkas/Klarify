/**
 * @fileoverview Runtime del harness: loop multi-proveedor + tools (Klark).
 */

import { buildHarnessSystemPrompt, identityFromCredentials } from '@/lib/harness/prompt';
import {
  createHarnessMessage,
  getHarnessHistory,
  saveHarnessHistory,
} from '@/lib/harness/history';
import {
  buildBacklogIndex,
  executeHarnessTool,
  formatToolOutcome,
  HARNESS_TOOL_DECLARATIONS,
  isPendingConfirmation,
} from '@/lib/harness/tools';
import { resolveWorkspaceFramework } from '@/lib/harness/priority';
import {
  HARNESS_MAX_TOOL_ITERATIONS,
  HARNESS_TERMINAL_TOOL_ERRORS,
  type HarnessChatMessage,
  type HarnessConfirmedAction,
  type HarnessStreamEvent,
  type HarnessToolResult,
} from '@/lib/harness/types';
import { checkAndIncrementHarnessMessage } from '@/lib/plans/plan-service';
import { isPlanLimitError } from '@/lib/plans/plan-errors';
import { getWorkspaceData } from '@/lib/workspace-service';
import { resolveLlmCredentials } from '@/lib/llm/resolve';
import { runToolLoop } from '@/lib/llm/tool-loop';
import type { LlmCredentials } from '@/lib/llm/types';

export type HarnessEventCallback = (event: HarnessStreamEvent) => void;

export interface RunHarnessTurnInput {
  uid: string;
  message: string;
  confirmedAction?: HarnessConfirmedAction;
}

export interface RunHarnessTurnResult {
  messages: HarnessChatMessage[];
  remaining: number | null;
}

function confirmationMessage(result: HarnessToolResult): string {
  const label = result.confirmationLabel ?? result.summary;
  return `${label} Confirma en el panel o escribe «sí».`;
}

function isTerminalToolFailure(result: HarnessToolResult): boolean {
  if (result.status === 'pending_confirmation' || result.needsConfirmation) {
    return false;
  }
  if (result.status === 'error') {
    return Boolean(result.error && HARNESS_TERMINAL_TOOL_ERRORS.has(result.error));
  }
  return false;
}

function toolEndOk(result: HarnessToolResult): boolean {
  return result.status === 'success' || result.status === 'pending_confirmation';
}

function toolResultToPayload(result: HarnessToolResult): Record<string, unknown> {
  return {
    ok: result.ok,
    status: result.status,
    summary: result.summary,
    data: result.data ?? null,
    needsConfirmation: result.needsConfirmation ?? false,
    mutated: Boolean(result.mutated),
    error: result.error ?? null,
    confirmationLabel: result.confirmationLabel ?? null,
  };
}

async function runProviderHarnessTurn(
  input: RunHarnessTurnInput,
  credentials: LlmCredentials,
  onEvent: HarnessEventCallback
): Promise<RunHarnessTurnResult> {
  const {
    projectId,
    messages: history,
    toolOutcomes: previousOutcomes,
  } = await getHarnessHistory(input.uid);

  let remaining: number | null = null;
  try {
    const usage = await checkAndIncrementHarnessMessage(input.uid);
    remaining = usage.remaining;
  } catch (error) {
    if (isPlanLimitError(error)) {
      throw error;
    }
    throw error;
  }

  const userMessage = createHarnessMessage('user', input.message.trim());
  let conversation = [...history, userMessage];
  let workspaceMutated = false;
  const turnOutcomes: string[] = [];
  let groundedText = '';
  let skipModelLoop = false;

  const historyMessages: Array<{ role: 'user' | 'assistant'; content: string }> =
    conversation.map((msg) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

  if (previousOutcomes.length > 0) {
    historyMessages.push({
      role: 'user',
      content: `[Sistema] Outcomes del turno anterior (hechos, no inventes lo contrario):\n${previousOutcomes.join('\n')}`,
    });
  }

  if (input.confirmedAction) {
    onEvent({
      type: 'tool_start',
      name: input.confirmedAction.name,
      args: { ...input.confirmedAction.args, confirm: true },
    });
    const confirmedResult = await executeHarnessTool(
      input.confirmedAction.name,
      { ...input.confirmedAction.args, confirm: true },
      { uid: input.uid }
    );
    onEvent({
      type: 'tool_end',
      name: input.confirmedAction.name,
      summary: confirmedResult.summary,
      mutated: Boolean(confirmedResult.mutated),
      ok: toolEndOk(confirmedResult),
    });
    turnOutcomes.push(formatToolOutcome(input.confirmedAction.name, confirmedResult));

    if (confirmedResult.mutated) {
      workspaceMutated = true;
      onEvent({ type: 'workspace_updated' });
    }

    groundedText = confirmedResult.summary;
    if (!confirmedResult.ok || confirmedResult.status !== 'success') {
      skipModelLoop = true;
    } else {
      historyMessages.push({
        role: 'user',
        content: `[Sistema] Acción confirmada ejecutada (${input.confirmedAction.name}): OK. ${confirmedResult.summary}. Puedes confirmar brevemente al usuario; no inventes otros cambios.`,
      });
    }
  }

  const { workspace } = await getWorkspaceData(input.uid);
  const framework = resolveWorkspaceFramework(workspace);
  const backlogIndex = buildBacklogIndex(workspace);
  const systemInstruction = buildHarnessSystemPrompt(
    framework,
    backlogIndex,
    identityFromCredentials(credentials)
  );

  let assistantText = groundedText;
  let stopReason: 'confirm' | 'terminal' | null = null;

  if (!skipModelLoop) {
    const loopResult = await runToolLoop({
      credentials,
      systemInstruction,
      resolveSystemInstruction: (creds) =>
        buildHarnessSystemPrompt(
          framework,
          backlogIndex,
          identityFromCredentials(creds)
        ),
      historyMessages,
      tools: HARNESS_TOOL_DECLARATIONS,
      maxIterations: HARNESS_MAX_TOOL_ITERATIONS,
      executeTool: async (name, args) => {
        onEvent({ type: 'tool_start', name, args });
        onEvent({ type: 'thought', text: `Ejecutando ${name}…` });

        const result = await executeHarnessTool(name, args, { uid: input.uid });
        turnOutcomes.push(formatToolOutcome(name, result));

        onEvent({
          type: 'tool_end',
          name,
          summary: result.summary,
          mutated: Boolean(result.mutated),
          ok: toolEndOk(result),
        });

        if (isPendingConfirmation(result)) {
          const confirmedArgs = {
            ...args,
            ...(result.data && typeof result.data === 'object'
              ? (result.data as Record<string, unknown>)
              : {}),
          };
          onEvent({
            type: 'confirm',
            name,
            args: confirmedArgs,
            label: result.confirmationLabel ?? result.summary,
          });
          groundedText = confirmationMessage(result);
          assistantText = groundedText;
          stopReason = 'confirm';
        } else if (isTerminalToolFailure(result)) {
          groundedText = result.summary;
          assistantText = groundedText;
          stopReason = 'terminal';
        } else if (result.status === 'success' && result.mutated) {
          groundedText = result.summary;
        } else if (result.status === 'error') {
          groundedText = result.summary;
        }

        if (result.mutated) {
          workspaceMutated = true;
          onEvent({ type: 'workspace_updated' });
        }

        return toolResultToPayload(result);
      },
      shouldStopAfterTools: () => stopReason !== null,
    });

    if (!stopReason) {
      assistantText = loopResult.assistantText || groundedText;
    }
  }

  if (!assistantText.trim()) {
    assistantText =
      groundedText ||
      turnOutcomes[turnOutcomes.length - 1]?.replace(/^\[tool\]\s+\S+\s+→\s+\S+:\s*/, '') ||
      '¿En qué más te ayudo con el backlog?';
  }

  onEvent({ type: 'message', role: 'assistant', text: assistantText });

  const assistantMessage = createHarnessMessage('assistant', assistantText);
  conversation = [...conversation, assistantMessage];
  const saved = await saveHarnessHistory(
    input.uid,
    projectId,
    conversation,
    turnOutcomes
  );

  if (workspaceMutated) {
    onEvent({ type: 'workspace_updated' });
  }

  return { messages: saved, remaining };
}

export async function runHarnessTurn(
  input: RunHarnessTurnInput,
  onEvent: HarnessEventCallback
): Promise<RunHarnessTurnResult> {
  if (!input.message.trim() && !input.confirmedAction) {
    throw new Error('Mensaje vacío');
  }

  onEvent({ type: 'thought', text: 'Analizando petición…' });

  const credentials = await resolveLlmCredentials(input.uid);
  if (!credentials) {
    const { runMockHarnessTurn } = await import('@/lib/harness/mock-runtime');
    return runMockHarnessTurn(input, onEvent);
  }

  return runProviderHarnessTurn(input, credentials, onEvent);
}
