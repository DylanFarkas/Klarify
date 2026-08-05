/**
 * @fileoverview Loop de tools provider-agnóstico para Klark.
 */

import type { Content } from '@google/genai';
import type OpenAI from 'openai';
import { deepseekToolTurn } from '@/lib/llm/clients/deepseek';
import {
  geminiToolResponseParts,
  geminiToolTurn,
} from '@/lib/llm/clients/gemini';
import { openaiToolTurn } from '@/lib/llm/clients/openai';
import { buildFallbackChain, isRecoverableLlmError } from '@/lib/llm/fallback';
import type {
  LlmCredentials,
  LlmToolCall,
  LlmToolDefinition,
  LlmToolLoopTurn,
} from '@/lib/llm/types';

export type ToolExecutor = (
  name: string,
  args: Record<string, unknown>
) => Promise<Record<string, unknown>>;

export interface ToolLoopParams {
  credentials: LlmCredentials;
  systemInstruction: string;
  /** Si hay fallback a otro proveedor/modelo, regenera el system prompt con la identidad correcta. */
  resolveSystemInstruction?: (credentials: LlmCredentials) => string;
  /** Historial user/assistant en texto plano (sin tools). */
  historyMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  tools: LlmToolDefinition[];
  maxIterations: number;
  executeTool: ToolExecutor;
  onToolStart?: (name: string, args: Record<string, unknown>) => void;
  onToolEnd?: (name: string, summary: string, payload: Record<string, unknown>) => void;
  /** Si true, detiene el loop tras tools (p. ej. confirmación). */
  shouldStopAfterTools?: (results: Array<{ name: string; payload: Record<string, unknown> }>) => boolean;
}

export interface ToolLoopResult {
  assistantText: string;
  usedFallback: boolean;
  credentials: LlmCredentials;
}

async function runOpenAiProtocolLoop(
  credentials: LlmCredentials,
  params: ToolLoopParams
): Promise<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = params.historyMessages.map(
    (m) => ({ role: m.role, content: m.content })
  );

  const toolTurn =
    credentials.provider === 'deepseek' ? deepseekToolTurn : openaiToolTurn;

  let assistantText = '';

  for (let iteration = 0; iteration < params.maxIterations; iteration++) {
    const turn = await toolTurn(credentials, {
      systemInstruction: params.systemInstruction,
      messages,
      tools: params.tools,
    });

    if (!turn.toolCalls.length) {
      assistantText = turn.text;
      break;
    }

    messages.push({
      role: 'assistant',
      content: turn.text || null,
      tool_calls: turn.toolCalls.map((tc) => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.args),
        },
      })),
    });

    const toolResults: Array<{ name: string; payload: Record<string, unknown> }> = [];

    for (const call of turn.toolCalls) {
      params.onToolStart?.(call.name, call.args);
      const payload = await params.executeTool(call.name, call.args);
      toolResults.push({ name: call.name, payload });
      const summary =
        typeof payload.summary === 'string' ? payload.summary : call.name;
      params.onToolEnd?.(call.name, summary, payload);

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(payload),
      });
    }

    if (params.shouldStopAfterTools?.(toolResults)) {
      const last = toolResults[toolResults.length - 1];
      assistantText =
        typeof last?.payload.summary === 'string' ? last.payload.summary : turn.text;
      break;
    }
  }

  return assistantText;
}

async function runGeminiLoop(
  credentials: LlmCredentials,
  params: ToolLoopParams
): Promise<string> {
  const contents: Content[] = params.historyMessages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  let assistantText = '';

  for (let iteration = 0; iteration < params.maxIterations; iteration++) {
    const { turn, modelContent } = await geminiToolTurn(credentials, {
      systemInstruction: params.systemInstruction,
      contents,
      tools: params.tools,
    });

    if (!turn.toolCalls.length) {
      assistantText = turn.text;
      break;
    }

    if (modelContent) {
      contents.push(modelContent);
    }

    const toolResults: Array<{
      id: string;
      name: string;
      payload: Record<string, unknown>;
    }> = [];

    for (const call of turn.toolCalls) {
      params.onToolStart?.(call.name, call.args);
      const payload = await params.executeTool(call.name, call.args);
      toolResults.push({ id: call.id, name: call.name, payload });
      const summary =
        typeof payload.summary === 'string' ? payload.summary : call.name;
      params.onToolEnd?.(call.name, summary, payload);
    }

    contents.push({
      role: 'user',
      parts: geminiToolResponseParts(toolResults),
    });

    if (params.shouldStopAfterTools?.(toolResults)) {
      const last = toolResults[toolResults.length - 1];
      assistantText =
        typeof last?.payload.summary === 'string' ? last.payload.summary : turn.text;
      break;
    }
  }

  return assistantText;
}

async function runToolLoopOnce(
  credentials: LlmCredentials,
  params: ToolLoopParams
): Promise<string> {
  if (credentials.provider === 'gemini') {
    return runGeminiLoop(credentials, params);
  }
  return runOpenAiProtocolLoop(credentials, params);
}

export async function runToolLoop(params: ToolLoopParams): Promise<ToolLoopResult> {
  const fallbacks = buildFallbackChain(params.credentials);
  const chain = [params.credentials, ...fallbacks];
  let lastError: unknown;

  for (let i = 0; i < chain.length; i++) {
    const current = chain[i];
    try {
      const systemInstruction =
        params.resolveSystemInstruction?.(current) ?? params.systemInstruction;
      const assistantText = await runToolLoopOnce(current, {
        ...params,
        credentials: current,
        systemInstruction,
      });
      return {
        assistantText,
        usedFallback: i > 0,
        credentials: current,
      };
    } catch (error) {
      lastError = error;
      const hasMore = i < chain.length - 1;
      const shouldRetry =
        hasMore &&
        (params.credentials.source === 'byok' || isRecoverableLlmError(error));
      if (!shouldRetry) break;
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : 'Error desconocido del modelo';
  throw new Error(`Error en Klark: ${message}`);
}

export type { LlmToolCall, LlmToolLoopTurn };
