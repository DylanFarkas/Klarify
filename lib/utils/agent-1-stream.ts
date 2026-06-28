/**
 * @fileoverview Re-exporta utilidades de stream genéricas con tipos del Agente 1.
 */

import type {
  Agent1AnalyzeResponse,
  Agent1ExtractResponse,
} from '@/lib/types/agent-1';

export {
  AgentStreamEmitter,
  createNdjsonStream,
  ndjsonStreamResponse,
  consumeAgentStream,
  consumeLlmStream as consumeAgent1Stream,
  LLM_STREAM_CONTENT_TYPE as AGENT1_STREAM_CONTENT_TYPE,
} from '@/lib/utils/llm-stream';

export type {
  LLMThoughtCallback,
  LLMStreamThoughtEvent as Agent1StreamThoughtEvent,
  LLMStreamDoneEvent,
  LLMStreamErrorEvent as Agent1StreamErrorEvent,
} from '@/lib/utils/llm-stream';

export type {
  AgentStreamEvent,
  AgentStreamPhaseEvent,
  AgentStreamActionEvent,
  AgentStreamThoughtEvent,
} from '@/lib/types/agent-activity';

export type Agent1AnalyzeStreamEvent =
  | import('@/lib/types/agent-activity').AgentStreamEvent<Agent1AnalyzeResponse>
  | import('@/lib/utils/llm-stream').LLMStreamDoneEvent<Agent1AnalyzeResponse>;

export type Agent1ExtractStreamEvent =
  | import('@/lib/types/agent-activity').AgentStreamEvent<Agent1ExtractResponse>
  | import('@/lib/utils/llm-stream').LLMStreamDoneEvent<Agent1ExtractResponse>;
