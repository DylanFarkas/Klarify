/**
 * @fileoverview Runtime del harness: loop Gemini function-calling + tools.
 */

import {
  GoogleGenAI,
  FunctionCallingConfigMode,
  createPartFromFunctionResponse,
  type Content,
  type Part,
} from '@google/genai';
import { buildHarnessSystemPrompt } from '@/lib/harness/prompt';
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

function toModelContents(messages: HarnessChatMessage[]): Content[] {
  return messages.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));
}

function extractText(parts: Part[] | undefined): string {
  if (!parts) return '';
  return parts
    .map((part) => (typeof part.text === 'string' && !part.thought ? part.text : ''))
    .join('')
    .trim();
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

/** ok para UI/activity: pending_confirmation no es error visual. */
function toolEndOk(result: HarnessToolResult): boolean {
  return result.status === 'success' || result.status === 'pending_confirmation';
}

async function runGeminiHarnessTurn(
  input: RunHarnessTurnInput,
  onEvent: HarnessEventCallback
): Promise<RunHarnessTurnResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
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
  const contents: Content[] = toModelContents(conversation);
  const turnOutcomes: string[] = [];
  let groundedText = '';
  let skipModelLoop = false;

  if (previousOutcomes.length > 0) {
    contents.push({
      role: 'user',
      parts: [
        {
          text: `[Sistema] Outcomes del turno anterior (hechos, no inventes lo contrario):\n${previousOutcomes.join('\n')}`,
        },
      ],
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

    // Anclar siempre al resultado real; no dejar que un texto vacío diga "Listo".
    groundedText = confirmedResult.summary;
    if (!confirmedResult.ok || confirmedResult.status !== 'success') {
      skipModelLoop = true;
    } else {
      contents.push({
        role: 'user',
        parts: [
          {
            text: `[Sistema] Acción confirmada ejecutada (${input.confirmedAction.name}): OK. ${confirmedResult.summary}. Puedes confirmar brevemente al usuario; no inventes otros cambios.`,
          },
        ],
      });
    }
  }

  const { workspace } = await getWorkspaceData(input.uid);
  const framework = resolveWorkspaceFramework(workspace);
  const backlogIndex = buildBacklogIndex(workspace);
  const systemInstruction = buildHarnessSystemPrompt(framework, backlogIndex);

  let assistantText = groundedText;

  if (!skipModelLoop) {
    for (let iteration = 0; iteration < HARNESS_MAX_TOOL_ITERATIONS; iteration++) {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: HARNESS_TOOL_DECLARATIONS }],
          toolConfig: {
            functionCallingConfig: {
              mode: FunctionCallingConfigMode.AUTO,
            },
          },
        },
      });

      const functionCalls = response.functionCalls;
      const modelContent = response.candidates?.[0]?.content;

      if (!functionCalls?.length) {
        const modelText =
          extractText(modelContent?.parts) || response.text?.trim() || '';
        // Si ya hay texto anclado (p. ej. confirmación exitosa), priorizarlo si el modelo calla.
        assistantText = modelText || groundedText || '';
        break;
      }

      if (modelContent) {
        contents.push(modelContent);
      }

      const functionResponseParts: Part[] = [];
      let stopAfterTools = false;

      for (const call of functionCalls) {
        const name = call.name ?? 'unknown';
        const args = (call.args ?? {}) as Record<string, unknown>;

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
          stopAfterTools = true;
        } else if (isTerminalToolFailure(result)) {
          groundedText = result.summary;
          assistantText = groundedText;
          stopAfterTools = true;
        } else if (result.status === 'success' && result.mutated) {
          groundedText = result.summary;
        } else if (result.status === 'error') {
          groundedText = result.summary;
        }

        if (result.mutated) {
          workspaceMutated = true;
          onEvent({ type: 'workspace_updated' });
        }

        functionResponseParts.push(
          createPartFromFunctionResponse(call.id ?? `${name}-${iteration}`, name, {
            ok: result.ok,
            status: result.status,
            summary: result.summary,
            data: result.data ?? null,
            needsConfirmation: result.needsConfirmation ?? false,
            mutated: Boolean(result.mutated),
            error: result.error ?? null,
          })
        );
      }

      contents.push({ role: 'user', parts: functionResponseParts });

      if (stopAfterTools) {
        // El runtime escribe el mensaje; no dejamos que el modelo invente confirmación/éxito.
        break;
      }
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

  if (!process.env.GEMINI_API_KEY) {
    const { runMockHarnessTurn } = await import('@/lib/harness/mock-runtime');
    return runMockHarnessTurn(input, onEvent);
  }

  return runGeminiHarnessTurn(input, onEvent);
}
