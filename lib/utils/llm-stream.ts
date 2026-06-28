/**
 * @fileoverview Utilidades NDJSON genéricas para streaming de actividad del agente.
 */

import type {
  AgentStreamActionEvent,
  AgentStreamEvent,
  AgentStreamPhaseEvent,
  ActionStatus,
} from '@/lib/types/agent-activity';

export type LLMStreamThoughtEvent = {
  type: 'thought';
  text: string;
};

export type LLMStreamDoneEvent<T> = {
  type: 'done';
  payload: T;
};

export type LLMStreamErrorEvent = {
  type: 'error';
  error: string;
};

export type LLMThoughtCallback = (text: string) => void;

export type AgentStreamEventCallback = (event: AgentStreamEvent) => void;

export const LLM_STREAM_CONTENT_TYPE = 'application/x-ndjson';

// ---------------------------------------------------------------------------
// Servidor — emisor NDJSON
// ---------------------------------------------------------------------------

export interface NdjsonStreamWriter {
  send: (event: object) => void;
  close: () => void;
  stream: ReadableStream<Uint8Array>;
}

export function createNdjsonStream(): NdjsonStreamWriter {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });

  return {
    stream,
    send(event: object) {
      controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
    },
    close() {
      controller.close();
    },
  };
}

export function ndjsonStreamResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': LLM_STREAM_CONTENT_TYPE,
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

// ---------------------------------------------------------------------------
// Servidor — emisor tipado de actividad
// ---------------------------------------------------------------------------

type StreamSendFn = (event: AgentStreamEvent) => void;

export class AgentStreamEmitter {
  constructor(private readonly send: StreamSendFn) {}

  thought(text: string): void {
    this.send({ type: 'thought', text });
  }

  phaseStart(id: string, label: string): void {
    this.send({ type: 'phase', id, label, status: 'start' });
  }

  phaseEnd(id: string, label: string): void {
    this.send({ type: 'phase', id, label, status: 'end' });
  }

  action(id: string, label: string, status: ActionStatus): void {
    this.send({ type: 'action', id, label, status });
  }

  async runAction<T>(
    id: string,
    label: string,
    fn: () => Promise<T> | T,
    options?: { minVisibleMs?: number }
  ): Promise<T> {
    this.action(id, label, 'running');
    const startedAt = Date.now();

    try {
      const result = await fn();
      const minVisibleMs = options?.minVisibleMs ?? 0;
      const elapsed = Date.now() - startedAt;

      if (minVisibleMs > elapsed) {
        await new Promise((resolve) => setTimeout(resolve, minVisibleMs - elapsed));
      }

      this.action(id, label, 'done');
      return result;
    } catch (error) {
      this.action(id, label, 'error');
      throw error;
    }
  }

  async runPhase<T>(id: string, label: string, fn: () => Promise<T> | T): Promise<T> {
    this.phaseStart(id, label);
    try {
      const result = await fn();
      this.phaseEnd(id, label);
      return result;
    } catch (error) {
      this.phaseEnd(id, label);
      throw error;
    }
  }

  /** Callback compatible con adaptadores LLM existentes. */
  bindThought(): LLMThoughtCallback {
    return this.thought.bind(this);
  }
}

// ---------------------------------------------------------------------------
// Cliente — consumidor NDJSON
// ---------------------------------------------------------------------------

export async function consumeAgentStream<T>(
  response: Response,
  onEvent: AgentStreamEventCallback
): Promise<T> {
  if (!response.body) {
    throw new Error('La respuesta no incluye cuerpo de stream.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: T | undefined;

  const processLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const event = JSON.parse(trimmed) as AgentStreamEvent<T>;

    if (event.type === 'error') {
      onEvent(event);
      throw new Error(event.error);
    }

    if (event.type === 'done') {
      onEvent(event);
      result = event.payload;
      return;
    }

    onEvent(event);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      processLine(line);
    }
  }

  if (buffer.trim()) {
    processLine(buffer);
  }

  if (result === undefined) {
    throw new Error('El stream terminó sin enviar el resultado final.');
  }

  return result;
}

export async function consumeLlmStream<T>(
  response: Response,
  onThought: LLMThoughtCallback
): Promise<T> {
  return consumeAgentStream<T>(response, (event) => {
    if (event.type === 'thought') {
      onThought(event.text);
    }
  });
}
