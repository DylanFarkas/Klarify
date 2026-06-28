/**
 * @fileoverview Re-exporta utilidades de stream genéricas con tipos del Agente 1.
 */

import type {
  Agent1AnalyzeResponse,
  Agent1ExtractResponse,
} from '@/lib/types/agent-1';

export {
  createNdjsonStream,
  ndjsonStreamResponse,
  consumeLlmStream as consumeAgent1Stream,
  LLM_STREAM_CONTENT_TYPE as AGENT1_STREAM_CONTENT_TYPE,
} from '@/lib/utils/llm-stream';

export type {
  LLMThoughtCallback,
  LLMStreamThoughtEvent as Agent1StreamThoughtEvent,
  LLMStreamDoneEvent,
  LLMStreamErrorEvent as Agent1StreamErrorEvent,
} from '@/lib/utils/llm-stream';

export type Agent1AnalyzeStreamEvent =
  | import('@/lib/utils/llm-stream').LLMStreamThoughtEvent
  | import('@/lib/utils/llm-stream').LLMStreamDoneEvent<Agent1AnalyzeResponse>
  | import('@/lib/utils/llm-stream').LLMStreamErrorEvent;

export type Agent1ExtractStreamEvent =
  | import('@/lib/utils/llm-stream').LLMStreamThoughtEvent
  | import('@/lib/utils/llm-stream').LLMStreamDoneEvent<Agent1ExtractResponse>
  | import('@/lib/utils/llm-stream').LLMStreamErrorEvent;
