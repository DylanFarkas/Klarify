/**
 * @fileoverview Helpers compartidos del SDK OpenAI (protocolo chat completions).
 * Usado por los clientes DeepSeek y OpenAI; no es un proveedor en sí.
 */

import OpenAI from 'openai';
import type {
  LlmCredentials,
  LlmGenerateOptions,
  LlmToolCall,
  LlmToolDefinition,
  LlmToolLoopTurn,
} from '@/lib/llm/types';

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function modelLikelySupportsThoughts(modelId: string): boolean {
  const lower = modelId.toLowerCase();
  return (
    lower.includes('reasoner') ||
    lower.includes('o1') ||
    lower.includes('o3') ||
    lower.includes('o4') ||
    lower.includes('thinking')
  );
}

function toOpenAiTools(
  tools: LlmToolDefinition[]
): OpenAI.Chat.ChatCompletionTool[] {
  return tools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as unknown as OpenAI.FunctionParameters,
    },
  }));
}

export async function openAiSdkGenerate(
  client: OpenAI,
  credentials: LlmCredentials,
  options: LlmGenerateOptions
): Promise<string> {
  const modelInfo = { supportsThoughts: modelLikelySupportsThoughts(credentials.model) };
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  if (options.systemInstruction) {
    messages.push({ role: 'system', content: options.systemInstruction });
  }
  messages.push({ role: 'user', content: options.userPrompt });

  const isReasoner =
    credentials.model.includes('reasoner') || Boolean(modelInfo.supportsThoughts);

  const stream = await client.chat.completions.create({
    model: credentials.model,
    messages,
    temperature: isReasoner ? undefined : (options.temperature ?? 0.2),
    stream: true,
  });

  let outputText = '';

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta as
      | {
          content?: string | null;
          reasoning_content?: string | null;
        }
      | undefined;

    if (!delta) continue;

    if (typeof delta.reasoning_content === 'string' && delta.reasoning_content) {
      options.onThought?.(delta.reasoning_content);
    }

    if (typeof delta.content === 'string' && delta.content) {
      outputText += delta.content;
    }
  }

  return options.json ? stripJsonFences(outputText) : outputText.trim();
}

export async function openAiSdkValidateKey(
  client: OpenAI,
  credentials: LlmCredentials
): Promise<void> {
  await client.chat.completions.create({
    model: credentials.model,
    messages: [{ role: 'user', content: 'ping' }],
    max_tokens: 1,
  });
}

export async function openAiSdkToolTurn(
  client: OpenAI,
  credentials: LlmCredentials,
  params: {
    systemInstruction: string;
    messages: OpenAI.Chat.ChatCompletionMessageParam[];
    tools: LlmToolDefinition[];
  }
): Promise<LlmToolLoopTurn> {
  const response = await client.chat.completions.create({
    model: credentials.model,
    messages: [
      { role: 'system', content: params.systemInstruction },
      ...params.messages,
    ],
    tools: toOpenAiTools(params.tools),
    tool_choice: 'auto',
  });

  const message = response.choices[0]?.message;
  const text = message?.content?.trim() ?? '';
  const toolCalls: LlmToolCall[] = (message?.tool_calls ?? [])
    .filter((tc) => tc.type === 'function')
    .map((tc) => {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>;
      } catch {
        args = {};
      }
      return {
        id: tc.id,
        name: tc.function.name,
        args,
      };
    });

  return { text, toolCalls };
}

export type { OpenAI };
