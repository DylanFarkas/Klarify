/**
 * @fileoverview API Route — POST /api/agentes/1/extract
 *
 * Extrae deseos a partir del contexto enriquecido con las respuestas
 * del usuario a las preguntas de discovery (o saltando el paso).
 * Emite pensamientos del LLM en tiempo real vía NDJSON stream.
 */

import { type NextRequest } from 'next/server';
import {
  extractWishesFromContextStream,
  validateClarificationAnswers,
} from '@/lib/services/agent-1-service';
import type {
  Agent1ExtractRequest,
  Agent1ExtractResponse,
  Agent1ErrorResponse,
} from '@/lib/types/agent-1';
import { verifyRequestUser } from '@/lib/firebase-admin';
import { createNdjsonStream, ndjsonStreamResponse } from '@/lib/utils/llm-stream';

export async function POST(request: NextRequest) {
  try {
    await verifyRequestUser(request);

    const body = (await request.json()) as Agent1ExtractRequest;
    const skipped = body.skipped ?? false;
    const answers = body.answers ?? [];

    if (!body.transcription?.fullText?.trim()) {
      return Response.json(
        { error: 'Se requiere una transcripción con texto.', code: 'VALIDATION_ERROR' } satisfies Agent1ErrorResponse,
        { status: 400 }
      );
    }

    if (!body.discovery) {
      return Response.json(
        { error: 'Se requiere el objeto discovery.', code: 'VALIDATION_ERROR' } satisfies Agent1ErrorResponse,
        { status: 400 }
      );
    }

    const validation = validateClarificationAnswers(body.discovery, answers, skipped);
    if (!validation.valid) {
      return Response.json(
        { error: validation.error!, code: 'VALIDATION_ERROR' } satisfies Agent1ErrorResponse,
        { status: 400 }
      );
    }

    const { stream, send, close } = createNdjsonStream();

    void (async () => {
      try {
        const onThought = (text: string) => send({ type: 'thought', text });

        const { wishes, enrichedContext } = await extractWishesFromContextStream(
          body.transcription,
          body.discovery,
          onThought,
          answers,
          skipped
        );

        const response: Agent1ExtractResponse = { wishes, enrichedContext };
        send({ type: 'done', payload: response });
      } catch (error) {
        console.error('[Agent 1 Extract] Stream error:', error);
        send({
          type: 'error',
          error: error instanceof Error ? error.message : 'Error interno al extraer deseos.',
        });
      } finally {
        close();
      }
    })();

    return ndjsonStreamResponse(stream);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return Response.json({ error: 'No autorizado', code: 'PROCESSING_ERROR' } satisfies Agent1ErrorResponse, { status: 401 });
    }

    console.error('[Agent 1 Extract] Error:', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Error interno al extraer deseos.',
        code: 'PROCESSING_ERROR',
      } satisfies Agent1ErrorResponse,
      { status: 500 }
    );
  }
}
