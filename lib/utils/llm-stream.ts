/**
 * @fileoverview Utilidades NDJSON genéricas para streaming de pensamientos del LLM.
 */

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
// Cliente — consumidor NDJSON
// ---------------------------------------------------------------------------

export async function consumeLlmStream<T>(
  response: Response,
  onThought: LLMThoughtCallback
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

    const event = JSON.parse(trimmed) as
      | LLMStreamThoughtEvent
      | LLMStreamDoneEvent<T>
      | LLMStreamErrorEvent;

    if (event.type === 'thought') {
      onThought(event.text);
    } else if (event.type === 'error') {
      throw new Error(event.error);
    } else if (event.type === 'done') {
      result = event.payload;
    }
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
