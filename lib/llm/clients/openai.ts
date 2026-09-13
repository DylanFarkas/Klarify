/**
 * @fileoverview Cliente OpenAI (api.openai.com).
 */

import OpenAI from 'openai';
import {
  openAiSdkGenerate,
  openAiSdkToolTurn,
  openAiSdkValidateKey,
} from '@/lib/llm/clients/openai-sdk-shared';
import type {
  LlmCredentials,
  LlmGenerateOptions,
  LlmToolDefinition,
  LlmToolLoopTurn,
} from '@/lib/llm/types';

function createOpenAiClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey });
}

export async function openaiGenerate(
  credentials: LlmCredentials,
  options: LlmGenerateOptions
): Promise<string> {
  return openAiSdkGenerate(createOpenAiClient(credentials.apiKey), credentials, options);
}

export async function openaiValidateKey(credentials: LlmCredentials): Promise<void> {
  return openAiSdkValidateKey(createOpenAiClient(credentials.apiKey), credentials);
}

export async function openaiToolTurn(
  credentials: LlmCredentials,
  params: {
    systemInstruction: string;
    messages: OpenAI.Chat.ChatCompletionMessageParam[];
    tools: LlmToolDefinition[];
    onThought?: (text: string) => void;
  }
): Promise<LlmToolLoopTurn> {
  return openAiSdkToolTurn(createOpenAiClient(credentials.apiKey), credentials, params);
}
