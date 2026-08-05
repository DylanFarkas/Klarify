/**
 * @fileoverview Tipos del cliente LLM multi-proveedor.
 */

export type AiProviderId = 'deepseek' | 'openai' | 'gemini';

export interface AiModelInfo {
  id: string;
  label: string;
  provider: AiProviderId;
  /** Modelos con razonamiento nativo (thoughts / reasoning content). */
  supportsThoughts?: boolean;
}

export interface LlmCredentials {
  provider: AiProviderId;
  model: string;
  apiKey: string;
  /** Origen de la credencial (BYOK vs default Klarify). */
  source: 'byok' | 'klarify';
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  /** Solo role=tool / assistant con tool calls. */
  toolCallId?: string;
  name?: string;
  toolCalls?: LlmToolCall[];
}

export interface LlmToolParameterSchema {
  type: 'object';
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface LlmToolDefinition {
  name: string;
  description: string;
  parameters: LlmToolParameterSchema;
}

export interface LlmToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface LlmGenerateOptions {
  systemInstruction?: string;
  userPrompt: string;
  temperature?: number;
  /** Pedir JSON (mime / response_format). */
  json?: boolean;
  thinkingBudget?: number;
  onThought?: (text: string) => void;
}

export interface LlmGenerateResult {
  text: string;
  usedFallback: boolean;
  credentials: LlmCredentials;
}

export interface LlmToolLoopTurn {
  text: string;
  toolCalls: LlmToolCall[];
}

export interface StoredAiProvider {
  active: boolean;
  provider: AiProviderId;
  model: string;
  apiKeyEncrypted: string;
  keyHint: string;
  connectedAt?: unknown;
  /** Cache del catálogo oficial tras conectar / refrescar. */
  cachedModels?: AiModelInfo[];
  modelsCachedAt?: string;
}

/** Vista pública (sin key) para API/UI. */
export interface AiProviderPublicStatus {
  connected: boolean;
  active: boolean;
  provider: AiProviderId | null;
  model: string;
  keyHint: string | null;
  source: 'byok' | 'klarify';
  availableModels: AiModelInfo[];
  /** Modelos del catálogo Klarify (DeepSeek) siempre disponibles sin BYOK. */
  klarifyModels: AiModelInfo[];
}
