/**
 * @fileoverview API Route — POST /api/agentes/1/analyze
 *
 * Evalúa si el contexto del usuario es suficiente para un backlog.
 * Si lo es, extrae deseos directamente en la misma request.
 * Emite pensamientos del LLM en tiempo real vía NDJSON stream.
 */

import { type NextRequest } from 'next/server';
import {
  analyzeContextStream,
  extractWishesFromContextStream,
} from '@/lib/services/agent-1-service';
import type {
  Agent1AnalyzeRequest,
  Agent1AnalyzeResponse,
  Agent1ErrorResponse,
} from '@/lib/types/agent-1';
import { verifyRequestUser } from '@/lib/firebase-admin';
import { createNdjsonStream, ndjsonStreamResponse } from '@/lib/utils/llm-stream';

export async function POST(request: NextRequest) {
  try {
    await verifyRequestUser(request);

    const body = (await request.json()) as Agent1AnalyzeRequest;

    if (!body.transcription?.fullText?.trim()) {
      return Response.json(
        { error: 'Se requiere una transcripción con texto.', code: 'VALIDATION_ERROR' } satisfies Agent1ErrorResponse,
        { status: 400 }
      );
    }

    const { stream, send, close } = createNdjsonStream();

    void (async () => {
      try {
        const onThought = (text: string) => send({ type: 'thought', text });

        const discovery = await analyzeContextStream(body.transcription, onThought);

        if (!discovery.isSufficient && discovery.questions.length === 0) {
          onThought('\n\nExtrayendo requerimientos del contexto...\n');
          const { wishes, enrichedContext } = await extractWishesFromContextStream(
            body.transcription,
            discovery,
            onThought,
            [],
            false
          );

          const response: Agent1AnalyzeResponse = {
            discovery: { ...discovery, isSufficient: true, completedAt: Date.now() },
            wishes,
            enrichedContext,
          };
          send({ type: 'done', payload: response });
          return;
        }

        if (discovery.isSufficient) {
          onThought('\n\nContexto suficiente. Extrayendo requerimientos...\n');
          const { wishes, enrichedContext } = await extractWishesFromContextStream(
            body.transcription,
            discovery,
            onThought,
            [],
            false
          );

          const response: Agent1AnalyzeResponse = {
            discovery: { ...discovery, completedAt: Date.now() },
            wishes,
            enrichedContext,
          };
          send({ type: 'done', payload: response });
          return;
        }

        const response: Agent1AnalyzeResponse = { discovery };
        send({ type: 'done', payload: response });
      } catch (error) {
        console.error('[Agent 1 Analyze] Stream error:', error);
        send({
          type: 'error',
          error: error instanceof Error ? error.message : 'Error interno al analizar el contexto.',
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

    console.error('[Agent 1 Analyze] Error:', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Error interno al analizar el contexto.',
        code: 'PROCESSING_ERROR',
      } satisfies Agent1ErrorResponse,
      { status: 500 }
    );
  }
}
