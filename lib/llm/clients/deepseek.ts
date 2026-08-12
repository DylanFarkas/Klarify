/**
 * @fileoverview Cliente DeepSeek (API OpenAI-compatible en api.deepseek.com).
 */

import OpenAI from 'openai';
import { DEEPSEEK_BASE_URL } from '@/lib/llm/catalog';
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

function createDeepSeekClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: DEEPSEEK_BASE_URL,
  });
}

export async function deepseekGenerate(
  credentials: LlmCredentials,
  options: LlmGenerateOptions
): Promise<string> {
  return openAiSdkGenerate(createDeepSeekClient(credentials.apiKey), credentials, options);
}

export async function deepseekValidateKey(credentials: LlmCredentials): Promise<void> {
  return openAiSdkValidateKey(createDeepSeekClient(credentials.apiKey), credentials);
}

export async function deepseekToolTurn(
  credentials: LlmCredentials,
  params: {
    systemInstruction: string;
    messages: OpenAI.Chat.ChatCompletionMessageParam[];
    tools: LlmToolDefinition[];
    onThought?: (text: string) => void;
  }
): Promise<LlmToolLoopTurn> {
  return openAiSdkToolTurn(createDeepSeekClient(credentials.apiKey), credentials, params);
}
