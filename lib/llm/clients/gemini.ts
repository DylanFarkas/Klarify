/**
 * @fileoverview Cliente Gemini vía @google/genai.
 */

import {
  GoogleGenAI,
  FunctionCallingConfigMode,
  createPartFromFunctionResponse,
  type Content,
  type FunctionDeclaration,
  type Part,
} from '@google/genai';
import type {
  LlmCredentials,
  LlmGenerateOptions,
  LlmToolCall,
  LlmToolDefinition,
  LlmToolLoopTurn,
} from '@/lib/llm/types';

function createClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

interface ContentPart {
  text?: string;
  thought?: boolean;
}

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

export async function geminiGenerate(
  credentials: LlmCredentials,
  options: LlmGenerateOptions
): Promise<string> {
  const ai = createClient(credentials.apiKey);
  const responseStream = await ai.models.generateContentStream({
    model: credentials.model,
    contents: options.userPrompt,
    config: {
      systemInstruction: options.systemInstruction,
      responseMimeType: options.json ? 'application/json' : undefined,
      temperature: options.temperature ?? 0.2,
      thinkingConfig: {
        includeThoughts: true,
        thinkingBudget: options.thinkingBudget ?? 512,
      },
    },
  });

  let outputText = '';

  for await (const chunk of responseStream) {
    const parts = (chunk.candidates?.[0]?.content?.parts ?? []) as ContentPart[];
    for (const part of parts) {
      if (typeof part.text !== 'string') continue;
      if (part.thought === true) {
        options.onThought?.(part.text);
      } else {
        outputText += part.text;
      }
    }
  }

  return options.json ? stripJsonFences(outputText) : outputText.trim();
}

export async function geminiValidateKey(credentials: LlmCredentials): Promise<void> {
  const ai = createClient(credentials.apiKey);
  const response = await ai.models.generateContent({
    model: credentials.model,
    contents: 'ping',
    config: { temperature: 0 },
  });
  if (!response.text && !response.candidates?.length) {
    throw new Error('Respuesta vacía al validar Gemini');
  }
}

function toGeminiTools(tools: LlmToolDefinition[]): FunctionDeclaration[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parametersJsonSchema: tool.parameters,
  }));
}

function extractText(parts: Part[] | undefined): string {
  if (!parts) return '';
  return parts
    .map((part) => (typeof part.text === 'string' && !part.thought ? part.text : ''))
    .join('')
    .trim();
}

export async function geminiToolTurn(
  credentials: LlmCredentials,
  params: {
    systemInstruction: string;
    contents: Content[];
    tools: LlmToolDefinition[];
  }
): Promise<{ turn: LlmToolLoopTurn; modelContent: Content | null }> {
  const ai = createClient(credentials.apiKey);
  const response = await ai.models.generateContent({
    model: credentials.model,
    contents: params.contents,
    config: {
      systemInstruction: params.systemInstruction,
      tools: [{ functionDeclarations: toGeminiTools(params.tools) }],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.AUTO,
        },
      },
    },
  });

  const functionCalls = response.functionCalls ?? [];
  const modelContent = response.candidates?.[0]?.content ?? null;
  const text =
    extractText(modelContent?.parts) || response.text?.trim() || '';

  const toolCalls: LlmToolCall[] = functionCalls.map((call, index) => ({
    id: call.id ?? `${call.name ?? 'tool'}-${index}`,
    name: call.name ?? 'unknown',
    args: (call.args ?? {}) as Record<string, unknown>,
  }));

  return { turn: { text, toolCalls }, modelContent };
}

export function geminiToolResponseParts(
  results: Array<{
    id: string;
    name: string;
    payload: Record<string, unknown>;
  }>
): Part[] {
  return results.map((r) =>
    createPartFromFunctionResponse(r.id, r.name, r.payload)
  );
}

export type { Content as GeminiContent, Part as GeminiPart };
